# Contracts (frozen)

## What this file is for

Three people build three folders at the same time. These five interfaces are where the folders meet. They are written down **before** anyone codes so that nobody has to wait for anybody, and so that when the pieces meet at 13:00 they fit.

**They do not change today.** If you believe one must change, stop and say so in the room. Changing one alone breaks someone else's work silently, and they will not find out until the parts are joined — which is the worst possible moment.

If any of the graphics terms below are unfamiliar, read [`00-primer.md`](00-primer.md) first.

---

## 1. Harness — how a shader becomes three PNGs

**Who provides it:** Vuk. **Who consumes it:** Pavle.

The harness is a command-line program. Give it a file containing shader code, get back screenshots.

```
node render.js --in <path to .glsl> --out <dir>
```

It writes into `<dir>`:

- `t0.png`, `t1.png`, `t2.png` — the shader rendered at 0, 1 and 2 seconds, 256×256
- `result.json` — what happened

```ts
type HarnessStatus = "ok" | "compile_error" | "timeout";

interface HarnessResult {
  status: HarnessStatus;
  frames: string[];          // ["t0.png","t1.png","t2.png"] on ok, [] otherwise
  log: string;               // compiler error text on compile_error, empty on ok
  ms: { compile: number; frames: number[] };
}
```

Three outcomes, and **two of them are normal**:

| Status | Means | How often |
|---|---|---|
| `ok` | It compiled and we have three frames | Most of the time, eventually |
| `compile_error` | The model wrote invalid GLSL. `log` has the compiler's message | Common in generation 1 |
| `timeout` | The shader ran but never finished a frame — usually an unbounded loop | Occasional, and we demo it |

**Exit code 0 whenever `result.json` was written**, including for `compile_error` and `timeout`. Non-zero *only* if the harness itself broke — no browser, no page.

This distinction matters: a failed shader is a **result** in this product, not an exception. Failed candidates get shown in the grid as red tiles with the compiler message. They are content. An orchestrator that treats `compile_error` as a crash will fall over constantly in generation 1.

Per-frame timeout is 20 s, so a fully hung candidate takes 60 s and no more.

Frames are written as **files**. They are never base64-encoded into JSON or into a database document — three PNGs inline would be roughly a megabyte of text per candidate, and Convex documents have a size limit we would spend the afternoon fighting.

### The GLSL wrapper

The model writes only a `mainImage` function. The harness wraps it in everything else:

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

Candidates never include this wrapper. If a candidate contains `#version` or its own `main()`, it is malformed and gets regenerated — that check lives in `generate.ts`.

---

## 2. Candidate — what the model returns

**Who provides it:** Pavle's `generate.ts`. **Who consumes it:** the harness, and the UI.

Six of these per call:

```ts
interface Candidate {
  strategy: string;   // short label: "metaballs", "fbm threshold", "raymarched sdf", ...
  source: string;     // GLSL ES 3.00 defining mainImage; uses only iTime and iResolution
}
```

**Why `strategy` exists.** It is a two-or-three-word label for the approach taken. It costs nothing to ask for and it tells us instantly whether the six candidates are genuinely six different ideas or the same idea six times. If a generation comes back with six identical strategies, the codegen prompt needs more diversity pressure — and without the label you would not notice until you had squinted at six similar images.

Rules baked into the codegen prompt: Shadertoy conventions, no textures, no `iChannel`, no `iMouse`, no `#version` line, no `main()`, one self-contained set of functions. Anything failing the signature check is discarded and regenerated.

**Why no textures or `iChannel`:** those pull in external image inputs, which would need us to ship image files into the sandbox and give the model a way to reference them. Pure procedural shaders need nothing but the code.

---

## 3. Data model (Convex)

**Who provides it:** Djordje. **Who consumes it:** Pavle writes, the UI reads.

