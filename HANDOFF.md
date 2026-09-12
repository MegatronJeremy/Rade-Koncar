# Shader Arena, hackathon handoff

One sentence: we don't generate pictures, we generate programs that draw them, and we let the model see what its program drew.

A fragment shader is a small program that runs per pixel per frame. LLMs write plausible GLSL and cannot tell which of six plausible programs actually renders as asked. We close that loop: generate six candidates, render each in its own sandbox, screenshot three frames, score the frames, keep the best two, mutate with the critique, repeat. The grid of candidates evolves on screen in real time.

Team: Vuk (harness), Pavle (orchestrator), Djordje (web). Each person owns one folder. Start with the bullet under your name in "Starting bullets".

## Repo layout

```
harness/       Vuk      harness.html, render.ts, Dockerfile, fixtures/, README.md
orchestrator/  Pavle    generate.ts, sandbox.ts, score.ts, loop.ts, server.ts
web/           Djordje  Convex project (convex/) + Vite React UI (src/) + Render config
prompts/       shared   codegen.md, rubric.md, mutation.md, demo-candidates.md, thesis-test.md
.env.example   shared   every variable listed, no values
```

Each folder has its own `package.json`. No workspace tooling.

## Contracts (frozen)

### 1. Harness

Command, run from `harness/`:

```
node render.js --in <path to .glsl> --out <dir>
```

Writes `<dir>/t0.png`, `<dir>/t1.png`, `<dir>/t2.png` (frames at t = 0 s, 1 s, 2 s, 256×256) and `<dir>/result.json`:

```ts
type HarnessStatus = "ok" | "compile_error" | "timeout";

interface HarnessResult {
  status: HarnessStatus;
  frames: string[];          // ["t0.png","t1.png","t2.png"] on ok, [] otherwise
  log: string;               // compiler info log on compile_error, empty on ok
  ms: { compile: number; frames: number[] };
}
```

Exit code 0 whenever `result.json` was written, including compile_error and timeout. Non-zero only if the harness itself failed (no browser, no page). Per-frame timeout 20 s.

The harness wraps the candidate source like this; candidates never include the wrapper:

```glsl
#version 300 es
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
out vec4 outColor;
// candidate source goes here; it must define
// void mainImage(out vec4 fragColor, in vec2 fragCoord)
void main() { mainImage(outColor, gl_FragCoord.xy); }
```

### 2. Candidate

What `generate()` returns, six per call:

```ts
interface Candidate {
  strategy: string;   // short label: "metaballs", "fbm threshold", "raymarched sdf", ...
  source: string;     // GLSL ES 3.00 body defining mainImage; uses only iTime and iResolution
}
```

Rules baked into the codegen prompt: Shadertoy conventions, no textures, no iChannel, no iMouse, no `#version` line, no `main()`, single self-contained function set. Anything that fails the signature check is discarded and regenerated.

### 3. Data model (Convex)

```
runs:        { prompt, mode: "text" | "reference", referenceId?, status: "queued" | "running" | "done" | "failed", steering?, createdAt }
generations: { runId, index, status: "running" | "done" }
candidates:  { runId, generationId, index, strategy, source,
               status: "queued" | "rendering" | "scoring" | "scored" | "compile_error" | "timeout",
               frameIds: Id<"_storage">[],        // 3 on success
               log?: string,                       // compiler log on compile_error
               scores?: { flat: boolean, motion: number, palette: number, subject: number, total: number },
               critique?: string,
               parentIds: Id<"candidates">[],
               survived: boolean }
```

Mutations the orchestrator calls: `createRun`, `createGeneration`, `createCandidate`, `setCandidateStatus`, `generateUploadUrl`, `setCandidateFrames`, `setCandidateScores`, `markSurvivors`, `setRunStatus`. Queries the UI subscribes to: `latestRun`, `runWithCandidates(runId)`.

Public mutations, no auth. It's a hackathon; the orchestrator holds no keys the client shouldn't see.

