"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localRunPath = void 0;
exports.renderLocal = renderLocal;
exports.createRunLocal = createRunLocal;
exports.createGenerationLocal = createGenerationLocal;
exports.createCandidateLocal = createCandidateLocal;
exports.setCandidateStatusLocal = setCandidateStatusLocal;
exports.uploadFramesLocal = uploadFramesLocal;
exports.setCandidateScoresLocal = setCandidateScoresLocal;
exports.markSurvivorsLocal = markSurvivorsLocal;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const REPO = (0, node_path_1.resolve)(__dirname, "..");
const HARNESS = (0, node_path_1.join)(REPO, "harness");
/**
 * Render on this machine instead of in a sandbox.
 *
 * The sandbox exists so the deployed service can isolate untrusted shader code
 * and run several at once. Neither applies here, and the Daytona account allows
 * two sandboxes in total, so a local iteration that used them took the live site
 * down for its whole duration. `harness/render.js` is the same renderer.
 */
function renderLocal(id, source) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "shader-local-"));
    const glsl = (0, node_path_1.join)(dir, `${id}.glsl`);
    const out = (0, node_path_1.join)(dir, id);
    (0, node_fs_1.writeFileSync)(glsl, source);
    // Exit code is non-zero only when the harness itself broke; compile_error and
    // timeout are normal results and come back through result.json.
    (0, node_child_process_1.execFileSync)("node", ["render.js", "--in", glsl, "--out", out], {
        cwd: HARNESS,
        stdio: "pipe",
    });
    const result = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(out, "result.json"), "utf8"));
    const png = result.status === "ok" ? result.frames.map((f) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(out, f))) : [];
    return { result, png };
}
const root = (runId) => (0, node_path_1.join)(REPO, "experiments", runId);
const roundDir = (runId, gen) => (0, node_path_1.join)(root(runId), gen);
const candDir = (runId, gen, index) => (0, node_path_1.join)(roundDir(runId, gen), `r${index}`);
const pending = new Map();
/** candidateId -> where it lives, so later writes find it. */
const placed = new Map();
function createRunLocal(prompt, model, git) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
    const runId = `local-${stamp}`;
    (0, node_fs_1.mkdirSync)(root(runId), { recursive: true });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root(runId), "manifest.json"), JSON.stringify({ id: runId, model, git, prompt, runs: {} }, null, 2));
    return runId;
}
function createGenerationLocal(runId, index) {
    const gen = `round-${index}`;
    (0, node_fs_1.mkdirSync)(roundDir(runId, gen), { recursive: true });
    pending.set(`${runId}/${gen}`, []);
    const mf = (0, node_path_1.join)(root(runId), "manifest.json");
    const m = JSON.parse((0, node_fs_1.readFileSync)(mf, "utf8"));
    m.runs[gen] = { prompt: `${m.prompt}  —  round ${index}`, at: new Date().toISOString() };
    (0, node_fs_1.writeFileSync)(mf, JSON.stringify(m, null, 2));
    return gen;
}
function createCandidateLocal(runId, gen, index, strategy, source) {
    const id = `${runId}/${gen}/${index}`;
    placed.set(id, { runId, gen, index });
    const list = pending.get(`${runId}/${gen}`) ?? [];
    list[index] = { strategy, source };
    pending.set(`${runId}/${gen}`, list);
    (0, node_fs_1.mkdirSync)(candDir(runId, gen, index), { recursive: true });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(roundDir(runId, gen), `c${index}.glsl`), source);
    // Written every time so a run killed midway still has a readable page.
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(roundDir(runId, gen), "cands.json"), JSON.stringify({ candidates: list.filter(Boolean) }, null, 2));
    return id;
}
function setCandidateStatusLocal(id, status, log) {
    const at = placed.get(id);
    if (at === undefined)
        return;
    const dir = candDir(at.runId, at.gen, at.index);
    const frames = status === "ok" ? ["t0.png", "t1.png", "t2.png"] : [];
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, "result.json"), JSON.stringify({ status, log: log ?? "", frames }, null, 2));
}
function uploadFramesLocal(id, png) {
    const at = placed.get(id);
    if (at === undefined)
        return;
    const dir = candDir(at.runId, at.gen, at.index);
    png.forEach((buf, i) => (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, `t${i}.png`), buf));
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, "result.json"), JSON.stringify({ status: "ok", log: "", frames: ["t0.png", "t1.png", "t2.png"] }, null, 2));
}
function setCandidateScoresLocal(id, scores, critique) {
    const at = placed.get(id);
    if (at === undefined)
        return;
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(candDir(at.runId, at.gen, at.index), "scores.json"), JSON.stringify({ ...scores, critique: critique ?? "" }, null, 2));
}
function markSurvivorsLocal(ids) {
    for (const id of ids) {
        const at = placed.get(id);
        if (at === undefined)
            continue;
        const f = (0, node_path_1.join)(candDir(at.runId, at.gen, at.index), "scores.json");
        try {
            const s = JSON.parse((0, node_fs_1.readFileSync)(f, "utf8"));
            (0, node_fs_1.writeFileSync)(f, JSON.stringify({ ...s, survived: true }, null, 2));
        }
        catch {
            // No scores yet means nothing to annotate.
        }
    }
}
const localRunPath = (runId) => `experiments/${runId}`;
exports.localRunPath = localRunPath;
