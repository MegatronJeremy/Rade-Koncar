"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSurvivors = exports.setCandidateScores = exports.setCandidateStatus = exports.createCandidate = exports.setGenerationStatus = exports.createGeneration = exports.pinRun = exports.setRunStatus = exports.createRun = void 0;
exports.uploadFrames = uploadFrames;
const browser_1 = require("convex/browser");
const server_1 = require("convex/server");
const env_1 = require("./env");
/**
 * Untyped function references rather than web/convex/_generated/api. Importing
 * the generated module pulls Djordje's Convex source into this compile, where
 * its own dependencies do not resolve. The function names are the contract; they
 * are listed in web/convex/README.md.
 */
const api = server_1.anyApi;
/**
 * A trailing slash on the deployment URL makes every mutation reject with an
 * Error whose message is the empty string, which is close to undebuggable. The
 * URL gets pasted by hand, so strip it here rather than trusting the paste.
 */
const convex = new browser_1.ConvexHttpClient((0, env_1.need)("CONVEX_URL").replace(/\/+$/, ""));
const createRun = (prompt) => convex.mutation(api.runs.createRun, { prompt, mode: "text" });
exports.createRun = createRun;
const setRunStatus = (runId, status) => convex.mutation(api.runs.setRunStatus, { runId: runId, status });
exports.setRunStatus = setRunStatus;
const pinRun = (runId) => convex.mutation(api.runs.pinRun, { runId: runId });
exports.pinRun = pinRun;
const createGeneration = (runId, index) => convex.mutation(api.generations.createGeneration, { runId: runId, index });
exports.createGeneration = createGeneration;
const setGenerationStatus = (generationId, status) => convex.mutation(api.generations.setGenerationStatus, { generationId: generationId, status });
exports.setGenerationStatus = setGenerationStatus;
const createCandidate = (a) => convex.mutation(api.candidates.createCandidate, {
    runId: a.runId, generationId: a.generationId, index: a.index,
    strategy: a.strategy, source: a.source, parentIds: (a.parentIds ?? []),
});
exports.createCandidate = createCandidate;
/**
 * Status is written at every transition, not just at the end. The UI subscribes,
 * so tiles change under the viewer's eyes; a run that only writes a final status
 * renders as a grid that sits still and then blinks once.
 */
const setCandidateStatus = (candidateId, status, log) => convex.mutation(api.candidates.setCandidateStatus, { candidateId: candidateId, status, log });
exports.setCandidateStatus = setCandidateStatus;
const setCandidateScores = (candidateId, scores, critique) => convex.mutation(api.candidates.setCandidateScores, { candidateId: candidateId, scores, critique });
exports.setCandidateScores = setCandidateScores;
const markSurvivors = (candidateIds) => convex.mutation(api.candidates.markSurvivors, { candidateIds: candidateIds });
exports.markSurvivors = markSurvivors;
/** Frames are files. Never base64 a PNG into a document. */
async function uploadFrames(candidateId, png) {
    const frameIds = [];
    for (const buf of png) {
        const url = (await convex.mutation(api.candidates.generateUploadUrl, {}));
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "image/png" }, body: new Uint8Array(buf) });
        const { storageId } = (await res.json());
        frameIds.push(storageId);
    }
    await (0, env_1.timed)("convex frames", () => convex.mutation(api.candidates.setCandidateFrames, { candidateId: candidateId, frameIds: frameIds }));
}
