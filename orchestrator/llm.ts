import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { need, opt } from "./env";
import type { Candidate, Vision } from "./types";

const PROMPTS = resolve(__dirname, "..", "prompts");
const read = (f: string): string => readFileSync(resolve(PROMPTS, f), "utf8");

const CANDIDATES_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array", minItems: 6, maxItems: 6,
      items: {
        type: "object",
        properties: { strategy: { type: "string" }, source: { type: "string" } },
        required: ["strategy", "source"], additionalProperties: false,
      },
    },
  },
  required: ["candidates"], additionalProperties: false,
};

const VISION_SCHEMA = {
  type: "object",
  properties: {
    palette: { type: "number" }, motion: { type: "number" },
    subject: { type: "number" }, critique: { type: "string" },
  },
  required: ["palette", "motion", "subject", "critique"], additionalProperties: false,
};

const RANKING_SCHEMA = {
  type: "object",
  properties: {
    order: { type: "array", items: { type: "number" } },
    reason: { type: "string" },
  },
  required: ["order", "reason"], additionalProperties: false,
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    better: { type: "string", enum: ["first", "second", "neither"] },
    reason: { type: "string" },
  },
  required: ["better", "reason"], additionalProperties: false,
};

/** The object `claude -p --output-format json` prints on stdout. */
interface Envelope {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  modelUsage?: Record<string, { costUSD?: number; inputTokens?: number; outputTokens?: number }>;
}

let spentUSD = 0;
export const spend = (): number => spentUSD;

/*
 * Cancellation for whatever call is in flight.
 *
 * Stopping used to be checked between steps, so a stop during the ninety
 * seconds spent writing six shaders, or during the six vision calls that score
 * them, waited for the whole call to finish. If the round finished first the
 * stop appeared to do nothing at all.
 *
 * A module-level signal is safe because the service runs one run at a time, by
 * the same quota that made stopping worth having. If that guard is ever
 * relaxed, this has to become per-run.
 */
let current: AbortController | undefined;

export const beginCancellable = (): AbortController => {
  current = new AbortController();
  return current;
};

export const cancelInFlight = (): void => {
  current?.abort();
};

export const endCancellable = (): void => {
  current = undefined;
};

const signal = (): AbortSignal | undefined => current?.signal;

interface CliCall {
  system: string;
  prompt: string;
  schema: unknown;
  /** Non-empty turns this into an agentic call: needed so the model can Read frames. */
  tools?: string[];
}

/**
 * --tools only names which tools exist; --allowedTools grants permission to use
 * them. With the first and not the second the model is refused silently, burns
 * its turns and returns success, so both are set or neither is.
 */
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

async function cli(call: CliCall): Promise<unknown> {
  const bin = opt("CLAUDE_BINARY", "claude");
  const args = [
    "-p",
    "--output-format", "json",
    "--model", opt("CLAUDE_CLI_MODEL", "claude-sonnet-5"),
    "--system-prompt", call.system,
    "--json-schema", JSON.stringify(call.schema),
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
  ];
  // Latency here is thinking time, not output volume. Measured on the candle
  // prompt, six candidates in one call: default 226s / $1.24, medium 83s /
  // $0.46, low 38s / $0.30, all six compiling at every level. Three sequential
  // generations make that 11 minutes a run against 4.
  //
  // Not low. At low the model stops animating: five of six came back below the
  // motion threshold, and a static candidate is zeroed by the prefilter before
  // it ever reaches the vision call, so a third of the rubric is thrown away.
  // Set empty to fall back to the session default.
  //
  // Checked here because the CLI only warns on an unknown level and falls back
  // to the default, on stderr, which we capture. A typo would cost 3x latency
  // per call and nothing would say so.
  const effort = opt("CLAUDE_CLI_EFFORT", "medium");
  if (effort !== "") {
    if (!EFFORTS.includes(effort)) {
      throw new Error(`CLAUDE_CLI_EFFORT="${effort}" is not one of ${EFFORTS.join(", ")}`);
    }
    args.push("--effort", effort);
  }

  if (call.tools && call.tools.length > 0) {
    const t = call.tools.join(",");
    args.push("--tools", t, "--allowedTools", t, "--permission-mode", "acceptEdits", "--max-turns", "6");
  }

  const out = await new Promise<string>((ok, fail) => {
    const p = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    const abort = (): void => {
      p.kill("SIGTERM");
      fail(new Error("cancelled"));
    };
    signal()?.addEventListener("abort", abort, { once: true });
    let so = "", se = "";
    p.stdout.on("data", (d) => (so += d));
    p.stderr.on("data", (d) => (se += d));
    p.on("error", fail);
    p.on("close", (code) => (code === 0 ? ok(so) : fail(new Error(`claude exit ${code}: ${se.trim()}`))));
    p.stdin.end(call.prompt);
  });

  const env = JSON.parse(out) as Envelope;
  for (const u of Object.values(env.modelUsage ?? {})) spentUSD += u.costUSD ?? 0;
  if (env.is_error) throw new Error(`claude: ${env.result ?? "unknown error"}`);
  if (env.structured_output !== undefined && env.structured_output !== null) return env.structured_output;
  return JSON.parse(env.result ?? "{}");
}

