import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { candidateStatus, scores } from "./schema";

/**
 * Everything here is called by the orchestrator as a candidate moves through
 * the pipeline. Status is written eagerly at every step — the UI subscribes to
 * it, so tiles change from queued to rendering to scored while the user watches,
 * and that is most of why a live run looks alive.
 */

export const createCandidate = mutation({
  args: {
    runId: v.id("runs"),
    generationId: v.id("generations"),
    index: v.number(),
    strategy: v.string(),
    source: v.string(),
    /** The survivors this candidate was mutated from. Empty in generation 1. */
    parentIds: v.optional(v.array(v.id("candidates"))),
  },
  returns: v.id("candidates"),
  handler: async (ctx, args) =>
    ctx.db.insert("candidates", {
      runId: args.runId,
      generationId: args.generationId,
      index: args.index,
      strategy: args.strategy,
      source: args.source,
      status: "queued",
      frameIds: [],
      parentIds: args.parentIds ?? [],
      survived: false,
    }),
});

/** `log` carries the compiler message when status is `compile_error`. */
export const setCandidateStatus = mutation({
  args: {
    candidateId: v.id("candidates"),
    status: candidateStatus,
    log: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, {
      status: args.status,
      ...(args.log === undefined ? {} : { log: args.log }),
    });
    return null;
  },
});

/**
 * POST the PNG to the returned URL; the response body is
 * `{ storageId }`, which goes into `setCandidateFrames`.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/** Three storage ids, t0 t1 t2 in order. */
export const setCandidateFrames = mutation({
  args: {
    candidateId: v.id("candidates"),
    frameIds: v.array(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, { frameIds: args.frameIds });
    return null;
  },
});

export const setCandidateScores = mutation({
  args: {
    candidateId: v.id("candidates"),
    scores,
    critique: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, {
      scores: args.scores,
      status: "scored",
      ...(args.critique === undefined ? {} : { critique: args.critique }),
    });
    return null;
  },
});

/** The two highest scorers in a generation. They become the next generation's parents. */
export const markSurvivors = mutation({
  args: { candidateIds: v.array(v.id("candidates")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const id of args.candidateIds) {
      await ctx.db.patch(id, { survived: true });
    }
    return null;
  },
});
