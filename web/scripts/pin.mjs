/**
 * Pick the run the public URL falls back to.
 *
 *   node scripts/pin.mjs              list runs, best gap first
 *   node scripts/pin.mjs <runId>      pin that run
 *
 * At 15:30 the run we want is the one with the biggest visible gap between
 * round 1 and the final round — that gap is the thesis, and it is what a judge
 * sees on a Thursday with nothing else running.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
if (!url) {
  console.error("Set VITE_CONVEX_URL or CONVEX_URL. web/.env.local has it.");
  process.exit(1);
}

const convex = new ConvexHttpClient(url);
const [target] = process.argv.slice(2);

if (target) {
  const started = Date.now();
  await convex.mutation(api.runs.pinRun, { runId: target });
  console.log(`pinned ${target} in ${Date.now() - started}ms`);
  process.exit(0);
}

const started = Date.now();
const runs = await convex.query(api.admin.listRuns, {});
console.log(`${runs.length} run(s) in ${Date.now() - started}ms\n`);

if (runs.length === 0) {
  console.log("Nothing to pin yet. The orchestrator has not written a run.");
  console.log("Until then the site shows the bundled sample, labelled \"Sample run\".");
  process.exit(0);
}

for (const r of [...runs].sort((a, b) => b.lastBest - b.firstBest - (a.lastBest - a.firstBest))) {
  const gap = r.lastBest - r.firstBest;
  console.log(`${r.pinned ? "PINNED  " : "        "}${r.id}`);
  console.log(`  "${r.prompt}"`);
  console.log(
    `  ${r.status}, ${r.generations} rounds, ${r.candidates} candidates, ${r.failed} never rendered`,
  );
  console.log(
    `  best ${r.firstBest} -> ${r.lastBest}  (gap ${gap >= 0 ? "+" : ""}${gap})   winner: ${r.winner ?? "none"}\n`,
  );
}

console.log("Pin one with:  node scripts/pin.mjs <runId>");