const looksLikeShader = (c: Candidate): boolean =>
  c.source.includes("void mainImage(") && !c.source.includes("#version") && !/\bvoid\s+main\s*\(/.test(c.source);

/** Six candidates for a prompt. Anything failing the signature check is dropped. */
export async function generateCandidates(prompt: string): Promise<Candidate[]> {
  const sys = read("codegen.md");
  const user = `Write six shaders for: ${prompt}`;
  if (provider() === "anthropic") return apiCandidates(sys, user);
  if (provider() === "xai") return xaiCandidates(sys, user);
  const out = (await cli({
    system: read("codegen.md"),
    prompt: `Write six shaders for: ${prompt}`,
    schema: CANDIDATES_SCHEMA,
  })) as { candidates: Candidate[] };
  return (out.candidates ?? []).filter(looksLikeShader);
}

/** Children of two survivors: two revising each, two taking a new construction. */
export async function mutateCandidates(
  prompt: string,
  survivors: { source: string; critique: string; total: number }[],
  steering?: string,
): Promise<Candidate[]> {
  const [a, b] = survivors;
  const block = steering ? `\nThe user has since added: ${steering}\nWeight this above the critiques.\n` : "";
  const body = [
    `You are improving shaders for: ${prompt}`, "",
    `SURVIVOR A, scored ${a?.total ?? 0}`, `Critique: ${a?.critique ?? ""}`, a?.source ?? "", "",
    `SURVIVOR B, scored ${b?.total ?? 0}`, `Critique: ${b?.critique ?? ""}`, b?.source ?? "", "",
    block,
    "Return six children: two that revise A to fix what its critique names,",
    "two that revise B to fix what its critique names,",
    "two that take a different construction entirely for the same description.",
    "A revision changes what the critique points at. Do not rewrite a survivor from",
    "scratch, and do not return it unchanged.",
  ].join("\n");

  const msys = read("codegen.md") + "\n\n" + read("mutation.md");
  if (provider() === "anthropic") return apiCandidates(msys, body);
  if (provider() === "xai") return xaiCandidates(msys, body);
  const out = (await cli({
    system: read("codegen.md") + "\n\n" + read("mutation.md"),
    prompt: body,
    schema: CANDIDATES_SCHEMA,
  })) as { candidates: Candidate[] };
  return (out.candidates ?? []).filter(looksLikeShader);
}

/**
 * Score three frames against the prompt. Print mode reads images off disk, so
 * the caller writes them somewhere absolute first and passes the paths.
 */
export async function scoreFrames(prompt: string, framePaths: string[]): Promise<Vision> {
  if (provider() === "anthropic") return apiVision(prompt, framePaths);
  if (provider() === "xai") return xaiVision(prompt, framePaths);
  const body = [
    `Description: ${prompt}`, "",
    "Read these three frames of one shader, at t = 0, 1 and 2 seconds:",
    ...framePaths.map((p) => `  ${p}`),
  ].join("\n");

  return (await cli({
    system: read("rubric.md"),
    prompt: body,
    schema: VISION_SCHEMA,
    tools: ["Read"],
  })) as Vision;
}

// ---------------------------------------------------------------------------
// anthropic: the provider a deployed orchestrator uses. claude-cli cannot
// authenticate inside a container, so the published service needs an HTTP key.
// ---------------------------------------------------------------------------

const CandidatesZ = z.object({
  candidates: z
    .array(z.object({ strategy: z.string(), source: z.string() }))
    .length(6),
});

const VisionZ = z.object({
  palette: z.number(),
  motion: z.number(),
  subject: z.number(),
  critique: z.string(),
});

/** Per million tokens, for the spend counter. Sonnet 5 unless overridden. */
const RATES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-opus-5": { in: 5, out: 25 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

let anthropicClient: Anthropic | undefined;
const anthropic = (): Anthropic => {
  anthropicClient ??= new Anthropic({ apiKey: need("ANTHROPIC_API_KEY") });
  return anthropicClient;
};
const anthropicModel = (): string => opt("ANTHROPIC_MODEL", "claude-sonnet-5");

const bill = (usage: { input_tokens?: number; output_tokens?: number } | null | undefined): void => {
  const r = RATES[anthropicModel()] ?? RATES["claude-sonnet-5"]!;
  spentUSD += ((usage?.input_tokens ?? 0) * r.in + (usage?.output_tokens ?? 0) * r.out) / 1_000_000;
};

async function apiCandidates(system: string, prompt: string): Promise<Candidate[]> {
  const res = await anthropic().messages.parse({
    model: anthropicModel(),
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(CandidatesZ) },
  });
  bill(res.usage);
  return (res.parsed_output?.candidates ?? []).filter(looksLikeShader);
}

