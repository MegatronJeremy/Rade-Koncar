import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { generationStatus } from "./schema";

export const createGeneration = mutation({
  args: { runId: v.id("runs"), index: v.number() },
  returns: v.id("generations"),
  handler: async (ctx, args) =>
    ctx.db.insert("generations", {
      runId: args.runId,
      index: args.index,
      status: "running",
    }),
});

export const setGenerationStatus = mutation({
  args: { generationId: v.id("generations"), status: generationStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, { status: args.status });
    return null;
  },
});
