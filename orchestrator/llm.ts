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

/** The object `claude -p --output-format json` prints on stdout. */
interface Envelope {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
  modelUsage?: Record<string, { costUSD?: number; inputTokens?: number; outputTokens?: number }>;
}

let spentUSD = 0;
export const spend = (): number => spentUSD;

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
  if (call.tools && call.tools.length > 0) {
    const t = call.tools.join(",");
    args.push("--tools", t, "--allowedTools", t, "--permission-mode", "acceptEdits", "--max-turns", "6");
  }

  const out = await new Promise<string>((ok, fail) => {
    const p = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
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
  const res = await xai().chat.completions.create({
    model: xaiModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: content as never },
    ],
    response_format: { type: "json_schema", json_schema: { name, schema, strict: true } } as never,
  });
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
