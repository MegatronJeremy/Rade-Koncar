"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spend = void 0;
exports.generateCandidates = generateCandidates;
exports.mutateCandidates = mutateCandidates;
exports.scoreFrames = scoreFrames;
exports.rankGeneration = rankGeneration;
exports.compareGenerations = compareGenerations;
exports.assertProvider = assertProvider;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("@anthropic-ai/sdk/helpers/zod");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const zod_2 = require("zod");
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
    const sys = read("codegen.md");
    const user = `Write six shaders for: ${prompt}`;
    if (provider() === "anthropic")
        return apiCandidates(sys, user);
    if (provider() === "xai")
        return xaiCandidates(sys, user);
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
    const msys = read("codegen.md") + "\n\n" + read("mutation.md");
    if (provider() === "anthropic")
        return apiCandidates(msys, body);
    if (provider() === "xai")
        return xaiCandidates(msys, body);
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
    if (provider() === "anthropic")
        return apiVision(prompt, framePaths);
    if (provider() === "xai")
        return xaiVision(prompt, framePaths);
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
// ---------------------------------------------------------------------------
// anthropic: the provider a deployed orchestrator uses. claude-cli cannot
// authenticate inside a container, so the published service needs an HTTP key.
// ---------------------------------------------------------------------------
const CandidatesZ = zod_2.z.object({
    candidates: zod_2.z
        .array(zod_2.z.object({ strategy: zod_2.z.string(), source: zod_2.z.string() }))
        .length(6),
});
const VisionZ = zod_2.z.object({
    palette: zod_2.z.number(),
    motion: zod_2.z.number(),
    subject: zod_2.z.number(),
    critique: zod_2.z.string(),
});
/** Per million tokens, for the spend counter. Sonnet 5 unless overridden. */
const RATES = {
    "claude-sonnet-5": { in: 2, out: 10 },
    "claude-opus-5": { in: 5, out: 25 },
    "claude-haiku-4-5": { in: 1, out: 5 },
};
let anthropicClient;
const anthropic = () => {
    anthropicClient ??= new sdk_1.default({ apiKey: (0, env_1.need)("ANTHROPIC_API_KEY") });
    return anthropicClient;
};
const anthropicModel = () => (0, env_1.opt)("ANTHROPIC_MODEL", "claude-sonnet-5");
const bill = (usage) => {
    const r = RATES[anthropicModel()] ?? RATES["claude-sonnet-5"];
    spentUSD += ((usage?.input_tokens ?? 0) * r.in + (usage?.output_tokens ?? 0) * r.out) / 1_000_000;
};
async function apiCandidates(system, prompt) {
    const res = await anthropic().messages.parse({
        model: anthropicModel(),
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: (0, zod_1.zodOutputFormat)(CandidatesZ) },
    });
    bill(res.usage);
    return (res.parsed_output?.candidates ?? []).filter(looksLikeShader);
}
async function apiVision(prompt, framePaths) {
    const images = framePaths.map((p) => ({
        type: "image",
        source: {
            type: "base64",
            media_type: "image/png",
            data: (0, node_fs_1.readFileSync)(p).toString("base64"),
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
        output_config: { format: (0, zod_1.zodOutputFormat)(VisionZ) },
    });
    bill(res.usage);
    const v = res.parsed_output;
    if (v === null || v === undefined)
        throw new Error("vision returned no parsed output");
    void node_path_1.basename;
    return v;
}
// ---------------------------------------------------------------------------
// xai: the partner model. OpenAI-compatible, so the standard SDK works against
// a different baseURL. Structured output goes through response_format rather
// than a typed helper, and the parse is defensive because nothing guarantees
// the shape the way the other two providers do.
// ---------------------------------------------------------------------------
let xaiClient;
const xai = () => {
    xaiClient ??= new openai_1.default({ apiKey: (0, env_1.need)("XAI_API_KEY"), baseURL: "https://api.x.ai/v1" });
    return xaiClient;
};
const xaiModel = () => (0, env_1.need)("XAI_MODEL");
/** Models wrap JSON in prose or fences regardless of instructions. Dig it out. */
const looseJson = (text) => {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = fenced?.[1] ?? text;
    const start = body.search(/[[{]/);
    if (start === -1)
        throw new Error(`no JSON in model output: ${text.slice(0, 200)}`);
    return JSON.parse(body.slice(start));
};
async function xaiJson(system, content, schema, name) {
    const res = await xai().chat.completions.create({
        model: xaiModel(),
        messages: [
            { role: "system", content: system },
            { role: "user", content: content },
        ],
        response_format: { type: "json_schema", json_schema: { name, schema, strict: true } },
    });
    const u = res.usage;
    // x.ai pricing is not tracked here; token counts go to the log instead.
    if (u)
        console.log(`[xai] in=${u.prompt_tokens} out=${u.completion_tokens}`);
    return looseJson(res.choices[0]?.message?.content ?? "");
}
async function xaiCandidates(system, prompt) {
    const out = (await xaiJson(system, prompt, CANDIDATES_SCHEMA, "candidates"));
    return (out.candidates ?? []).filter(looksLikeShader);
}
async function xaiVision(prompt, framePaths) {
    const parts = [
        ...framePaths.map((p) => ({
            type: "image_url",
            image_url: { url: `data:image/png;base64,${(0, node_fs_1.readFileSync)(p).toString("base64")}` },
        })),
        {
            type: "text",
            text: `Description: ${prompt}\nThe three images are the same shader at t = 0, 1 and 2 seconds, in that order.`,
        },
    ];
    return (await xaiJson(read("rubric.md"), parts, VISION_SCHEMA, "vision"));
}
const provider = () => (0, env_1.opt)("LLM_PROVIDER", "claude-cli");
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
async function rankGeneration(prompt, entries) {
    // Both new calls are claude-cli only for now. loop.ts catches this and falls
    // back to the weighted score, so an unimplemented provider costs calibration
    // rather than the run.
    if (provider() !== "claude-cli")
        throw new Error(`rank/compare not implemented for LLM_PROVIDER=${provider()}`);
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
    }));
}
/**
 * Did three generations actually improve anything?
 *
 * Absolute scores drift between generations, so a generation 3 total below
 * generation 1's proves nothing either way. One direct comparison of the two
 * best does, and it is the claim the demo rests on.
 */
async function compareGenerations(prompt, first, last) {
    // Both new calls are claude-cli only for now. loop.ts catches this and falls
    // back to the weighted score, so an unimplemented provider costs calibration
    // rather than the run.
    if (provider() !== "claude-cli")
        throw new Error(`rank/compare not implemented for LLM_PROVIDER=${provider()}`);
    const body = [
        `Description: ${prompt}`, "",
        "Two shaders, each as three frames. Which matches the description better?",
        "Judge only the description. Answer `neither` if they are genuinely equal.",
        "",
        "First:", ...first.map((p) => `  ${p}`), "",
        "Second:", ...last.map((p) => `  ${p}`),
    ].join("\n");
    return (await cli({
        system: read("rubric.md"),
        prompt: body,
        schema: VERDICT_SCHEMA,
        tools: ["Read"],
    }));
}
function assertProvider() {
    const p = provider();
    if (p === "anthropic")
        (0, env_1.need)("ANTHROPIC_API_KEY");
    else if (p === "xai") {
        (0, env_1.need)("XAI_API_KEY");
        (0, env_1.need)("XAI_MODEL");
    }
    else if (p !== "claude-cli") {
        throw new Error(`LLM_PROVIDER=${p} is not implemented. Use claude-cli, anthropic or xai.`);
    }
    (0, env_1.need)("CONVEX_URL");
}
