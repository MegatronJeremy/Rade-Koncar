import {
  beginCancellable,
  cancelInFlight,
  compareGenerations,
  endCancellable,
  generateCandidates,
  mutateCandidates,
  rankGeneration,
  spend,
} from "./llm";
import { renderer, sink, mode } from "./sink";
import { rankingScore, scoreCandidate } from "./score";
import type * as store from "./store";
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
/* ------------------------------------------------------------------ *
 * Stopping
 *
 * A round holds every sandbox for minutes, and with one run at a time a
 * mistyped prompt blocks everyone until it finishes. Restarting the service
 * was the only remedy and it kills everyone else's work too.
 *
 * Checked before each candidate renders rather than only between rounds, so a
 * stop takes seconds instead of up to ninety. Knowing the run id is the
 * permission: a browser only ever knows its own.
 * ------------------------------------------------------------------ */

const stopping = new Set<string>();

export const requestStop = (runId: string): boolean => {
  stopping.add(runId);
  // Interrupt whatever is in flight rather than waiting for the next
  // checkpoint: writing six shaders and scoring them are the two longest
  // stretches, and neither had one inside it.
  cancelInFlight();
  return true;
};

export const isStopping = (runId: string): boolean => stopping.has(runId);

class Stopped extends Error {
  constructor() {
    super("stopped");
  }
}

const checkStop = (runId: string): void => {
  if (stopping.has(runId)) throw new Stopped();
};

export interface RunOptions {
  /** How many rounds this call performs. The server asks for one at a time. */
  readonly rounds?: number;
  /** Continue an existing run instead of starting one. */
  readonly resume?: string;
}

