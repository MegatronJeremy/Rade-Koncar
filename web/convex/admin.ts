import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Wipes every run, generation and candidate. For clearing seed data before a
 * real run gets pinned — there is no auth on this, and that is fine for one day
 * on a throwaway deployment holding nothing but shader screenshots.
 */
export const clearAll = mutation({
  args: {},
  returns: v.object({ runs: v.number(), generations: v.number(), candidates: v.number() }),
  handler: async (ctx) => {
    const candidates = await ctx.db.query("candidates").collect();
    const generations = await ctx.db.query("generations").collect();
    const runs = await ctx.db.query("runs").collect();
    for (const doc of [...candidates, ...generations, ...runs]) await ctx.db.delete(doc._id);
    return {
      runs: runs.length,
      generations: generations.length,
      candidates: candidates.length,
    };
  },
});
