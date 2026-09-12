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

/**
 * Best candidate, then the best one that took a different approach.
 *
 * Two survivors exist so that a leading approach turning out to be a dead end
 * still leaves something to fall back on. Taking the top two by score alone
 * loses that whenever the top two share a strategy, which is common once a
 * generation is already mutations of one parent: the population collapses to a
 * single lineage exactly when the second lineage is most needed.
 *
 * Falls back to plain top-two when every survivor candidate shares a strategy.
 */
function pickSurvivors(live: readonly Live[]): Live[] {
  const ranked = [...live].filter((l) => l.total > 0).sort((a, b) => b.total - a.total);
  const best = ranked[0];
  if (best === undefined) return [];

  const different = ranked.find((l) => l.candidate.strategy !== best.candidate.strategy);
  const second = different ?? ranked[1];
  return second === undefined ? [best] : [best, second].slice(0, SURVIVORS);
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

      parents = pickSurvivors(live);
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
