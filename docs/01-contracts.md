# Contracts (frozen)

Five contracts. They are the interfaces between three people working simultaneously. They do not change today. If one must change, stop and say so in the room — do not change it unilaterally.

## 1. Harness

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

**Exit code 0 whenever `result.json` was written**, including `compile_error` and `timeout`. Non-zero only if the harness itself failed — no browser, no page. A failed shader is a normal result in this product, not an exception.

Per-frame timeout 20 s.

Frames are written **as files**. They are never base64'd into JSON or into a Convex document.

### The GLSL wrapper

The harness wraps the candidate source. Candidates never include the wrapper:

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

## 2. Candidate

What `generate()` returns, six per call:

```ts
interface Candidate {
  strategy: string;   // short label: "metaballs", "fbm threshold", "raymarched sdf", ...
  source: string;     // GLSL ES 3.00 body defining mainImage; uses only iTime and iResolution
}
```

Rules baked into the codegen prompt: Shadertoy conventions, no textures, no `iChannel`, no `iMouse`, no `#version` line, no `main()`, single self-contained function set. Anything failing the signature check is discarded and regenerated.

## 3. Data model (Convex)

```
runs:        { prompt, mode: "text" | "reference", referenceId?,
               status: "queued" | "running" | "done" | "failed",
               steering?, createdAt, pinned?: boolean }

generations: { runId, index, status: "running" | "done" }

candidates:  { runId, generationId, index, strategy, source,
               status: "queued" | "rendering" | "scoring" | "scored"
                     | "compile_error" | "timeout",
               frameIds: Id<"_storage">[],        // 3 on success
               log?: string,                       // compiler log on compile_error
               scores?: { flat: boolean, motion: number, palette: number,
                          subject: number, total: number },
               critique?: string,
               parentIds: Id<"candidates">[],
               survived: boolean }
```

`pinned` on `runs` marks the cached demo run that the public URL falls back to. See `04-web-djordje.md`.

**Mutations** the orchestrator calls: `createRun`, `createGeneration`, `createCandidate`, `setCandidateStatus`, `generateUploadUrl`, `setCandidateFrames`, `setCandidateScores`, `markSurvivors`, `setRunStatus`, `pinRun`.

**Queries** the UI subscribes to: `latestRun`, `pinnedRun`, `runWithCandidates(runId)`.

Public mutations, no auth. It's a hackathon; the orchestrator holds no keys the client shouldn't see.

## 4. Scoring

Deterministic prefilter in the orchestrator, **no model call**:

- `flat`: standard deviation of luminance on `t1` below 0.02 (0..1 scale) → `flat = true`, `total = 0`, skip vision entirely.
- Motion: mean absolute pixel difference between `t0` and `t2` below 0.01 → `motion = 0` **regardless of what vision says**.
- Reference mode adds a colour-histogram distance to the reference image, folded into `palette`.

Vision (x.ai, image input) with the rubric in `prompts/rubric.md`, JSON out:

```ts
{ palette: 0-10, motion: 0-10, subject: 0-10, critique: "one line" }
```

`total = flat ? 0 : palette + motion + subject`.

The two axes a vision model is worst at — is it flat, is it moving — are pinned from pixel data and override the model. It only judges palette and subject, which it is good at.

Thresholds are starting values. **Tune them against the fixtures, not against a theory.**

Absolute scores may drift between generations. That is fine: survivor selection is within-generation, so only relative order inside a generation is load-bearing.

## 5. Loop

```
POP = 6
GENS = 3
SURVIVORS = 2
CANDIDATE_TIMEOUT_MS = 60000
```

Six sandboxes created **once per run** and reused across generations. A candidate timeout marks that candidate and never fails the run.

The mutation prompt (`prompts/mutation.md`) receives the original prompt, both survivor sources, both critiques, and the run's steering text if any, and asks for six children each with a strategy label.

## Environment

`.env.example` — every variable listed, no values:

```
XAI_API_KEY
XAI_MODEL
DAYTONA_API_KEY
DAYTONA_SNAPSHOT
CONVEX_URL
FAL_KEY
ORCHESTRATOR_PORT
VITE_CONVEX_URL
VITE_ORCHESTRATOR_URL
```

`VITE_ORCHESTRATOR_URL` is how the browser reaches `POST /run`. The orchestrator must send permissive CORS headers or the prompt box will fail in the browser while working fine from curl — budget five minutes for this, it is the classic afternoon time sink.

## Stack constraints

- **x.ai** — OpenAI-compatible chat completions. Model name from `XAI_MODEL`. Check the console for the current vision-capable model; **do not hardcode one**.
- **Daytona** — TypeScript SDK. Verify exact method names for create-from-snapshot, upload file, exec and download file in the SDK README before writing `sandbox.ts`. Snapshot name from `DAYTONA_SNAPSHOT`.
- **Harness image** — `Dockerfile` based on the official Playwright image. The image tag must match the Playwright version in `harness/package.json` **exactly** or Chromium won't be found. This is the most common way this setup fails, and the symptom looks like infrastructure rather than a version mismatch.
- **WebGL** — context created with `preserveDrawingBuffer: true`. Frames captured via `canvas.toDataURL()` after a single explicit `renderAt(t)` draw. **No animation loop in the harness** — never read a wall clock, or frames are not reproducible.
- **Convex** — frames stored in file storage via `generateUploadUrl`. Never base64 into documents.
- **Orchestrator** — a standalone Node process (`server.ts` exposes `POST /run { prompt, mode, steering? }`). It writes to Convex with the HTTP client. It does **not** live inside Convex actions. It is deployed, not run from a laptop — see `03-orchestrator-pavle.md`.
- **Fal.ai** (reference mode only) — one call at run start producing the reference still. Append `abstract, full-frame, seamless, no objects, no text, procedural texture` to the diffusion prompt. Photoreal scenes never converge.