export async function runOnce(
  prompt: string,
  /** Called as soon as the run exists, so a caller can answer with its id. */
  onCreated?: (runId: string) => void,
  opts: RunOptions = {},
): Promise<store.RunId> {
  const out = sink();
  const rounds = opts.rounds ?? GENS;
  const runId = opts.resume ?? (await out.createRun(prompt));
  onCreated?.(runId);
  const render = await renderer();

  /*
   * Cleanup lives in a finally, and a signal skips it. Killing a run therefore
   * left its sandboxes allocated, which is the whole account quota, and left the
   * run marked running in Convex, which the UI prefers over the pinned one, so a
   * dead run held the public front page. Both happened, twice.
   *
   * once() guards against a second signal arriving mid-teardown, and the handler
   * is removed on the normal path so a long-lived server does not accumulate one
   * per run.
   */
  beginCancellable();
  let tearingDown = false;
  const onSignal = (sig: NodeJS.Signals): void => {
    if (tearingDown) return;
    tearingDown = true;
    console.log(`\n[${sig}] releasing sandboxes and marking the run failed`);
    void (async () => {
      await Promise.allSettled([render.dispose(), out.setRunStatus(runId, "failed")]);
      process.exit(130);
    })();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  let parents: Live[] = [];
  /** Best candidate of the run so far. Never dropped from the parent set. */
  let champion: Live | undefined;
  let firstBest: Live | undefined;
  let startGen = 1;

  try {
    /*
     * A resumed round rebuilds its parents from Convex rather than from memory.
     * Everything it needs is already stored: the sources, the critiques, the
     * scores and the survived flags. Rank is recomputed from the scores, since
     * only the plain total is persisted.
     */
    if (opts.resume !== undefined) {
      const stored = await out.getRun(runId);
      if (stored === null) throw new Error(`run ${runId} not found`);
      startGen = stored.generations.length + 1;

      const asLive = (c: store.StoredCandidate): Live => ({
        candidate: { strategy: c.strategy, source: c.source },
        index: c.index,
        id: c.id,
        total: c.scores?.total ?? 0,
        rank:
          c.scores === undefined || c.scores.flat
            ? 0
            : rankingScore(c.scores.palette, c.scores.motion, c.scores.subject),
        critique: c.critique ?? "",
        framePaths: [],
      });

      const all = stored.generations.flatMap((g) => g.candidates).map(asLive);
      champion = all.reduce<Live | undefined>(
        (best, c) => (best === undefined || c.rank > best.rank ? c : best),
        undefined,
      );
      firstBest = (stored.generations[0]?.candidates ?? []).map(asLive).reduce<Live | undefined>(
        (best, c) => (best === undefined || c.rank > best.rank ? c : best),
        undefined,
      );
      parents = all
        .filter((c) => stored.generations.some((g) => g.candidates.some((s) => s.id === c.id && s.survived)))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, SURVIVORS);
      if (parents.length === 0 && champion !== undefined) parents = [champion];
    }

    await out.setRunStatus(runId, "running");

    for (let gen = startGen; gen < startGen + rounds; gen++) {
      checkStop(runId);
      const generationId = await out.createGeneration(runId, gen);

      const candidates =
        parents.length === 0
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
          id: await out.createCandidate({
            runId, generationId, index: i, strategy: c.strategy, source: c.source,
            parentIds,
          }),
          total: 0,
          rank: 0,
          critique: "",
          framePaths: [],
        })),
      );

      // Every candidate renders, queued through the pool.
      await render.each(live, async (l, i, renderOne) => {
        {
          checkStop(runId);
          await out.setCandidateStatus(l.id, "rendering");
          try {
            const r = await renderOne(`g${gen}c${i}`, l.candidate.source);
            l.rendered = r;
            if (r.result.status === "ok") {
              await out.uploadFrames(l.id, r.png);
              await out.setCandidateStatus(l.id, "scoring");
            } else {
              await out.setCandidateStatus(l.id, r.result.status, r.result.log);
            }
          } catch (err) {
            await out.setCandidateStatus(l.id, "timeout", String(err).slice(0, 500));
          }
        }
      });

      checkStop(runId);
      // Score only what rendered. A failed shader is content, not an exception.
      await Promise.all(
        live.map(async (l) => {
          if (l.rendered?.result.status !== "ok") return;
          const { scores, critique, framePaths } = await scoreCandidate(prompt, l.rendered);
          l.total = scores.total;
          l.rank = scores.flat ? 0 : rankingScore(scores.palette, scores.motion, scores.subject);
          l.critique = critique;
          l.framePaths = framePaths;
          await out.setCandidateScores(l.id, scores, critique);
        }),
      );

      const survivors = pickSurvivors(await orderGeneration(prompt, live));
      if (gen === 1) firstBest = survivors[0];
      const contender = survivors[0];
      if (contender !== undefined && (champion === undefined || contender.rank > champion.rank)) {
        champion = contender;
      }
      parents = withChampion(champion, survivors);
      if (parents.length > 0) await out.markSurvivors(parents.map((p) => p.id));
      await out.setGenerationStatus(generationId, "done");

      console.log(
        `[gen ${gen}] ` +
          live.map((l) => `${l.candidate.strategy}=${l.total}`).join("  ") +
          `  spend=$${spend().toFixed(3)}`,
      );

      // Nothing survived, so there is nothing to mutate from. Stop with what we have.
      if (parents.length === 0) break;
    }

    // Only worth saying once there is a last round to compare against the first.
    if (startGen + rounds > GENS) await reportImprovement(prompt, firstBest, champion);
    await out.setRunStatus(runId, "done");
    return runId;
  } catch (err) {
    // A stop is an outcome, not a crash: the rounds already finished stay
    // readable, and the row reads "stopped" rather than throwing at the caller.
    await out.setRunStatus(runId, "failed");
    if (err instanceof Stopped || stopping.has(runId)) {
      console.log(`[run ${runId}] stopped`);
      return runId;
    }
    throw err;
  } finally {
    endCancellable();
    stopping.delete(runId);
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await render.dispose();
  }
}
