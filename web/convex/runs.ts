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

/** How far back to look for a run worth showing. Bounds the scan on a dead deployment. */
const RECENT_RUN_SCAN = 25;

/**
 * How long a run may sit in queued or running before it is treated as dead.
 * Writing the first six shaders alone takes around two minutes, and the longest
 * run measured took under twenty. A process killed mid-run leaves its row
 * "running" forever, so without this one abandoned row would hide the pinned
 * run from every later visitor.
 */
const IN_PROGRESS_MS = 20 * 60 * 1000;

/**
 * The newest run worth showing: one that has a candidate, or one still working
 * on its first.
 *
 * A run exists from createRun, and its first candidate only appears once the
 * model has written six shaders. Skipping candidate-less runs outright hid a
 * fresh run for those two minutes, so anyone who reloaded lost sight of the
 * prompt they had just sent.
 */
export const latestRun = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(RECENT_RUN_SCAN);

    const now = Date.now();
    for (const run of runs) {
      const working =
        (run.status === "queued" || run.status === "running") &&
        now - run.createdAt < IN_PROGRESS_MS;
      if (working) return hydrateRun(ctx, run);

      const candidate = await ctx.db
        .query("candidates")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .first();
      if (candidate !== null) return hydrateRun(ctx, run);
    }
    return null;
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

/** Flag or unflag a run as a showcase sample. Many runs may be samples. */
export const markSample = mutation({
  args: { runId: v.id("runs"), sample: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { sample: args.sample ?? true });
  },
});

/**
 * Every sample, newest first, hydrated. The gallery renders these before the
 * visitor has typed anything, and they are what the page shows when no
 * orchestrator is reachable.
 */
export const sampleRuns = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_sample", (q) => q.eq("sample", true))
      .order("desc")
      .collect();
    return Promise.all(runs.map((run) => hydrateRun(ctx, run)));
  },
});

export const runWithCandidates = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    return run === null ? null : hydrateRun(ctx, run);
  },
});
