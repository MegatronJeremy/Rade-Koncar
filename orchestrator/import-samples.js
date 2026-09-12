// Put exported samples back into Convex.
//
//   node import-samples.js --list          what the backup holds
//   node import-samples.js --yes           restore every sample
//   node import-samples.js --yes <dir>     restore one
//
// Creates new runs; it never overwrites. Frame bytes are re-uploaded because
// storage urls are signed and expire, so the restored run gets fresh ids.
process.loadEnvFile(require("node:path").resolve(__dirname, "..", ".env"));
const { ConvexHttpClient } = require("convex/browser");
const { anyApi } = require("convex/server");
const { readFileSync, readdirSync, existsSync } = require("node:fs");
const { join, resolve } = require("node:path");

const OUT = resolve(__dirname, "..", "experiments", "samples-backup");

(async () => {
  if (!existsSync(OUT)) {
    console.error("no backup at experiments/samples-backup; run export-samples.js first");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith("--"));
  const dirs = readdirSync(OUT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (only === undefined || d.name === only))
    .map((d) => d.name);

  if (!args.includes("--yes")) {
    for (const d of dirs) {
      const r = JSON.parse(readFileSync(join(OUT, d, "run.json"), "utf8"));
      const tiles = r.generations.reduce((n, g) => n + g.candidates.length, 0);
      console.log(`  ${r.generations.length} rounds  ${tiles} tiles  ${r.pinned ? "pinned  " : "        "}${r.prompt}`);
    }
    console.log("\npass --yes to restore");
    return;
  }

  const convex = new ConvexHttpClient(process.env.CONVEX_URL.replace(/\/+$/, ""));

  for (const d of dirs) {
    const r = JSON.parse(readFileSync(join(OUT, d, "run.json"), "utf8"));
    const runId = await convex.mutation(anyApi.runs.createRun, { prompt: r.prompt, mode: r.mode });

    for (const g of r.generations) {
      const generationId = await convex.mutation(anyApi.generations.createGeneration, {
        runId,
        index: g.index,
      });
      const survivors = [];
      for (const c of g.candidates) {
        const candidateId = await convex.mutation(anyApi.candidates.createCandidate, {
          runId,
          generationId,
          index: c.index,
          strategy: c.strategy,
          source: c.source,
        });

        const frameIds = [];
        for (const name of c.frames) {
          const url = await convex.mutation(anyApi.candidates.generateUploadUrl, {});
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: new Uint8Array(readFileSync(join(OUT, d, name))),
          });
          const { storageId } = await res.json();
          frameIds.push(storageId);
        }
        if (frameIds.length > 0) {
          await convex.mutation(anyApi.candidates.setCandidateFrames, { candidateId, frameIds });
        }
        if (c.scores !== null) {
          await convex.mutation(anyApi.candidates.setCandidateScores, {
            candidateId,
            scores: c.scores,
            critique: c.critique,
          });
        } else {
          await convex.mutation(anyApi.candidates.setCandidateStatus, {
            candidateId,
            status: c.status,
            log: c.log,
          });
        }
        if (c.survived) survivors.push(candidateId);
      }
      if (survivors.length > 0) {
        await convex.mutation(anyApi.candidates.markSurvivors, { candidateIds: survivors });
      }
      await convex.mutation(anyApi.generations.setGenerationStatus, { generationId, status: g.status });
    }

    await convex.mutation(anyApi.runs.setRunStatus, { runId, status: r.status });
    await convex.mutation(anyApi.runs.markSample, { runId, sample: true });
    if (r.pinned) await convex.mutation(anyApi.runs.pinRun, { runId });
    console.log(`  restored ${r.generations.length} rounds  ${r.prompt}  -> ${runId}`);
  }
})().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
