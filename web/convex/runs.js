"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithCandidates = exports.pinnedRun = exports.latestRun = exports.pinRun = exports.setRunStatus = exports.createRun = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const hydrate_1 = require("./hydrate");
const schema_1 = require("./schema");
/* ---------- mutations the orchestrator calls ---------- */
exports.createRun = (0, server_1.mutation)({
    args: {
        prompt: values_1.v.string(),
        mode: schema_1.runMode,
        steering: values_1.v.optional(values_1.v.string()),
        referenceId: values_1.v.optional(values_1.v.id("_storage")),
    },
    returns: values_1.v.id("runs"),
    handler: async (ctx, args) => ctx.db.insert("runs", {
        prompt: args.prompt,
        mode: args.mode,
        ...(args.steering === undefined ? {} : { steering: args.steering }),
        ...(args.referenceId === undefined ? {} : { referenceId: args.referenceId }),
        status: "queued",
        createdAt: Date.now(),
    }),
});
exports.setRunStatus = (0, server_1.mutation)({
    args: { runId: values_1.v.id("runs"), status: schema_1.runStatus },
    returns: values_1.v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.runId, { status: args.status });
        return null;
    },
});
/**
 * Flags the run the public URL falls back to when nothing is live. Only one run
 * is ever pinned, so this unpins whatever held it before — otherwise `pinnedRun`
 * silently depends on insertion order.
 */
exports.pinRun = (0, server_1.mutation)({
    args: { runId: values_1.v.id("runs") },
    returns: values_1.v.null(),
    handler: async (ctx, args) => {
        const alreadyPinned = await ctx.db
            .query("runs")
            .withIndex("by_pinned", (q) => q.eq("pinned", true))
            .collect();
        for (const run of alreadyPinned) {
            if (run._id !== args.runId)
                await ctx.db.patch(run._id, { pinned: false });
        }
        await ctx.db.patch(args.runId, { pinned: true });
        return null;
    },
});
/* ---------- queries the UI subscribes to ---------- */
/** The newest run, whatever its status. Hydrated: generations, candidates, frame URLs. */
exports.latestRun = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const run = await ctx.db.query("runs").withIndex("by_createdAt").order("desc").first();
        return run === null ? null : (0, hydrate_1.hydrateRun)(ctx, run);
    },
});
/** The saved demo run. This is what a judge sees on a Thursday with nothing running. */
exports.pinnedRun = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const run = await ctx.db
            .query("runs")
            .withIndex("by_pinned", (q) => q.eq("pinned", true))
            .order("desc")
            .first();
        return run === null ? null : (0, hydrate_1.hydrateRun)(ctx, run);
    },
});
exports.runWithCandidates = (0, server_1.query)({
    args: { runId: values_1.v.id("runs") },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId);
        return run === null ? null : (0, hydrate_1.hydrateRun)(ctx, run);
    },
});
