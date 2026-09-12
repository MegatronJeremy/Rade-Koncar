/**
 * Pushes a run into Convex so the wiring can be checked against real data
 * before the orchestrator writes anything.
 *
 *   node scripts/seed.mjs          create a run
 *   node scripts/seed.mjs --clear  delete every run, generation and candidate
 *
 * Frames are Vuk's real fixture PNGs from harness/fixtures, uploaded through
 * generateUploadUrl exactly the way the orchestrator will. Every scored
 * candidate shares the same three frames — this is a smoke test, not the demo
 * run. The demo run is a real one, pinned at 15:30.
 */

import { readFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
if (!url) {
  console.error("Set VITE_CONVEX_URL or CONVEX_URL. web/.env.local has it.");
  process.exit(1);
}

const convex = new ConvexHttpClient(url);
const since = (t) => `${Date.now() - t}ms`;

const uploadFrames = async () => {
  const ids = [];
  for (const name of ["t0.png", "t1.png", "t2.png"]) {
    const bytes = await readFile(new URL(`../../harness/fixtures/${name}`, import.meta.url));
    const started = Date.now();
    const target = await convex.mutation(api.candidates.generateUploadUrl, {});
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: bytes,
    });
    if (!res.ok) throw new Error(`upload ${name} failed: ${res.status}`);
    const { storageId } = await res.json();
    console.log(`  uploaded ${name} (${bytes.length} bytes) in ${since(started)}`);
    ids.push(storageId);
  }
  return ids;
};

const GENERATIONS = [
  [
    { strategy: "layered sine bands", scores: [5, 4, 5], critique: "Reads as stripes, not a curtain.", survived: true },
    { strategy: "fbm threshold", scores: [4, 3, 4], critique: "Cloud-like rather than draped.", survived: true },
    { strategy: "raymarched sdf", fail: "compile_error" },
    { strategy: "radial gradient sweep", flat: true },
    { strategy: "value noise ridges", scores: [3, 3, 3], critique: "Static grain, barely any motion." },
    { strategy: "polar warp", fail: "timeout" },
  ],
  [
    { strategy: "curl noise veil", scores: [8, 7, 6], critique: "Curtain hangs vertically now.", survived: true },
    { strategy: "domain-warped fbm", scores: [7, 6, 6], critique: "Good drift, no ridge.", survived: true },
    { strategy: "stacked fbm curtains", scores: [6, 5, 5], critique: "Reads as fog." },
    { strategy: "layered sine bands + noise", scores: [6, 5, 4], critique: "Banding at the edges." },
    { strategy: "flow field streaks", fail: "compile_error" },
    { strategy: "ridged multifractal", scores: [5, 4, 4], critique: "Looks like static, not light." },
  ],
  [
    { strategy: "curl noise veil, vertical shear", scores: [9, 9, 8], critique: "Green-to-violet ramp lands.", survived: true },
    { strategy: "domain-warped fbm, violet ramp", scores: [9, 8, 8], critique: "Strong palette, slightly fast.", survived: true },
    { strategy: "curtain fbm + horizon glow", scores: [8, 8, 7], critique: "Upper curtain thins too early." },
    { strategy: "curl noise, higher octaves", scores: [8, 7, 7], critique: "Violet dominates the green." },
    { strategy: "layered curtains, slow drift", scores: [7, 7, 6], critique: "Curtains sit flat against the sky." },
    { strategy: "ridged fbm veil", scores: [7, 6, 5], critique: "More mist than aurora." },
  ],
];

const COMPILE_LOG = `ERROR: 0:4: 'iChannel0' : undeclared identifier
ERROR: 0:4: 'texture' : no matching overloaded function found`;

const SOURCE = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  fragColor = vec4(vec3(uv.y * 0.4, uv.y, 0.6), 1.0);
}`;

const clear = async () => {
  const started = Date.now();
  const removed = await convex.mutation(api.admin.clearAll, {});
  console.log(`cleared ${JSON.stringify(removed)} in ${since(started)}`);
};

const seed = async () => {
  const wall = Date.now();
  console.log("uploading frames...");
  const frameIds = await uploadFrames();

  const runId = await convex.mutation(api.runs.createRun, {
    prompt: "aurora over a dark ridge, slow, green to violet",
    mode: "text",
  });
  await convex.mutation(api.runs.setRunStatus, { runId, status: "running" });
  console.log(`run ${runId}`);

  let survivors = [];
  for (const [i, seeds] of GENERATIONS.entries()) {
    const generationId = await convex.mutation(api.generations.createGeneration, {
      runId,
      index: i + 1,
    });

    const ids = [];
    for (const [index, s] of seeds.entries()) {
      const candidateId = await convex.mutation(api.candidates.createCandidate, {
        runId,
        generationId,
        index,
        strategy: s.strategy,
        source: SOURCE,
        parentIds: survivors,
      });
      ids.push({ candidateId, seed: s });

      if (s.fail) {
        await convex.mutation(api.candidates.setCandidateStatus, {
          candidateId,
          status: s.fail,
          ...(s.fail === "compile_error" ? { log: COMPILE_LOG } : {}),
        });
        continue;
      }

      await convex.mutation(api.candidates.setCandidateFrames, { candidateId, frameIds });
      const [palette, motion, subject] = s.scores ?? [0, 0, 0];
      await convex.mutation(api.candidates.setCandidateScores, {
        candidateId,
        scores: s.flat
          ? { flat: true, motion: 0, palette: 0, subject: 0, total: 0 }
          : { flat: false, palette, motion, subject, total: palette + motion + subject },
        critique: s.flat ? "Uniform near-black. Nothing to judge." : s.critique,
      });
    }

    const won = ids.filter((c) => c.seed.survived).map((c) => c.candidateId);
    if (won.length > 0) await convex.mutation(api.candidates.markSurvivors, { candidateIds: won });
    await convex.mutation(api.generations.setGenerationStatus, { generationId, status: "done" });
    survivors = won;
    console.log(`  generation ${i + 1}: 6 candidates, ${won.length} survivors`);
  }

  await convex.mutation(api.runs.setRunStatus, { runId, status: "done" });
  await convex.mutation(api.runs.pinRun, { runId });
  console.log(`done in ${since(wall)} — run pinned`);
};

await (process.argv.includes("--clear") ? clear() : seed());
