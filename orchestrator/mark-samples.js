// Flag the showcase runs as samples. Idempotent: re-running just re-flags.
//
//   node mark-samples.js            pick and flag
//   node mark-samples.js --list     show the choice, change nothing
//
// Needs runs.markSample deployed. Until then it exits saying so rather than
// half-doing the job.
process.loadEnvFile(require("node:path").resolve(__dirname, "..", ".env"));
const { ConvexHttpClient } = require("convex/browser");
const { anyApi } = require("convex/server");

// The four the demo showcases, in the order they should appear.
const SAMPLES = [
  "a candle flame flickering in the dark",
  "a black hole with a glowing accretion disk",
  "a single eye slowly blinking",
  "a flower blooming, petals opening",
];

/**
 * A prompt can have several finished runs and they are not equally good. The
 * candle has one that climbed 20 to 25 and another that opened at 24 and stayed
 * there; the climb is the thesis, so it wins. A pinned run beats everything,
 * since pinning was already a deliberate choice.
 */
const better = (a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? a : b;
  const climb = (r) => (r.lastBest ?? 0) - (r.firstBest ?? 0);
  if (climb(a) !== climb(b)) return climb(a) > climb(b) ? a : b;
  return a.createdAt > b.createdAt ? a : b;
};

(async () => {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL.replace(/\/+$/, ""));
  const all = await convex.query(anyApi.admin.listRuns, {});

  const chosen = new Map();
  for (const r of all) {
    if (r.status !== "done" || r.candidates === 0) continue;
    if (!SAMPLES.includes(r.prompt)) continue;
    const held = chosen.get(r.prompt);
    chosen.set(r.prompt, held === undefined ? r : better(held, r));
  }

  const listOnly = process.argv.includes("--list");
  let flagged = 0;

  for (const prompt of SAMPLES) {
    const r = chosen.get(prompt);
    if (r === undefined) {
      console.log(`  MISSING   ${prompt}`);
      continue;
    }
    const climb = `${r.firstBest} → ${r.lastBest}`;
    const dupes = all.filter((x) => x.prompt === prompt && x.status === "done").length;
    console.log(
      `  ${listOnly ? "would  " : "sample "}   ${prompt}\n` +
        `              ${r.generations} rounds, ${r.candidates} tiles, best ${climb}` +
        `${r.pinned ? ", pinned" : ""}${dupes > 1 ? `  (${dupes} finished runs, took the best climb)` : ""}`,
    );
    if (listOnly) continue;
    try {
      await convex.mutation(anyApi.runs.markSample, { runId: r.id, sample: true });
      flagged++;
    } catch (err) {
      console.error(`\n  markSample failed: ${err.message.split("\n")[0]}`);
      console.error("  deploy convex first:  cd web && npx convex dev --once");
      process.exit(1);
    }
  }

  if (!listOnly) console.log(`\n${flagged}/${SAMPLES.length} flagged as samples`);
})().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
