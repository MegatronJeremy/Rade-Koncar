import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hydrateRun } from "./hydrate";
import { runMode, runStatus } from "./schema";

/* ---------- mutations the orchestrator calls ---------- */

export const createRun = mutation({
  args: {
    prompt: v.string(),
    mode: runMode,
    steering: v.optional(v.string()),
    referenceId: v.optional(v.id("_storage")),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) =>
    ctx.db.insert("runs", {
      prompt: args.prompt,
      mode: args.mode,
      ...(args.steering === undefined ? {} : { steering: args.steering }),
      ...(args.referenceId === undefined ? {} : { referenceId: args.referenceId }),
      status: "queued",
      createdAt: Date.now(),
    }),
});

export const setRunStatus = mutation({
  args: { runId: v.id("runs"), status: runStatus },
  returns: v.null(),
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
export const pinRun = mutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const alreadyPinned = await ctx.db
      .query("runs")
      .withIndex("by_pinned", (q) => q.eq("pinned", true))
      .collect();

    for (const run of alreadyPinned) {
      if (run._id !== args.runId) await ctx.db.patch(run._id, { pinned: false });
    }

    await ctx.db.patch(args.runId, { pinned: true });
    return null;
  },
});

/* ---------- queries the UI subscribes to ---------- */

/** The newest run, whatever its status. Hydrated: generations, candidates, frame URLs. */
export const latestRun = query({
  args: {},
  handler: async (ctx) => {
    const run = await ctx.db.query("runs").withIndex("by_createdAt").order("desc").first();
    return run === null ? null : hydrateRun(ctx, run);
  },
});

/** The saved demo run. This is what a judge sees on a Thursday with nothing running. */
export const pinnedRun = query({
  args: {},
  handler: async (ctx) => {
    const run = await ctx.db
      .query("runs")
      .withIndex("by_pinned", (q) => q.eq("pinned", true))
      .order("desc")
      .first();
    return run === null ? null : hydrateRun(ctx, run);
  },
});

export const runWithCandidates = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    return run === null ? null : hydrateRun(ctx, run);
  },
});
