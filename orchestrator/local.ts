import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { HarnessResult, Rendered, Scores } from "./types";

const REPO = resolve(__dirname, "..");
const HARNESS = join(REPO, "harness");

/**
 * Render on this machine instead of in a sandbox.
 *
 * The sandbox exists so the deployed service can isolate untrusted shader code
 * and run several at once. Neither applies here, and the Daytona account allows
 * two sandboxes in total, so a local iteration that used them took the live site
 * down for its whole duration. `harness/render.js` is the same renderer.
 */
export function renderLocal(id: string, source: string): Rendered {
  const dir = mkdtempSync(join(tmpdir(), "shader-local-"));
  const glsl = join(dir, `${id}.glsl`);
  const out = join(dir, id);
  writeFileSync(glsl, source);

  // Exit code is non-zero only when the harness itself broke; compile_error and
  // timeout are normal results and come back through result.json.
  execFileSync("node", ["render.js", "--in", glsl, "--out", out], {
    cwd: HARNESS,
    stdio: "pipe",
  });

  const result = JSON.parse(readFileSync(join(out, "result.json"), "utf8")) as HarnessResult;
  const png = result.status === "ok" ? result.frames.map((f) => readFileSync(join(out, f))) : [];
  return { result, png };
}

/* ------------------------------------------------------------------------ *
 * Disk sink, in the layout experiments/bin/sheet.sh already reads. Each round
 * becomes a section, so the review page works with no changes: live tiles, the
 * prefilter numbers computed in the browser, the full source, and the scores.
 * ------------------------------------------------------------------------ */

interface Cand {
  strategy: string;
  source: string;
}

const root = (runId: string): string => join(REPO, "experiments", runId);
const roundDir = (runId: string, gen: string): string => join(root(runId), gen);
const candDir = (runId: string, gen: string, index: number): string =>
  join(roundDir(runId, gen), `r${index}`);

const pending = new Map<string, Cand[]>();
/** candidateId -> where it lives, so later writes find it. */
const placed = new Map<string, { runId: string; gen: string; index: number }>();

export function createRunLocal(prompt: string, model: string, git: string): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
  const runId = `local-${stamp}`;
  mkdirSync(root(runId), { recursive: true });
  writeFileSync(
    join(root(runId), "manifest.json"),
    JSON.stringify({ id: runId, model, git, prompt, runs: {} }, null, 2),
  );
  return runId;
}

export function createGenerationLocal(runId: string, index: number): string {
  const gen = `round-${index}`;
  mkdirSync(roundDir(runId, gen), { recursive: true });
  pending.set(`${runId}/${gen}`, []);

  const mf = join(root(runId), "manifest.json");
  const m = JSON.parse(readFileSync(mf, "utf8")) as {
    prompt: string;
    runs: Record<string, unknown>;
  };
  m.runs[gen] = { prompt: `${m.prompt}  —  round ${index}`, at: new Date().toISOString() };
  writeFileSync(mf, JSON.stringify(m, null, 2));
  return gen;
}

export function createCandidateLocal(
  runId: string,
  gen: string,
  index: number,
  strategy: string,
  source: string,
): string {
  const id = `${runId}/${gen}/${index}`;
  placed.set(id, { runId, gen, index });
  const list = pending.get(`${runId}/${gen}`) ?? [];
  list[index] = { strategy, source };
  pending.set(`${runId}/${gen}`, list);

  mkdirSync(candDir(runId, gen, index), { recursive: true });
  writeFileSync(join(roundDir(runId, gen), `c${index}.glsl`), source);
  // Written every time so a run killed midway still has a readable page.
  writeFileSync(
    join(roundDir(runId, gen), "cands.json"),
    JSON.stringify({ candidates: list.filter(Boolean) }, null, 2),
  );
  return id;
}

export function setCandidateStatusLocal(id: string, status: string, log?: string): void {
  const at = placed.get(id);
  if (at === undefined) return;
  const dir = candDir(at.runId, at.gen, at.index);
  const frames = status === "ok" ? ["t0.png", "t1.png", "t2.png"] : [];
  writeFileSync(join(dir, "result.json"), JSON.stringify({ status, log: log ?? "", frames }, null, 2));
}

export function uploadFramesLocal(id: string, png: readonly Buffer[]): void {
  const at = placed.get(id);
  if (at === undefined) return;
  const dir = candDir(at.runId, at.gen, at.index);
  png.forEach((buf, i) => writeFileSync(join(dir, `t${i}.png`), buf));
  writeFileSync(
    join(dir, "result.json"),
    JSON.stringify({ status: "ok", log: "", frames: ["t0.png", "t1.png", "t2.png"] }, null, 2),
  );
}

export function setCandidateScoresLocal(id: string, scores: Scores, critique?: string): void {
  const at = placed.get(id);
  if (at === undefined) return;
  writeFileSync(
    join(candDir(at.runId, at.gen, at.index), "scores.json"),
    JSON.stringify({ ...scores, critique: critique ?? "" }, null, 2),
  );
}

export function markSurvivorsLocal(ids: readonly string[]): void {
  for (const id of ids) {
    const at = placed.get(id);
    if (at === undefined) continue;
    const f = join(candDir(at.runId, at.gen, at.index), "scores.json");
    try {
      const s = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
      writeFileSync(f, JSON.stringify({ ...s, survived: true }, null, 2));
    } catch {
      // No scores yet means nothing to annotate.
    }
  }
}

export const localRunPath = (runId: string): string => `experiments/${runId}`;