async function apiVision(prompt: string, framePaths: string[]): Promise<Vision> {
  const images = framePaths.map((p) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/png" as const,
      data: readFileSync(p).toString("base64"),
    },
  }));
  const res = await anthropic().messages.parse({
    model: anthropicModel(),
    max_tokens: 4000,
    system: read("rubric.md"),
    messages: [
      {
        role: "user",
        content: [
          ...images,
          {
            type: "text",
            text: `Description: ${prompt}\nThe three images are the same shader at t = 0, 1 and 2 seconds, in that order.`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(VisionZ) },
  });
  bill(res.usage);
  const v = res.parsed_output;
  if (v === null || v === undefined) throw new Error("vision returned no parsed output");
  void basename;
  return v;
}

// ---------------------------------------------------------------------------
// xai: the partner model. OpenAI-compatible, so the standard SDK works against
// a different baseURL. Structured output goes through response_format rather
// than a typed helper, and the parse is defensive because nothing guarantees
// the shape the way the other two providers do.
// ---------------------------------------------------------------------------

let xaiClient: OpenAI | undefined;
const xai = (): OpenAI => {
  xaiClient ??= new OpenAI({ apiKey: need("XAI_API_KEY"), baseURL: "https://api.x.ai/v1" });
  return xaiClient;
};
const xaiModel = (): string => need("XAI_MODEL");

/** Models wrap JSON in prose or fences regardless of instructions. Dig it out. */
const looseJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error(`no JSON in model output: ${text.slice(0, 200)}`);
  return JSON.parse(body.slice(start));
};

async function xaiJson(system: string, content: OpenAI.ChatCompletionContentPart[] | string, schema: unknown, name: string): Promise<unknown> {
  const res = await xai().chat.completions.create(
    {
    model: xaiModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: content as never },
    ],
    response_format: { type: "json_schema", json_schema: { name, schema, strict: true } } as never,
    },
    { signal: signal() },
  );
  const u = res.usage;
  // x.ai pricing is not tracked here; token counts go to the log instead.
  if (u) console.log(`[xai] in=${u.prompt_tokens} out=${u.completion_tokens}`);
  return looseJson(res.choices[0]?.message?.content ?? "");
}

async function xaiCandidates(system: string, prompt: string): Promise<Candidate[]> {
  const out = (await xaiJson(system, prompt, CANDIDATES_SCHEMA, "candidates")) as { candidates?: Candidate[] };
  return (out.candidates ?? []).filter(looksLikeShader);
}

