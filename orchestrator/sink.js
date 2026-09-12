"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sink = exports.mode = void 0;
exports.renderer = renderer;
/**
 * Where a run's results go, and where its shaders render.
 *
 * `convex` is the deployed path: sandboxes for isolation, Convex so the UI can
 * watch. `local` renders on this machine and writes to experiments/, touching
 * nothing shared. Local is the default for the CLI, because an iteration that
 * used the deployed path took both Daytona sandboxes and the front page with
 * it for the eight minutes it ran.
 */
const node_child_process_1 = require("node:child_process");
const local = __importStar(require("./local"));
const env_1 = require("./env");
const sandbox_1 = require("./sandbox");
const convex = __importStar(require("./store"));
const mode = () => ((0, env_1.opt)("RUN_MODE", "local") === "convex" ? "convex" : "local");
exports.mode = mode;
const gitSha = () => {
    try {
        return (0, node_child_process_1.execFileSync)("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    }
    catch {
        return "unknown";
    }
};
const localSink = () => {
    let runId = "";
    return {
        createRun: async (prompt) => {
            runId = local.createRunLocal(prompt, (0, env_1.opt)("CLAUDE_CLI_MODEL", "claude-sonnet-5"), gitSha());
            return runId;
        },
        setRunStatus: async () => undefined,
        createGeneration: async (id, index) => local.createGenerationLocal(id, index),
        setGenerationStatus: async () => undefined,
        createCandidate: async (a) => local.createCandidateLocal(a.runId, a.generationId, a.index, a.strategy, a.source),
        setCandidateStatus: async (id, status, log) => local.setCandidateStatusLocal(id, status, log),
        uploadFrames: async (id, png) => local.uploadFramesLocal(id, png),
        setCandidateScores: async (id, scores, critique) => local.setCandidateScoresLocal(id, scores, critique),
        markSurvivors: async (ids) => local.markSurvivorsLocal(ids),
        where: (id) => local.localRunPath(id),
    };
};
const convexSink = () => ({
    createRun: (prompt) => convex.createRun(prompt),
    setRunStatus: async (id, s) => {
        await convex.setRunStatus(id, s);
    },
    createGeneration: (id, index) => convex.createGeneration(id, index),
    setGenerationStatus: async (id, s) => {
        await convex.setGenerationStatus(id, s);
    },
    createCandidate: (a) => convex.createCandidate(a),
    setCandidateStatus: async (id, status, log) => {
        await convex.setCandidateStatus(id, status, log);
    },
    uploadFrames: (id, png) => convex.uploadFrames(id, png),
    setCandidateScores: async (id, scores, critique) => {
        await convex.setCandidateScores(id, scores, critique);
    },
    markSurvivors: async (ids) => {
        await convex.markSurvivors(ids);
    },
    where: () => "the live site",
});
const sink = () => ((0, exports.mode)() === "convex" ? convexSink() : localSink());
exports.sink = sink;
async function renderer() {
    if ((0, exports.mode)() !== "convex") {
        const render = async (id, source) => local.renderLocal(id, source);
        return {
            each: async (items, work) => {
                for (const [i, item] of items.entries())
                    await work(item, i, render);
            },
            dispose: async () => undefined,
        };
    }
    const pool = await (0, sandbox_1.createPool)((0, sandbox_1.poolSize)());
    return {
        each: (items, work) => (0, sandbox_1.mapOverPool)(pool, items, (box, item, i) => work(item, i, (id, source) => (0, sandbox_1.renderInSandbox)(box, id, source))),
        dispose: () => pool.dispose(),
    };
}
