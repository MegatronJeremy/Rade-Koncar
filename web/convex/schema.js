"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scores = exports.candidateStatus = exports.generationStatus = exports.runStatus = exports.runMode = void 0;
const server_1 = require("convex/server");
const values_1 = require("convex/values");
/**
 * Contract 3 in `docs/01-contracts.md`, transcribed. Frozen — if a field here
 * has to change, say so in the room first; Pavle writes against this.
 *
 * Three tables for three nesting levels: a run is one prompt, it has three
 * generations, each has six candidates.
 */
exports.runMode = values_1.v.union(values_1.v.literal("text"), values_1.v.literal("reference"));
exports.runStatus = values_1.v.union(values_1.v.literal("queued"), values_1.v.literal("running"), values_1.v.literal("done"), values_1.v.literal("failed"));
exports.generationStatus = values_1.v.union(values_1.v.literal("running"), values_1.v.literal("done"));
exports.candidateStatus = values_1.v.union(values_1.v.literal("queued"), values_1.v.literal("rendering"), values_1.v.literal("scoring"), values_1.v.literal("scored"), values_1.v.literal("compile_error"), values_1.v.literal("timeout"));
exports.scores = values_1.v.object({
    flat: values_1.v.boolean(),
    motion: values_1.v.number(),
    palette: values_1.v.number(),
    subject: values_1.v.number(),
    total: values_1.v.number(),
});
exports.default = (0, server_1.defineSchema)({
    runs: (0, server_1.defineTable)({
        prompt: values_1.v.string(),
        mode: exports.runMode,
        referenceId: values_1.v.optional(values_1.v.id("_storage")),
        status: exports.runStatus,
        steering: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        /** Marks the one saved demo run the public URL falls back to. */
        pinned: values_1.v.optional(values_1.v.boolean()),
    })
        .index("by_createdAt", ["createdAt"])
        .index("by_pinned", ["pinned"]),
    generations: (0, server_1.defineTable)({
        runId: values_1.v.id("runs"),
        index: values_1.v.number(),
        status: exports.generationStatus,
    }).index("by_run", ["runId", "index"]),
    candidates: (0, server_1.defineTable)({
        runId: values_1.v.id("runs"),
        generationId: values_1.v.id("generations"),
        index: values_1.v.number(),
        strategy: values_1.v.string(),
        source: values_1.v.string(),
        status: exports.candidateStatus,
        /** Three on success, empty otherwise. Never base64 into the document. */
        frameIds: values_1.v.array(values_1.v.id("_storage")),
        log: values_1.v.optional(values_1.v.string()),
        scores: values_1.v.optional(exports.scores),
        critique: values_1.v.optional(values_1.v.string()),
        parentIds: values_1.v.array(values_1.v.id("candidates")),
        survived: values_1.v.boolean(),
    })
        .index("by_run", ["runId"])
        .index("by_generation", ["generationId", "index"]),
});