```
runs:        { prompt, mode: "text" | "reference", referenceId?,
               status: "queued" | "running" | "done" | "failed",
               steering?, createdAt, pinned?: boolean }

generations: { runId, index, status: "running" | "done" }

candidates:  { runId, generationId, index, strategy, source,
               status: "queued" | "rendering" | "scoring" | "scored"
                     | "compile_error" | "timeout",
               frameIds: Id<"_storage">[],        // 3 on success
               log?: string,                       // compiler message on compile_error
               scores?: { flat: boolean, motion: number, palette: number,
                          subject: number, total: number },
               critique?: string,
               parentIds: Id<"candidates">[],
               survived: boolean }
```

Three tables because there are three nesting levels: a **run** is one prompt, it has three **generations**, each has six **candidates**.

Notes on the less obvious fields:

- **`candidates.status`** is written as the candidate moves through the pipeline. The UI subscribes to it, so tiles visibly change from queued to rendering to scored while the user watches. This is most of why the demo feels alive — set it eagerly, at every step.
- **`parentIds`** records which survivors a candidate was mutated from. It is what makes the lineage visible and it is nearly free to store.
- **`runs.pinned`** marks the one saved demo run that the public URL falls back to when nothing is running. See `04-web-djordje.md` — this is what a judge sees on Thursday.

**Mutations** the orchestrator calls: `createRun`, `createGeneration`, `createCandidate`, `setCandidateStatus`, `generateUploadUrl`, `setCandidateFrames`, `setCandidateScores`, `markSurvivors`, `setRunStatus`, `pinRun`.

**Queries** the UI subscribes to: `latestRun`, `pinnedRun`, `runWithCandidates(runId)`.

Public mutations, no auth. It is a one-day hackathon and the orchestrator holds no key the client should not see. Do not spend time on this.

---

## 4. Scoring — how a candidate gets a number

**Who owns it:** Pavle (`score.ts`).

Two stages. The cheap arithmetic runs first and often makes the expensive call unnecessary.

### Stage 1 — deterministic prefilter, no model call

- **`flat`**: standard deviation of luminance on `t1` below 0.02 (on a 0..1 scale) → `flat = true`, `total = 0`, **skip vision entirely**.
- **Motion**: mean absolute pixel difference between `t0` and `t2` below 0.01 → `motion = 0`, **regardless of what vision says**.
- Reference mode adds a colour-histogram distance to the reference image, folded into `palette`.

### Stage 2 — vision

x.ai with image input, using the rubric in `prompts/rubric.md`, returning JSON:

```ts
{ palette: 0-10, motion: 0-10, subject: 0-10, critique: "one line" }
```

`total = flat ? 0 : palette + motion + subject`

### Why it is split this way

The two things a vision model is *worst* at judging are exactly the two things arithmetic answers perfectly: **is this image blank**, and **does it move**. Pixel maths knows both with certainty. So we compute those ourselves and let them override the model.

That leaves the model judging only palette and subject — "are these the right colours" and "does this look like the thing asked for" — which is what vision models are genuinely good at.

It is also much cheaper. Most generation-1 candidates are black, and a black candidate costs us a standard deviation instead of an API call.

Thresholds are starting values. **Tune them against the fixtures, not against a theory.**

One thing not to worry about: absolute scores may drift between generations, so generation 3 might score lower than generation 1 on raw numbers. It does not matter. Survivor selection is *within* a generation, so only the ordering inside one generation is load-bearing.

---

## 5. Loop — the evolution itself

**Who owns it:** Pavle (`loop.ts`).

```
POP = 6                      // candidates per generation
GENS = 3                     // generations per run
SURVIVORS = 2                // how many parents the next generation gets
CANDIDATE_TIMEOUT_MS = 60000 // three frames at 20 s each
```

Six sandboxes are created **once per run** and reused across all three generations. Creating them per generation would triple the setup cost for no benefit.

A candidate timing out marks that candidate and **never fails the run**. Five good candidates and one hung one is a perfectly good generation — and the hung tile is something we show on camera.

