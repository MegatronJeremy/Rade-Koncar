import { generateCandidates, mutateCandidates, spend } from "./llm";
import { createPool, mapOverPool, poolSize, renderInSandbox } from "./sandbox";
import { scoreCandidate } from "./score";
import * as store from "./store";
import type { Candidate, Rendered } from "./types";

const GENS = Number(process.env.GENS ?? 3);
const SURVIVORS = 2;

interface Live {
  candidate: Candidate;
  id: store.CandidateId;
  rendered?: Rendered;
  total: number;
  critique: string;
}

/** One prompt, three generations, six candidates each. */
export async function runOnce(prompt: string): Promise<store.RunId> {
  const runId = await store.createRun(prompt);
  const pool = await createPool(poolSize());
  let parents: Live[] = [];

  try {
    await store.setRunStatus(runId, "running");

    for (let gen = 1; gen <= GENS; gen++) {
      const generationId = await store.createGeneration(runId, gen);

      const candidates =
        gen === 1
          ? await generateCandidates(prompt)
          : await mutateCandidates(
              prompt,
              parents.map((p) => ({ source: p.candidate.source, critique: p.critique, total: p.total })),
            );

      const parentIds = parents.map((p) => p.id);
      const live: Live[] = await Promise.all(
        candidates.map(async (c, i) => ({
          candidate: c,
          id: await store.createCandidate({
            runId, generationId, index: i, strategy: c.strategy, source: c.source,
            parentIds: gen === 1 ? [] : parentIds,
          }),
          total: 0,
          critique: "",
        })),
      );

      // Every candidate renders, queued through the pool.
      await mapOverPool(pool, live, async (box, l, i) => {
        {
          await store.setCandidateStatus(l.id, "rendering");
          try {
            const r = await renderInSandbox(box, `g${gen}c${i}`, l.candidate.source);
            l.rendered = r;
            if (r.result.status === "ok") {
              await store.uploadFrames(l.id, r.png);
              await store.setCandidateStatus(l.id, "scoring");
            } else {
              await store.setCandidateStatus(l.id, r.result.status, r.result.log);
            }
          } catch (err) {
            await store.setCandidateStatus(l.id, "timeout", String(err).slice(0, 500));
          }
        }
      });

      // Score only what rendered. A failed shader is content, not an exception.
      await Promise.all(
        live.map(async (l) => {
          if (l.rendered?.result.status !== "ok") return;
          const { scores, critique } = await scoreCandidate(prompt, l.rendered);
          l.total = scores.total;
          l.critique = critique;
          await store.setCandidateScores(l.id, scores, critique);
        }),
      );

      const ranked = [...live].sort((a, b) => b.total - a.total);
      parents = ranked.slice(0, SURVIVORS).filter((l) => l.total > 0);
      if (parents.length > 0) await store.markSurvivors(parents.map((p) => p.id));
      await store.setGenerationStatus(generationId, "done");

      console.log(
        `[gen ${gen}] ` +
          live.map((l) => `${l.candidate.strategy}=${l.total}`).join("  ") +
          `  spend=$${spend().toFixed(3)}`,
      );

      // Nothing survived, so there is nothing to mutate from. Stop with what we have.
      if (parents.length === 0) break;
    }

    await store.setRunStatus(runId, "done");
    return runId;
  } catch (err) {
    await store.setRunStatus(runId, "failed");
    throw err;
  } finally {
    await pool.dispose();
  }
}