### 4. Scoring

Deterministic prefilter in the orchestrator, no model call:

- `flat`: standard deviation of luminance on t1 below 0.02 (0..1 scale) → `flat = true`, `total = 0`, skip vision.
- Motion: mean absolute pixel difference between t0 and t2 below 0.01 → `motion = 0` regardless of what vision says.
- Reference mode adds a colour-histogram distance to the reference image, folded into `palette`.

Vision (x.ai, image input) with the rubric in `prompts/rubric.md`, JSON out:

```ts
{ palette: 0-10, motion: 0-10, subject: 0-10, critique: "one line" }
```

`total = flat ? 0 : palette + motion + subject`. Thresholds are starting values; tune them against the fixtures, not against a theory.

### 5. Loop

`POP = 6`, `GENS = 3`, `SURVIVORS = 2`, `CANDIDATE_TIMEOUT_MS = 60000`. Six sandboxes created once per run and reused across generations. A candidate timeout marks that candidate and never fails the run. Mutation prompt (`prompts/mutation.md`) receives the original prompt, both survivor sources, both critiques, and the run's steering text if any, and asks for six children each with a strategy label.

## Stack and constraints

- x.ai: OpenAI-compatible chat completions. Model name comes from `XAI_MODEL`; check the console for the current vision-capable model, do not hardcode one.
- Daytona: TypeScript SDK. Verify the exact method names for create-from-snapshot, upload file, exec, download file in the SDK README before writing `sandbox.ts`. Snapshot name from `DAYTONA_SNAPSHOT`.
- Harness image: `Dockerfile` based on the official Playwright image. The image tag must match the Playwright version in `harness/package.json` exactly or Chromium won't be found.
- Chromium flags in the harness: `--use-angle=swiftshader --enable-unsafe-swiftshader`. Recent Chromium disables the SwiftShader WebGL fallback without the second flag and the failure looks like a broken shader.
- WebGL context created with `preserveDrawingBuffer: true`. Frames captured via `canvas.toDataURL()` after a single explicit `renderAt(t)` draw. No animation loop in the harness.
- Frames stored in Convex file storage via `generateUploadUrl`. Never base64 into documents.
- Orchestrator is a standalone Node process (`server.ts` exposes `POST /run { prompt, mode, steering? }`). It writes to Convex with the HTTP client. It does not live inside Convex actions.
- Fal.ai (reference mode only): one call at run start producing the reference still. Append "abstract, full-frame, seamless, no objects, no text, procedural texture" to the diffusion prompt. Photoreal scenes never converge.

Env (`.env.example`): `XAI_API_KEY`, `XAI_MODEL`, `DAYTONA_API_KEY`, `DAYTONA_SNAPSHOT`, `CONVEX_URL`, `FAL_KEY`, `ORCHESTRATOR_PORT`.

## Starting bullets

- **Vuk**: In `harness/`, build `harness.html` and `render.ts` so that `node render.js --in fixtures/good.glsl --out out/` produces three PNGs and a `result.json` matching contract 1, and `--in fixtures/bad.glsl` produces `status: "compile_error"` with the compiler log. Make `harness.html` also usable standalone in a browser tab with a textarea and a Run button, because Pavle needs that for the thesis test by 12:15. Then write the `Dockerfile` from the Playwright image and build the Daytona snapshot. Done when the same command works inside a sandbox created from that snapshot and `harness/README.md` contains the snapshot name and the exact command line. Target 13:00.

- **Pavle**: In `orchestrator/`, build `generate.ts` (prompt → six `Candidate`s via x.ai, signature check, one repair call with the log on compile_error) and `sandbox.ts` (`renderInSandbox(sandbox, source): Promise<HarnessResult>`) against a stub that copies the three fixture PNGs from `harness/fixtures/` and returns `ok`. At 12:15 at the latest, run the thesis test: six one-shot candidates for each prompt in `prompts/demo-candidates.md`, pasted into Vuk's standalone harness tab, count acceptable renders per prompt, write the counts to `prompts/thesis-test.md`. Then `loop.ts` and `server.ts`. Done when `POST /run` executes three generations end to end against the stub and every state change (queued, rendering, scoring, scored, survived) lands in Convex as it happens. Swap the stub for the real sandbox the moment the snapshot name appears in `harness/README.md`.

