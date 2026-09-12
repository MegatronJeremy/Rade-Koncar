# Harness — Vuk

## What you own

`harness/`. Your job is one thing: **given shader source code, produce three PNGs of what it draws, reliably, inside a cloud sandbox.**

Everything else in the product consumes what you produce. Nothing can be proven to work until a sandbox emits a PNG, which makes you the critical path.

Read [`01-contracts.md`](01-contracts.md) §1 for the exact output shape. You will not need `00-primer.md`.

## Order of work — this matters more than usual

You are on the critical path **twice**: Pavle's 12:15 thesis test needs your standalone harness page, and the 13:00 gate needs your Daytona snapshot. So spend your first half hour unblocking other people before you start on your own hard problem.

1. **0–5 min — fixtures.** `good.glsl`, `bad.glsl`, `hang.glsl` and three real PNGs in `harness/fixtures/`. Frees Pavle's stub immediately and costs you almost nothing.
2. **5–35 min — `harness.html` standalone**: a page with a textarea and a Run button that renders whatever is pasted into it. Frees the 12:15 thesis test, which is the gate that decides whether this product has a reason to exist.
3. **Then** `render.ts`, the Dockerfile and the snapshot.

**Do not start the Docker work before step 2 works in a browser tab.** It is the one hard scheduling dependency in the day.

## First bullet — target 13:00

Build `harness.html` and `render.ts` so that:

```
node render.js --in fixtures/good.glsl --out out/
```

produces three PNGs and a `result.json` matching contract 1, and

```
node render.js --in fixtures/bad.glsl --out out/
```

produces `status: "compile_error"` with the compiler log in it.

Then write the `Dockerfile` from the official Playwright image and build the Daytona snapshot.

**Done when** the same command works inside a sandbox created from that snapshot, and `harness/README.md` contains the snapshot name and the exact command line. The moment that filename appears, Pavle swaps his stub for the real thing — so write it the second it works, do not batch it with other commits.

## Chromium flags

```
--headless=new
--no-sandbox
--use-gl=angle
--use-angle=swiftshader
--enable-unsafe-swiftshader
--disable-dev-shm-usage
```

Every one earns its place, and getting any of them wrong produces a failure that looks like something else entirely:

| Flag | Why | What it looks like when missing |
|---|---|---|
| `--no-sandbox` | Chromium refuses to run as root, which is the normal case in a container | An obscure launch error. Looks like a broken image, not a flag |
| `--use-gl=angle` | Selects the ANGLE backend, without which `--use-angle=` is ignored | Silently ignored flag below |
| `--enable-unsafe-swiftshader` | Recent Chromium disables the software WebGL fallback unless you ask for it. **A sandbox has no GPU, so this is the entire day** | A blank image. **Looks exactly like a broken shader** |
| `--disable-dev-shm-usage` | Default `/dev/shm` in a container is 64 MB | Chromium crashes partway through |

## Capture rules

- **`preserveDrawingBuffer: true`** on the WebGL context. Without it the browser may discard the buffer immediately after drawing and `toDataURL()` hands back an empty image.
- One explicit `renderAt(t)` draw per frame, then capture. **No `requestAnimationFrame` loop.**
- `iTime` set explicitly to 0.0, 1.0, 2.0. Never a wall clock — otherwise the same shader gives different frames on different runs, and nothing downstream is reproducible or comparable.
- On compile failure, read `gl.getShaderInfoLog()` into the result's `log`, return `status: "compile_error"`, **exit code 0**.
- Per-frame timeout 20 s → `status: "timeout"`, **exit code 0**.

Exit code 0 for both failure modes is not a detail. Pavle's orchestrator treats a non-zero exit as "the harness broke", and in generation 1 perhaps half the candidates fail to compile. If those exit non-zero, his loop falls over constantly.

## Fixtures — write these first, they unblock everyone

In `harness/fixtures/`:

| File | Purpose |
|---|---|
| `good.glsl` | A shader that definitely compiles and definitely animates. Five minutes from memory |
| `bad.glsl` | A deliberate syntax error, to exercise the `compile_error` path |
| `hang.glsl` | **A pathological shader with an unbounded loop.** See below |
| `t0.png`, `t1.png`, `t2.png` | Three real frames, so Pavle's stub and Djordje's UI have something to eat before anything real exists |

### `hang.glsl` is a demo asset, not a test fixture

A fragment shader containing an unbounded loop locks the thread rendering it. This is not a catchable exception — the renderer simply stops responding. Model-written shader code does it regularly.

In a sandbox it hits the 20 s timeout and dies alone. On a user's machine it takes the whole browser tab with it.

**That contrast is the strongest fifteen seconds of our case for using Daytona at all**, and it is in the recording script in `06-shipping.md`: one tile times out and turns red, the other five keep rendering. Build the timeout path now, deliberately, rather than discovering it at 16:00 by accident.

## Second bullet — only after the first is checked in

- `prompts/rubric.md` — the scoring criteria the vision model is given.
- `prompts/codegen.md` with a **helper block**: hash, value noise, fbm, a palette function. Giving the model a known-good set of building blocks raises the compile rate more than any amount of prompt wording, because these are the four functions almost every procedural shader needs and the four the model most often gets subtly wrong.
- Run the three chosen demo prompts through generation 1 and fix whatever renders black.
- The winner view: harness embedded live, source beside it, edit, run, export.

`score.ts` is **not** yours — it moved to Pavle, who is its only consumer. See `05-timeline.md`.

## If the 13:00 gate fails

Switch to **one sandbox, one Chromium, six pages**. Same contract, same everything downstream, just less parallelism. **Decide at 13:00, not at 14:00.**

If that also fails, the browser renders on an offscreen canvas and posts frames back, and Daytona is used for parallel compile validation only. The contracts do not change — `HarnessResult` is simply produced by a different machine. We lose the hang demo and weaken the Daytona claim. We lose nothing else.
