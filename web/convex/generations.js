"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGenerationStatus = exports.createGeneration = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const schema_1 = require("./schema");
exports.createGeneration = (0, server_1.mutation)({
    args: { runId: values_1.v.id("runs"), index: values_1.v.number() },
    returns: values_1.v.id("generations"),
    handler: async (ctx, args) => ctx.db.insert("generations", {
        runId: args.runId,
        index: args.index,
        status: "running",
    }),
});
exports.setGenerationStatus = (0, server_1.mutation)({
    args: { generationId: values_1.v.id("generations"), status: schema_1.generationStatus },
    returns: values_1.v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.generationId, { status: args.status });
        return null;
    },
});