async function xaiVision(prompt: string, framePaths: string[]): Promise<Vision> {
  const parts: OpenAI.ChatCompletionContentPart[] = [
    ...framePaths.map((p) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${readFileSync(p).toString("base64")}` },
    })),
    {
      type: "text" as const,
      text: `Description: ${prompt}\nThe three images are the same shader at t = 0, 1 and 2 seconds, in that order.`,
    },
  ];
  return (await xaiJson(read("rubric.md"), parts, VISION_SCHEMA, "vision")) as Vision;
}

const provider = (): string => opt("LLM_PROVIDER", "claude-cli");

export interface RankEntry {
  label: number;
  framePaths: string[];
}

/**
 * One call that puts a whole generation in order, best first.
 *
 * Per-candidate scoring stays as it is, because the UI subscribes to each
 * candidate's score as it lands and that is most of why the grid feels alive.
 * This runs after those, and only decides who survives. Asking for an absolute
 * 0 to 10 per candidate in isolation gives the model no anchor for what 7 rather
 * than 8 means; asking it to order six it can see at once does.
 *
 * `order` holds labels, not positions. Callers must tolerate a short, long or
 * duplicated list: the model is being asked for a permutation and nothing
 * enforces that it returns one.
 */
export async function rankGeneration(prompt: string, entries: RankEntry[]): Promise<{ order: number[]; reason: string }> {
  // Both new calls are claude-cli only for now. loop.ts catches this and falls
  // back to the weighted score, so an unimplemented provider costs calibration
  // rather than the run.
  if (provider() !== "claude-cli") throw new Error(`rank/compare not implemented for LLM_PROVIDER=${provider()}`);
  const body = [
    `Description: ${prompt}`, "",
    "Rank these candidates best first against the description.",
    "Return `order` as candidate numbers, best first, every candidate exactly once.",
    "",
    ...entries.flatMap((e) => [`Candidate ${e.label}, frames at t = 0, 1, 2:`, ...e.framePaths.map((p) => `  ${p}`), ""]),
  ].join("\n");

  return (await cli({
    system: read("rubric.md"),
    prompt: body,
    schema: RANKING_SCHEMA,
    tools: ["Read"],
  })) as { order: number[]; reason: string };
}

/**
 * Did three generations actually improve anything?
 *
 * Absolute scores drift between generations, so a generation 3 total below
 * generation 1's proves nothing either way. One direct comparison of the two
 * best does, and it is the claim the demo rests on.
 */
async function compareOnce(
  prompt: string,
  first: string[],
  second: string[],
): Promise<{ better: "first" | "second" | "neither"; reason: string }> {
  // Both new calls are claude-cli only for now. loop.ts catches this and falls
  // back to the weighted score, so an unimplemented provider costs calibration
  // rather than the run.
  if (provider() !== "claude-cli") throw new Error(`rank/compare not implemented for LLM_PROVIDER=${provider()}`);
  const body = [
    `Description: ${prompt}`, "",
    "Two shaders, each as three frames. Which matches the description better?",
    "Judge only the description. Answer `neither` if they are genuinely equal.",
    "",
    "First:", ...first.map((p) => `  ${p}`), "",
    "Second:", ...second.map((p) => `  ${p}`),
  ].join("\n");

  return (await cli({
    system: read("rubric.md"),
    prompt: body,
    schema: VERDICT_SCHEMA,
    tools: ["Read"],
  })) as { better: "first" | "second" | "neither"; reason: string };
}

/**
 * Asks twice, with the two shaders swapped, and only reports a winner when both
 * answers name the same one.
 *
 * A single call is not stable enough to carry this claim. Run against the same
 * two frames twice it named a different winner each time, and the swap is what
 * separates a real preference from both run-to-run variance and a preference
 * for whichever slot came first. Two calls per run, once, at the end.
 */
export async function compareGenerations(
  prompt: string,
  first: string[],
  last: string[],
): Promise<{ better: "first" | "second" | "neither"; reason: string }> {
  const [ab, ba] = await Promise.all([
    compareOnce(prompt, first, last),
    compareOnce(prompt, last, first),
  ]);
  // Same winner seen from both directions, or no claim.
  const firstWins = ab.better === "first" && ba.better === "second";
  const lastWins = ab.better === "second" && ba.better === "first";
  if (firstWins) return { better: "first", reason: ab.reason };
  if (lastWins) return { better: "second", reason: ab.reason };
  return { better: "neither", reason: `unstable across a swap: ${ab.better} then ${ba.better}. ${ab.reason}` };
}

export function assertProvider(): void {
  const p = provider();
  if (p === "anthropic") need("ANTHROPIC_API_KEY");
  else if (p === "xai") {
    need("XAI_API_KEY");
    need("XAI_MODEL");
  } else if (p !== "claude-cli") {
    throw new Error(`LLM_PROVIDER=${p} is not implemented. Use claude-cli, anthropic or xai.`);
  }
  need("CONVEX_URL");
}
