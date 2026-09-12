import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Contract 3 in `docs/01-contracts.md`, transcribed. Frozen — if a field here
 * has to change, say so in the room first; Pavle writes against this.
 *
 * Three tables for three nesting levels: a run is one prompt, it has three
 * generations, each has six candidates.
 */

export const runMode = v.union(v.literal("text"), v.literal("reference"));

export const runStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
);

export const generationStatus = v.union(v.literal("running"), v.literal("done"));

export const candidateStatus = v.union(
  v.literal("queued"),
  v.literal("rendering"),
  v.literal("scoring"),
  v.literal("scored"),
  v.literal("compile_error"),
  v.literal("timeout"),
);

export const scores = v.object({
  flat: v.boolean(),
  motion: v.number(),
  palette: v.number(),
  subject: v.number(),
  total: v.number(),
});

export default defineSchema({
  runs: defineTable({
    prompt: v.string(),
    mode: runMode,
    referenceId: v.optional(v.id("_storage")),
    status: runStatus,
    steering: v.optional(v.string()),
    createdAt: v.number(),
    /** Marks the one saved demo run the public URL falls back to. */
    pinned: v.optional(v.boolean()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_pinned", ["pinned"]),

  generations: defineTable({
    runId: v.id("runs"),
    index: v.number(),
    status: generationStatus,
  }).index("by_run", ["runId", "index"]),

  candidates: defineTable({
    runId: v.id("runs"),
    generationId: v.id("generations"),
    index: v.number(),
    strategy: v.string(),
    source: v.string(),
    status: candidateStatus,
    /** Three on success, empty otherwise. Never base64 into the document. */
    frameIds: v.array(v.id("_storage")),
    log: v.optional(v.string()),
    scores: v.optional(scores),
    critique: v.optional(v.string()),
    parentIds: v.array(v.id("candidates")),
    survived: v.boolean(),
  })
    .index("by_run", ["runId"])
    .index("by_generation", ["generationId", "index"]),
});
