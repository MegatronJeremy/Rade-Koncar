/**
 * Where a run's results go, and where its shaders render.
 *
 * `convex` is the deployed path: sandboxes for isolation, Convex so the UI can
 * watch. `local` renders on this machine and writes to experiments/, touching
 * nothing shared. Local is the default for the CLI, because an iteration that
 * used the deployed path took both Daytona sandboxes and the front page with
 * it for the eight minutes it ran.
 */
import { execFileSync } from "node:child_process";
import * as local from "./local";
import { opt } from "./env";
import { createPool, mapOverPool, poolSize, renderInSandbox, type Pool } from "./sandbox";
import * as convex from "./store";
import type { Rendered, Scores } from "./types";

export type Mode = "local" | "convex";
export const mode = (): Mode => (opt("RUN_MODE", "local") === "convex" ? "convex" : "local");

const gitSha = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

export interface Sink {
  createRun(prompt: string): Promise<string>;
  setRunStatus(runId: string, status: "queued" | "running" | "done" | "failed"): Promise<void>;
  createGeneration(runId: string, index: number): Promise<string>;
  setGenerationStatus(generationId: string, status: "running" | "done"): Promise<void>;
  createCandidate(a: {
    runId: string;
    generationId: string;
    index: number;
    strategy: string;
    source: string;
    parentIds?: string[];
  }): Promise<string>;
  setCandidateStatus(id: string, status: string, log?: string): Promise<void>;
  uploadFrames(id: string, png: Buffer[]): Promise<void>;
  setCandidateScores(id: string, scores: Scores, critique?: string): Promise<void>;
  markSurvivors(ids: string[]): Promise<void>;
  /** Where to look when it finishes. */
  where(runId: string): string;
}

const localSink = (): Sink => {
  let runId = "";
  return {
    createRun: async (prompt) => {
      runId = local.createRunLocal(prompt, opt("CLAUDE_CLI_MODEL", "claude-sonnet-5"), gitSha());
      return runId;
    },
    setRunStatus: async () => undefined,
    createGeneration: async (id, index) => local.createGenerationLocal(id, index),
    setGenerationStatus: async () => undefined,
    createCandidate: async (a) =>
      local.createCandidateLocal(a.runId, a.generationId, a.index, a.strategy, a.source),
    setCandidateStatus: async (id, status, log) => local.setCandidateStatusLocal(id, status, log),
    uploadFrames: async (id, png) => local.uploadFramesLocal(id, png),
    setCandidateScores: async (id, scores, critique) =>
      local.setCandidateScoresLocal(id, scores, critique),
    markSurvivors: async (ids) => local.markSurvivorsLocal(ids),
    where: (id) => local.localRunPath(id),
  };
};

const convexSink = (): Sink => ({
  createRun: (prompt) => convex.createRun(prompt),
  setRunStatus: async (id, s) => {
    await convex.setRunStatus(id, s);
  },
  createGeneration: (id, index) => convex.createGeneration(id, index),
  setGenerationStatus: async (id, s) => {
    await convex.setGenerationStatus(id, s);
  },
  createCandidate: (a) => convex.createCandidate(a),
  setCandidateStatus: async (id, status, log) => {
    await convex.setCandidateStatus(id, status as never, log);
  },
  uploadFrames: (id, png) => convex.uploadFrames(id, png),
  setCandidateScores: async (id, scores, critique) => {
    await convex.setCandidateScores(id, scores, critique);
  },
  markSurvivors: async (ids) => {
    await convex.markSurvivors(ids);
  },
  where: () => "the live site",
});

export const sink = (): Sink => (mode() === "convex" ? convexSink() : localSink());

/* ---------------- rendering ---------------- */

export type RenderFn = (id: string, source: string) => Promise<Rendered>;

export interface Renderer {
  /**
   * Run `work` over every item, handing each call a renderer bound to whichever
   * worker picked it up. Locally that is one browser at a time; on the deployed
   * path it is the sandbox pool, and binding matters because two candidates must
   * never share a box.
   */
  each<T>(items: T[], work: (item: T, index: number, render: RenderFn) => Promise<void>): Promise<void>;
  dispose(): Promise<void>;
}

export async function renderer(): Promise<Renderer> {
  if (mode() !== "convex") {
    const render: RenderFn = async (id, source) => local.renderLocal(id, source);
    return {
      each: async (items, work) => {
        for (const [i, item] of items.entries()) await work(item, i, render);
      },
      dispose: async () => undefined,
    };
  }

  const pool: Pool = await createPool(poolSize());
  return {
    each: (items, work) =>
      mapOverPool(pool, items, (box, item, i) =>
        work(item, i, (id, source) => renderInSandbox(box, id, source)),
      ),
    dispose: () => pool.dispose(),
  };
}
