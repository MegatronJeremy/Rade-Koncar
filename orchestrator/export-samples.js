// Copy every sample run out of Convex to disk, frames included.
//
//   node export-samples.js
//
// The samples are what the site is built around and they live in exactly one
// place: a Convex deployment whose clearAll mutation is public. Re-running the
// four costs about forty minutes and produces different shaders. This costs two
// minutes and makes a wipe recoverable. Read-only against Convex.
process.loadEnvFile(require("node:path").resolve(__dirname, "..", ".env"));
const { ConvexHttpClient } = require("convex/browser");
const { anyApi } = require("convex/server");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const OUT = resolve(__dirname, "..", "experiments", "samples-backup");

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

(async () => {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL.replace(/\/+$/, ""));
  const samples = await convex.query(anyApi.runs.sampleRuns, {});
  if (samples.length === 0) {
    console.error("no samples to export");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  const index = [];
  for (const run of samples) {
    const dir = join(OUT, slug(run.prompt));
    mkdirSync(dir, { recursive: true });
    let frames = 0;

    // Frames are rewritten without their storage urls: those are signed and
    // expire, so an import re-uploads the bytes and gets new ids.
    const generations = [];
    for (const g of run.generations) {
      const candidates = [];
      for (const c of g.candidates) {
        const files = [];
        for (const [i, url] of c.frameUrls.entries()) {
          const res = await fetch(url);
          if (!res.ok) continue;
          const name = `${g.index}-${c.index}-t${i}.png`;
          writeFileSync(join(dir, name), Buffer.from(await res.arrayBuffer()));
          files.push(name);
          frames++;
        }
        candidates.push({
          index: c.index,
          strategy: c.strategy,
          source: c.source,
          status: c.status,
          log: c.log ?? "",
          scores: c.scores ?? null,
          critique: c.critique ?? "",
          survived: c.survived === true,
          frames: files,
        });
      }
      generations.push({ index: g.index, status: g.status, candidates });
    }

    const record = {
      prompt: run.prompt,
      mode: run.mode,
      status: run.status,
      pinned: run.pinned === true,
      createdAt: run.createdAt,
      generations,
    };
    writeFileSync(join(dir, "run.json"), JSON.stringify(record, null, 2));
    index.push({ dir: slug(run.prompt), prompt: run.prompt, rounds: generations.length, frames });
    console.log(`  ${String(frames).padStart(3)} frames  ${generations.length} rounds  ${run.prompt}`);
  }

  writeFileSync(
    join(OUT, "index.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), samples: index }, null, 2),
  );
  console.log(`\n${index.length} samples -> experiments/samples-backup`);
})().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