- **Djordje**: In `web/`, define the Convex schema from contract 3, the mutations and queries listed there including `generateUploadUrl`, and a grid page subscribed to `latestRun` that shows one tile per candidate (t1 frame, status, score, strategy label) with `compile_error` tiles showing the log text instead of an image, seeded with a fake run of three generations so it visibly works before anything real exists. Deploy to Render with a public URL. Done by 13:00 when a teammate opens the URL on a phone and sees the fake run.

## Second bullets (only after your first is done and checked in)

- **Vuk**: `score.ts` prefilter functions (flat, motion, histogram distance) as pure functions Pavle imports; `prompts/rubric.md`; `prompts/codegen.md` with a helper block (hash, value noise, fbm, palette function); run the three chosen demo prompts through generation 1 and fix whatever renders black; the winner view (harness embedded live, source beside it, edit, run, export).
- **Pavle**: real sandbox fan-out with reuse across generations, per-candidate timeout, scoring pipeline, mutation prompt, reference mode (Fal call, reference stored on the run, image attached to the vision call). If the Daytona concurrency limit is under six, decide by 13:30: batches or `POP = 4`.
- **Djordje**: tiles cycle through their three frames on a 500 ms timer; comparison view with generation 1 pinned left labelled "one shot" and the latest generation on the right; prompt box calling `POST /run`; reference image upload; survivors highlighted; critique on hover; phone check of everything.

## Demo prompts

Candidates, in `prompts/demo-candidates.md`. The thesis test picks the three where one-shot gets roughly two of six acceptable:

1. ink dropping into water, slow, black on paper white
2. rain on a night window with city bokeh behind it
3. stained glass window with the sun moving behind it
4. aurora over a dark ridge, slow, green to violet
5. molten metal cooling, dark crust forming, orange cracks
6. knitted wool texture slowly breathing
7. bioluminescent jellyfish pulsing in deep water
8. oil slick on wet asphalt shifting colours

Banned for the demo: lava lamp, plasma, plain gradients. One-shot gets those right and the loop looks like decoration.

## Timeline

- 11:30 scope frozen. No new ideas after this.
- 12:15 thesis test results written.
- 12:30 five minutes together: pick the three demo prompts; reference mode becomes core if one-shot scored five of six on everything.
- 13:00 gate: one screenshot out of one real sandbox visible in the grid at the public URL. If not, switch to one sandbox, one Chromium, six pages, and keep going. Decide at 13:00, not 14:00.
- 15:30 feature freeze: three generations end to end from the public URL on one demo prompt, one-shot column showing.
- 15:30 to 17:00: run the three demo prompts, pick the one with the biggest visible gap between generation 1 and 3, fix only that path, keep the best run in Convex for replay.
- 17:00 record. Prompt in, grid evolving, one-shot column against the final generation, click a compile-error tile, click the winner, change one constant live, resize the window, export. Two takes.

## Cut list, in order, if behind

1. Reference mode (if it stayed stretch)
2. Live editor (keep source display and a copy button)
3. Critique-driven mutation (seed a fresh generation with the two survivor sources)
4. `POP` 6 → 4
5. `GENS` 3 → 2

Never cut: the grid, the scoring, per-sandbox rendering, the one-shot column.

## Three answers to have ready

- Why Daytona: each candidate runs in its own browser process with a hard timeout, so one hung or OOMing shader cannot take down its siblings, and six render in parallel.
- Wouldn't the model do this one-shot: point at the left column. That is one-shot. The right column is three generations later.
- Isn't this image generation: it's code, not pixels. Edit a constant on camera, resize the window, export two kilobytes that run at any resolution forever.
