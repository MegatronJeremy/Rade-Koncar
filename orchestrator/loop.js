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
exports.runOnce = runOnce;
const llm_1 = require("./llm");
const sandbox_1 = require("./sandbox");
const score_1 = require("./score");
const store = __importStar(require("./store"));
const GENS = Number(process.env.GENS ?? 3);
const SURVIVORS = 2;
/** One prompt, three generations, six candidates each. */
async function runOnce(prompt) {
    const runId = await store.createRun(prompt);
    const pool = await (0, sandbox_1.createPool)((0, sandbox_1.poolSize)());
    let parents = [];
    try {
        await store.setRunStatus(runId, "running");
        for (let gen = 1; gen <= GENS; gen++) {
            const generationId = await store.createGeneration(runId, gen);
            const candidates = gen === 1
                ? await (0, llm_1.generateCandidates)(prompt)
                : await (0, llm_1.mutateCandidates)(prompt, parents.map((p) => ({ source: p.candidate.source, critique: p.critique, total: p.total })));
            const parentIds = parents.map((p) => p.id);
            const live = await Promise.all(candidates.map(async (c, i) => ({
                candidate: c,
                id: await store.createCandidate({
                    runId, generationId, index: i, strategy: c.strategy, source: c.source,
                    parentIds: gen === 1 ? [] : parentIds,
                }),
                total: 0,
                critique: "",
            })));
            // Every candidate renders, queued through the pool.
            await (0, sandbox_1.mapOverPool)(pool, live, async (box, l, i) => {
                {
                    await store.setCandidateStatus(l.id, "rendering");
                    try {
                        const r = await (0, sandbox_1.renderInSandbox)(box, `g${gen}c${i}`, l.candidate.source);
                        l.rendered = r;
                        if (r.result.status === "ok") {
                            await store.uploadFrames(l.id, r.png);
                            await store.setCandidateStatus(l.id, "scoring");
                        }
                        else {
                            await store.setCandidateStatus(l.id, r.result.status, r.result.log);
                        }
                    }
                    catch (err) {
                        await store.setCandidateStatus(l.id, "timeout", String(err).slice(0, 500));
                    }
                }
            });
            // Score only what rendered. A failed shader is content, not an exception.
            await Promise.all(live.map(async (l) => {
                if (l.rendered?.result.status !== "ok")
                    return;
                const { scores, critique } = await (0, score_1.scoreCandidate)(prompt, l.rendered);
                l.total = scores.total;
                l.critique = critique;
                await store.setCandidateScores(l.id, scores, critique);
            }));
            const ranked = [...live].sort((a, b) => b.total - a.total);
            parents = ranked.slice(0, SURVIVORS).filter((l) => l.total > 0);
            if (parents.length > 0)
                await store.markSurvivors(parents.map((p) => p.id));
            await store.setGenerationStatus(generationId, "done");
            console.log(`[gen ${gen}] ` +
                live.map((l) => `${l.candidate.strategy}=${l.total}`).join("  ") +
                `  spend=$${(0, llm_1.spend)().toFixed(3)}`);
            // Nothing survived, so there is nothing to mutate from. Stop with what we have.
            if (parents.length === 0)
                break;
        }
        await store.setRunStatus(runId, "done");
        return runId;
    }
    catch (err) {
        await store.setRunStatus(runId, "failed");
        throw err;
    }
    finally {
        await pool.dispose();
    }
}
