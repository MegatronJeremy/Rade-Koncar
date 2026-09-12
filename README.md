# Shader Arena

**We don't generate pictures. We generate programs that draw them — and we let the model see what its program drew.**

🔗 **[shader-arena.onrender.com](https://shader-arena.onrender.com)**

---

## The problem

A fragment shader is a small program that runs once per pixel, per frame, to compute a colour. Large language models write plausible-looking shader code and have **no way to tell which of six plausible programs actually renders as asked** — because the output is an image, and nothing in a normal code pipeline ever looks at an image.

A shader that compiles cleanly and outputs pure black is, to a compiler, a complete success. There are no tests. There is no error. The model has no idea it failed.

| Failure | What you see | Why the compiler is fine with it |
|---|---|---|
| Division by zero | Pure black | `NaN` is a legal float |
| Values scaled wrong | One flat colour | `vec3(50.0)` clamps to white |
| Never uses `iTime` | A still image | Nothing requires you to use a variable |
| Maths right, look wrong | A grey smear that isn't ink in water | Nothing defines "looks like ink" |

So every "AI writes shaders" tool works open-loop: generate, paste, squint, retry by hand. **The human is the perception layer.**

## What we built

We close the loop. The fitness function is an image, judged by a model that can see.

```
prompt ──► 6 candidate shaders          (LLM writes GLSL)
             │
             ├──► each renders in its own isolated sandbox
             │    3 screenshots at t = 0s, 1s, 2s
             │
             ├──► prefilter: is it blank? does it move?   (pixel maths, no model call)
             ├──► vision model scores palette + subject, writes a one-line critique
             │
             └──► keep the best 2 ──► mutate into 6 children ──► repeat ×3
```

On screen you watch a grid of six shaders get better across three rounds, tiles changing from `queued` to `rendering` to `scored` as it happens.

### Two things worth noticing

**The one-shot column.** Round 1 stays pinned on the left, labelled *one shot*. That is what the model produces with no feedback. The right column is the same prompt three rounds later. It is the standing answer to the question that kills demos in this category — *wouldn't the model just get it right first try?*

**Failures are content, not exceptions.** A shader that doesn't compile shows its compiler message in the grid. A shader that hangs gets its sandbox killed at 60 seconds while the other five keep rendering — that isolation is the whole reason for per-candidate sandboxes, and model-written GLSL produces unbounded loops regularly.

### Why the scoring splits in two

The two things a vision model is *worst* at judging are exactly the two things arithmetic answers perfectly: **is this image blank**, and **does it move**. So we compute those from the pixels and let them override the model, leaving it to judge only palette and subject — what it's genuinely good at.

It's also much cheaper. Most round-one candidates are black, and a black candidate costs a standard deviation instead of an API call.

## Stack

| Tool | What it does here |
|---|---|
| **x.ai (Grok)** | Writes the shaders, and the vision call that scores the screenshots |
| **Daytona** | Cloud sandboxes — six untrusted, possibly-hanging shaders render in parallel isolation |
| **Convex** | All state: database, frame storage, and live subscriptions that drive the evolving grid |
| **Render** | Hosts the public URL |
| **Fal.ai** | Reference mode — generates a target image to score colour similarity against |
| Playwright + Chromium | Headless WebGL2 rendering via SwiftShader, since sandboxes have no GPU |

TypeScript throughout, Node 20+, React and Vite on the front end.

## Repo layout

```
harness/        Renders GLSL to three PNGs in headless Chromium. Docker image + Daytona snapshot
orchestrator/   Codegen, sandbox fan-out, scoring, the evolution loop, POST /run
web/            Convex backend (convex/) and the React grid (src/)
prompts/        Codegen, mutation and scoring-rubric prompts
docs/           Contracts, per-owner plans, timeline
```

## Running it

Copy `.env.example` to `.env` and fill it in. Every variable is listed there with a comment.

**Harness** — turn a shader into screenshots:

```bash
cd harness && npm install && npm run build
node render.js --in fixtures/good.glsl --out out/good
```

Writes `t0.png`, `t1.png`, `t2.png` and `result.json`. Exit code is 0 whenever `result.json` was written — including for `compile_error` and `timeout`, because a failed shader is a normal result here, not a crash.

**Web** — the grid and the backend:

```bash
cd web && npm install
npx convex dev      # provisions the backend, prints the deployment URL
npm run dev         # http://localhost:5173
```

Set `VITE_CONVEX_URL` from what `convex dev` prints. Without it the site still renders — it falls back to a bundled sample run rather than showing an error.

**Orchestrator** — the loop:

```bash
cd orchestrator && npm install
npm start           # POST /run { prompt, mode, steering? }
```

Needs `CONVEX_URL` plus keys for whichever model provider `LLM_PROVIDER` selects.

### The public URL works with nothing else running

The deployed site reads a **pinned run** from Convex: a complete three-round run, one-shot column, scores and critiques, replayable with no orchestrator anywhere. Open the link on a phone weeks from now and the product still demonstrates itself.

## Built today

Everything in this repo was written on **12 September 2026**, from an empty repository, in one day. No pre-existing code.

## Team

Vuk Đorđević · Pavle Prodanović · Djordje Grebović

Licensed under GPL-3.0.
