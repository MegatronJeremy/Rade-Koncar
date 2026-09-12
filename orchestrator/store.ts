import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { need, timed } from "./env";

/**
 * Untyped function references rather than web/convex/_generated/api. Importing
 * the generated module pulls Djordje's Convex source into this compile, where
 * its own dependencies do not resolve. The function names are the contract; they
 * are listed in web/convex/README.md.
 */
const api = anyApi;
import type { Scores } from "./types";

/**
 * A trailing slash on the deployment URL makes every mutation reject with an
 * Error whose message is the empty string, which is close to undebuggable. The
 * URL gets pasted by hand, so strip it here rather than trusting the paste.
 */
const convex = new ConvexHttpClient(need("CONVEX_URL").replace(/\/+$/, ""));

export type RunId = string;
export type GenerationId = string;
export type CandidateId = string;

export const createRun = (prompt: string): Promise<RunId> =>
  convex.mutation(api.runs.createRun, { prompt, mode: "text" }) as Promise<RunId>;

export const setRunStatus = (runId: RunId, status: "queued" | "running" | "done" | "failed") =>
  convex.mutation(api.runs.setRunStatus, { runId: runId, status });

export const pinRun = (runId: RunId) => convex.mutation(api.runs.pinRun, { runId: runId });

export const createGeneration = (runId: RunId, index: number): Promise<GenerationId> =>
  convex.mutation(api.generations.createGeneration, { runId: runId, index }) as Promise<GenerationId>;

export const setGenerationStatus = (generationId: GenerationId, status: "running" | "done") =>
  convex.mutation(api.generations.setGenerationStatus, { generationId: generationId, status });

export const createCandidate = (a: {
  runId: RunId; generationId: GenerationId; index: number;
  strategy: string; source: string; parentIds?: CandidateId[];
}): Promise<CandidateId> =>
  convex.mutation(api.candidates.createCandidate, {
    runId: a.runId, generationId: a.generationId, index: a.index,
    strategy: a.strategy, source: a.source, parentIds: (a.parentIds ?? []),
  }) as Promise<CandidateId>;

/**
 * Status is written at every transition, not just at the end. The UI subscribes,
 * so tiles change under the viewer's eyes; a run that only writes a final status
 * renders as a grid that sits still and then blinks once.
 */
export const setCandidateStatus = (
  candidateId: CandidateId,
  status: "queued" | "rendering" | "scoring" | "scored" | "compile_error" | "timeout",
  log?: string,
) => convex.mutation(api.candidates.setCandidateStatus, { candidateId: candidateId, status, log });

export const setCandidateScores = (candidateId: CandidateId, scores: Scores, critique?: string) =>
  convex.mutation(api.candidates.setCandidateScores, { candidateId: candidateId, scores, critique });

export const markSurvivors = (candidateIds: CandidateId[]) =>
  convex.mutation(api.candidates.markSurvivors, { candidateIds: candidateIds });

/** Frames are files. Never base64 a PNG into a document. */
export async function uploadFrames(candidateId: CandidateId, png: Buffer[]): Promise<void> {
  const frameIds: string[] = [];
  for (const buf of png) {
    const url = (await convex.mutation(api.candidates.generateUploadUrl, {})) as string;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "image/png" }, body: new Uint8Array(buf) });
    const { storageId } = (await res.json()) as { storageId: string };
    frameIds.push(storageId);
  }
  await timed("convex frames", () =>
    convex.mutation(api.candidates.setCandidateFrames, { candidateId: candidateId, frameIds: frameIds }),
  );
}
