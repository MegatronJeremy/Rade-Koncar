"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSurvivors = exports.setCandidateScores = exports.setCandidateFrames = exports.generateUploadUrl = exports.setCandidateStatus = exports.createCandidate = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const schema_1 = require("./schema");
/**
 * Everything here is called by the orchestrator as a candidate moves through
 * the pipeline. Status is written eagerly at every step — the UI subscribes to
 * it, so tiles change from queued to rendering to scored while the user watches,
 * and that is most of why a live run looks alive.
 */
exports.createCandidate = (0, server_1.mutation)({
    args: {
        runId: values_1.v.id("runs"),
        generationId: values_1.v.id("generations"),
        index: values_1.v.number(),
        strategy: values_1.v.string(),
        source: values_1.v.string(),
        /** The survivors this candidate was mutated from. Empty in generation 1. */
        parentIds: values_1.v.optional(values_1.v.array(values_1.v.id("candidates"))),
    },
    returns: values_1.v.id("candidates"),
    handler: async (ctx, args) => ctx.db.insert("candidates", {
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
exports.setCandidateStatus = (0, server_1.mutation)({
    args: {
        candidateId: values_1.v.id("candidates"),
        status: schema_1.candidateStatus,
        log: values_1.v.optional(values_1.v.string()),
    },
    returns: values_1.v.null(),
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
exports.generateUploadUrl = (0, server_1.mutation)({
    args: {},
    returns: values_1.v.string(),
    handler: async (ctx) => ctx.storage.generateUploadUrl(),
});
/** Three storage ids, t0 t1 t2 in order. */
exports.setCandidateFrames = (0, server_1.mutation)({
    args: {
        candidateId: values_1.v.id("candidates"),
        frameIds: values_1.v.array(values_1.v.id("_storage")),
    },
    returns: values_1.v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.candidateId, { frameIds: args.frameIds });
        return null;
    },
});
exports.setCandidateScores = (0, server_1.mutation)({
    args: {
        candidateId: values_1.v.id("candidates"),
        scores: schema_1.scores,
        critique: values_1.v.optional(values_1.v.string()),
    },
    returns: values_1.v.null(),
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
exports.markSurvivors = (0, server_1.mutation)({
    args: { candidateIds: values_1.v.array(values_1.v.id("candidates")) },
    returns: values_1.v.null(),
    handler: async (ctx, args) => {
        for (const id of args.candidateIds) {
            await ctx.db.patch(id, { survived: true });
        }
        return null;
    },
});
