"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRuns = exports.clearAll = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
/**
 * Wipes every run, generation and candidate. For clearing seed data before a
 * real run gets pinned — there is no auth on this, and that is fine for one day
 * on a throwaway deployment holding nothing but shader screenshots.
 */
exports.clearAll = (0, server_1.mutation)({
    args: {},
    returns: values_1.v.object({ runs: values_1.v.number(), generations: values_1.v.number(), candidates: values_1.v.number() }),
    handler: async (ctx) => {
        const candidates = await ctx.db.query("candidates").collect();
        const generations = await ctx.db.query("generations").collect();
        const runs = await ctx.db.query("runs").collect();
        for (const doc of [...candidates, ...generations, ...runs])
            await ctx.db.delete(doc._id);
        return {
            runs: runs.length,
            generations: generations.length,
            candidates: candidates.length,
        };
    },
});
/**
 * Every run with just enough detail to choose one to pin: how many rounds, how
 * the best score moved from round 1 to the last, and the winning strategy.
 *
 * Used by `scripts/pin.mjs` at 15:30, when what we want is the run with the
 * biggest visible gap between one-shot and the final round — that gap is the
 * thesis, and the pinned run is what a judge sees with nothing else running.
 */
exports.listRuns = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const runs = await ctx.db.query("runs").withIndex("by_createdAt").order("desc").collect();
        return Promise.all(runs.map(async (run) => {
            const generations = await ctx.db
                .query("generations")
                .withIndex("by_run", (q) => q.eq("runId", run._id))
                .collect();
            const candidates = await ctx.db
                .query("candidates")
                .withIndex("by_run", (q) => q.eq("runId", run._id))
                .collect();
            const ordered = [...generations].sort((a, b) => a.index - b.index);
            const first = ordered[0];
            const last = ordered[ordered.length - 1];
            const bestIn = (generationId) => candidates
                .filter((c) => c.generationId === generationId)
                .reduce((best, c) => Math.max(best, c.scores?.total ?? 0), 0);
            const winner = candidates.reduce((best, c) => ((c.scores?.total ?? 0) > (best?.scores?.total ?? 0) ? c : best), undefined);
            return {
                id: run._id,
                prompt: run.prompt,
                status: run.status,
                pinned: run.pinned === true,
                createdAt: run.createdAt,
                generations: ordered.length,
                candidates: candidates.length,
                failed: candidates.filter((c) => c.status === "compile_error" || c.status === "timeout").length,
                firstBest: first === undefined ? 0 : bestIn(first._id),
                lastBest: last === undefined ? 0 : bestIn(last._id),
                winner: winner?.strategy ?? null,
            };
        }));
    },
});
