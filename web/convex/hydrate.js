"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateRun = void 0;
/**
 * Turns stored documents into the shape the UI renders.
 *
 * The only real work is resolving `frameIds` (storage ids) into URLs the
 * browser can put in an `<img src>`. Everything else is a rename of `_id` to
 * `id`, so `src/types.ts` and this file describe the same thing.
 */
const hydrateCandidate = async (ctx, doc) => {
    const urls = await Promise.all(doc.frameIds.map((id) => ctx.storage.getUrl(id)));
    return {
        id: doc._id,
        generationId: doc.generationId,
        index: doc.index,
        strategy: doc.strategy,
        source: doc.source,
        status: doc.status,
        // A storage id can resolve to null if the file was deleted; drop those
        // rather than handing the UI a broken src.
        frameUrls: urls.filter((url) => url !== null),
        log: doc.log,
        scores: doc.scores,
        critique: doc.critique,
        parentIds: doc.parentIds,
        survived: doc.survived,
    };
};
const hydrateRun = async (ctx, run) => {
    const generationDocs = await ctx.db
        .query("generations")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
    const generations = await Promise.all(generationDocs
        .sort((a, b) => a.index - b.index)
        .map(async (generation) => {
        const candidateDocs = await ctx.db
            .query("candidates")
            .withIndex("by_generation", (q) => q.eq("generationId", generation._id))
            .collect();
        return {
            id: generation._id,
            index: generation.index,
            status: generation.status,
            candidates: await Promise.all(candidateDocs
                .sort((a, b) => a.index - b.index)
                .map((candidate) => hydrateCandidate(ctx, candidate))),
        };
    }));
    return {
        id: run._id,
        prompt: run.prompt,
        mode: run.mode,
        status: run.status,
        steering: run.steering,
        createdAt: run.createdAt,
        pinned: run.pinned === true,
        generations,
    };
};
exports.hydrateRun = hydrateRun;
