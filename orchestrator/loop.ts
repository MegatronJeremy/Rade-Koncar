import { compareGenerations, generateCandidates, mutateCandidates, rankGeneration, spend } from "./llm";
import { createPool, mapOverPool, poolSize, renderInSandbox } from "./sandbox";
import { rankingScore, scoreCandidate } from "./score";
import * as store from "./store";
import type { Candidate, Rendered } from "./types";

const GENS = Number(process.env.GENS ?? 3);
const SURVIVORS = 2;

interface Live {
  candidate: Candidate;
  /** Position in its generation, and the label the ranking call answers with. */
  index: number;
  id: store.CandidateId;
  rendered?: Rendered;
  total: number;
  /** Fallback ordering, subject weighted. Not the number shown in the UI. */
  rank: number;
  critique: string;
  framePaths: string[];
}

/**
 * Best candidate, then the best one that took a different approach.
 *
 * Two survivors exist so that a leading approach turning out to be a dead end
 * still leaves something to fall back on. Taking the top two in order loses
 * that whenever they share a strategy, which is common once a generation is
 * already mutations of one parent: the population collapses to a single lineage
 * exactly when the second lineage is most needed.
 *
 * Falls back to plain top two when every scoring candidate shares a strategy.
 */
function pickSurvivors(ordered: readonly Live[]): Live[] {
  const alive = ordered.filter((l) => l.total > 0);
  const best = alive[0];
  if (best === undefined) return [];

  const different = alive.find((l) => l.candidate.strategy !== best.candidate.strategy);
  const second = different ?? alive[1];
  return second === undefined ? [best] : [best, second].slice(0, SURVIVORS);
}

/**
 * Elitism: the best candidate seen in the whole run is always a parent.
 *
 * Without it a generation can lose the champion, and three of the first five
 * multi-round runs did: the flower reached 25 in round 2 and finished at 24,
 * the black hole 24 then 23. That costs twice. The loop throws away its own
 * best work, and the UI reports round 1 against the last round, so a run
 * advertises a smaller climb than it actually achieved.
 *
 * The champion takes one of the two slots and the current generation's best
 * takes the other, so a round that beats the record still replaces it and the
 * six children are never both bred from the same source. Diversity is preserved
 * by the mutation prompt, which spends two of its six on a fresh construction
 * regardless of the parents.
 */
function withChampion(champion: Live | undefined, survivors: Live[]): Live[] {
  if (champion === undefined) return survivors;
  const best = survivors[0];
  if (best === undefined) return [champion];
  if (best.id === champion.id || best.rank >= champion.rank) return survivors;
  return [champion, best].slice(0, SURVIVORS);
}

/**
 * Reorders `scored` by the labels the model returned.
 *
 * Null when the answer is not a permutation of the labels offered. Nothing
 * constrains the model to return one, and a partial order would silently drop
 * candidates out of selection, so an unusable answer is rejected whole rather
 * than half applied.
 */
export function applyRankOrder<T extends { index: number }>(
  order: readonly number[],
  scored: readonly T[],
): T[] | null {
  const byLabel = new Map(scored.map((l) => [l.index, l]));
  const seen = new Set<number>();
  const picked: T[] = [];
  for (const label of order) {
    const hit = byLabel.get(label);
    if (hit !== undefined && !seen.has(label)) {
      seen.add(label);
      picked.push(hit);
    }
  }
  return picked.length === scored.length ? picked : null;
}

/**
 * The generation in the judge's order, best first.
 *
 * The ranking call is advisory: a run must not fail because one model call came
 * back malformed. Anything unusable falls back to the weighted score, which is
 * the ordering that existed before ranking did.
 */
async function orderGeneration(prompt: string, live: readonly Live[]): Promise<Live[]> {
  const byScore = [...live].sort((a, b) => b.rank - a.rank);
  const scored = live.filter((l) => l.total > 0 && l.framePaths.length > 0);
  if (scored.length < 2) return byScore;

  try {
    const t0 = Date.now();
    const { order, reason } = await rankGeneration(
      prompt,
      scored.map((l) => ({ label: l.index, framePaths: l.framePaths })),
    );
    const picked = applyRankOrder(order, scored);
    if (picked === null) {
      console.log(`[rank] unusable order [${order.join(",")}] for ${scored.length} candidates, falling back to score`);
      return byScore;
    }
    console.log(`[rank] ${Date.now() - t0}ms  ${picked.map((l) => l.candidate.strategy).join(" > ")}  :: ${reason}`);
    // Anything the judge never saw, because it failed the prefilter, sorts last.
    return [...picked, ...byScore.filter((l) => !picked.includes(l))];
  } catch (err) {
    console.log(`[rank] failed, falling back to score: ${String(err).slice(0, 160)}`);
    return byScore;
  }
}

/**
 * Did the loop actually improve anything?
 *
 * Totals are not comparable between generations, so a generation 3 score below
 * generation 1's settles nothing either way. One direct comparison of the two
 * best does, and it is the claim the whole product rests on, so it is worth a
 * single extra call per run.
 *
 * Logged, not stored: a verdict field on `runs` is contract 3 and belongs to
 * whoever owns the schema.
 */
async function reportImprovement(prompt: string, first?: Live, last?: Live): Promise<void> {
  if (first === undefined || last === undefined || first === last) return;
  if (first.framePaths.length === 0 || last.framePaths.length === 0) return;
  try {
    const v = await compareGenerations(prompt, first.framePaths, last.framePaths);
    const verdict =
      v.better === "second" ? "IMPROVED" : v.better === "first" ? "REGRESSED" : "NO CHANGE";
    console.log(`[compare] ${verdict}  gen1 ${first.candidate.strategy} vs final ${last.candidate.strategy} :: ${v.reason}`);
  } catch (err) {
    console.log(`[compare] skipped: ${String(err).slice(0, 160)}`);
  }
}

/** One prompt, three generations, six candidates each. */
export async function runOnce(prompt: string): Promise<store.RunId> {
  const runId = await store.createRun(prompt);
  const pool = await createPool(poolSize());
  let parents: Live[] = [];
  /** Best candidate of the run so far. Never dropped from the parent set. */
  let champion: Live | undefined;
  let firstBest: Live | undefined;

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
          index: i,
          id: await store.createCandidate({
            runId, generationId, index: i, strategy: c.strategy, source: c.source,
            parentIds: gen === 1 ? [] : parentIds,
          }),
          total: 0,
          rank: 0,
          critique: "",
          framePaths: [],
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
          const { scores, critique, framePaths } = await scoreCandidate(prompt, l.rendered);
          l.total = scores.total;
          l.rank = scores.flat ? 0 : rankingScore(scores.palette, scores.motion, scores.subject);
          l.critique = critique;
          l.framePaths = framePaths;
          await store.setCandidateScores(l.id, scores, critique);
        }),
      );

      const survivors = pickSurvivors(await orderGeneration(prompt, live));
      if (gen === 1) firstBest = survivors[0];
      const contender = survivors[0];
      if (contender !== undefined && (champion === undefined || contender.rank > champion.rank)) {
        champion = contender;
      }
      parents = withChampion(champion, survivors);
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

    await reportImprovement(prompt, firstBest, champion);
    await store.setRunStatus(runId, "done");
    return runId;
  } catch (err) {
    await store.setRunStatus(runId, "failed");
    throw err;
  } finally {
    await pool.dispose();
  }
}
