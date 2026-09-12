import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

export function assertProvider(): void {
  const p = opt("LLM_PROVIDER", "claude-cli");
  if (p !== "claude-cli") {
    throw new Error(`LLM_PROVIDER=${p} is not implemented yet; only claude-cli is. See docs/01-contracts.md.`);
  }
  need("CONVEX_URL");
}