The mutation prompt (`prompts/mutation.md`) receives the original prompt, both survivor sources, both critiques, and the run's steering text if there is any, and asks for six children each with a strategy label.

**Why two survivors and not one:** one parent collapses the population to variations of a single idea by generation 3. Two keeps a second lineage alive, so if the leading approach is a dead end there is something else to fall back on.

---

## Environment

`.env.example` lists every variable with no values:

```
LLM_PROVIDER
CLAUDE_BINARY
CLAUDE_CLI_MODEL
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

`VITE_`-prefixed variables are the ones Vite exposes to browser code — that is the only way the React app can see them.

**`VITE_ORCHESTRATOR_URL`** is how the browser reaches `POST /run`. Because the browser calls the orchestrator directly from a different origin, **the orchestrator must send permissive CORS headers** or the prompt box fails in the browser while working perfectly from curl. That specific mismatch is the classic afternoon time sink. Five minutes now.

## Stack constraints

- **Models go through one interface.** `orchestrator/llm.ts` exposes `generateCandidates(prompt)` and `scoreFrames(prompt, pngs)`. Two implementations behind it, selected by `LLM_PROVIDER`. The split exists because the API budget for the day is $35 per person and a full three-generation run costs roughly a dollar at Opus rates: enough for the deployed box, not enough to also absorb a day of debugging. The CLI carries development and the recorded demo at no cost to that budget.
- **`claude-cli` is the local default.** Shells out to `claude -p --output-format json --model <id> --json-schema <schema>` with the prompt on stdin, the same pattern as Depth's `internal/platform/claude/claude.go`. `--json-schema` gives the same schema guarantee as the SDK path. The envelope carries `modelUsage[].costUSD`: log it, so spend is measured rather than estimated. Scoring needs `--allowedTools Read` plus absolute PNG paths in the prompt, since print mode reads images off disk. Note that `--tools` only advertises tools and `--allowedTools` grants them; without both, the call silently burns turns achieving nothing.
- **x.ai is what the deployed orchestrator uses**, and the partner path. Because `claude-cli` cannot authenticate in a container, this is the only provider the public URL has: its vision call is load-bearing, not optional, and must be proven before 15:30. OpenAI-compatible chat completions, so the standard OpenAI SDK works with a different `baseURL` and key. Model name from `XAI_MODEL`. Read the current vision-capable id off the console and **do not hardcode one**, since ids change and a stale one fails at the worst time. No schema guarantee here: parse defensively and strip code fences.
- **Daytona** — TypeScript SDK. Verify the exact method names for create-from-snapshot, upload file, exec and download file **in the SDK README before writing `sandbox.ts`**. Snapshot name from `DAYTONA_SNAPSHOT`.
- **Harness image** — a `Dockerfile` based on the official Playwright image. **The image tag must match the Playwright version in `harness/package.json` exactly**, or Chromium will not be found. This is the most common way this setup fails and the symptom looks like broken infrastructure rather than a version mismatch.
- **WebGL** — the context must be created with `preserveDrawingBuffer: true`, or `canvas.toDataURL()` returns an empty image because the browser is free to discard the buffer after drawing. Capture after a single explicit `renderAt(t)` draw. **No animation loop in the harness** — never read a wall clock, or the same shader produces different frames on different runs and nothing is reproducible.
- **Convex** — frames go to file storage via `generateUploadUrl`. Never base64 into documents.
- **Orchestrator** — a standalone Node process (`server.ts` exposes `POST /run { prompt, mode, steering? }`) writing to Convex with the HTTP client. It does **not** live inside Convex actions, because a full run takes minutes and Convex actions are not the right shape for that. It is **deployed**, not run from a laptop — see `03-orchestrator-pavle.md`.
- **Fal.ai** (reference mode only) — one call at run start producing the reference still. Append `abstract, full-frame, seamless, no objects, no text, procedural texture` to the diffusion prompt. Photoreal scenes never converge, because a shader cannot produce a photograph of a specific object and the score never improves.
