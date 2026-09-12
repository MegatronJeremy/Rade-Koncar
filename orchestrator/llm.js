"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spend = void 0;
exports.generateCandidates = generateCandidates;
exports.mutateCandidates = mutateCandidates;
exports.scoreFrames = scoreFrames;
exports.assertProvider = assertProvider;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const env_1 = require("./env");
const PROMPTS = (0, node_path_1.resolve)(__dirname, "..", "prompts");
const read = (f) => (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(PROMPTS, f), "utf8");
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
let spentUSD = 0;
const spend = () => spentUSD;
exports.spend = spend;
/**
 * --tools only names which tools exist; --allowedTools grants permission to use
 * them. With the first and not the second the model is refused silently, burns
 * its turns and returns success, so both are set or neither is.
 */
async function cli(call) {
    const bin = (0, env_1.opt)("CLAUDE_BINARY", "claude");
    const args = [
        "-p",
        "--output-format", "json",
        "--model", (0, env_1.opt)("CLAUDE_CLI_MODEL", "claude-sonnet-5"),
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
    const out = await new Promise((ok, fail) => {
        const p = (0, node_child_process_1.spawn)(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
        let so = "", se = "";
        p.stdout.on("data", (d) => (so += d));
        p.stderr.on("data", (d) => (se += d));
        p.on("error", fail);
        p.on("close", (code) => (code === 0 ? ok(so) : fail(new Error(`claude exit ${code}: ${se.trim()}`))));
        p.stdin.end(call.prompt);
    });
    const env = JSON.parse(out);
    for (const u of Object.values(env.modelUsage ?? {}))
        spentUSD += u.costUSD ?? 0;
    if (env.is_error)
        throw new Error(`claude: ${env.result ?? "unknown error"}`);
    if (env.structured_output !== undefined && env.structured_output !== null)
        return env.structured_output;
    return JSON.parse(env.result ?? "{}");
}
const looksLikeShader = (c) => c.source.includes("void mainImage(") && !c.source.includes("#version") && !/\bvoid\s+main\s*\(/.test(c.source);
/** Six candidates for a prompt. Anything failing the signature check is dropped. */
async function generateCandidates(prompt) {
    const out = (await cli({
        system: read("codegen.md"),
        prompt: `Write six shaders for: ${prompt}`,
        schema: CANDIDATES_SCHEMA,
    }));
    return (out.candidates ?? []).filter(looksLikeShader);
}
/** Children of two survivors: two revising each, two taking a new construction. */
async function mutateCandidates(prompt, survivors, steering) {
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
    }));
    return (out.candidates ?? []).filter(looksLikeShader);
}
/**
 * Score three frames against the prompt. Print mode reads images off disk, so
 * the caller writes them somewhere absolute first and passes the paths.
 */
async function scoreFrames(prompt, framePaths) {
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
    }));
}
function assertProvider() {
    const p = (0, env_1.opt)("LLM_PROVIDER", "claude-cli");
    if (p !== "claude-cli") {
        throw new Error(`LLM_PROVIDER=${p} is not implemented yet; only claude-cli is. See docs/01-contracts.md.`);
    }
    (0, env_1.need)("CONVEX_URL");
}
