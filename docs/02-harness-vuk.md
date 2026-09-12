# Harness — Vuk

You own `harness/`. You are the critical path: nothing else in the product can be proven until a sandbox produces a PNG.

## Order of work — this matters more than usual

You are on the critical path twice: Pavle's 12:15 thesis test needs your standalone harness tab, and the 13:00 gate needs your snapshot. So unblock other people first.

1. **0–5 min — fixtures.** `good.glsl`, `bad.glsl`, `hang.glsl` and three real PNGs in `harness/fixtures/`. Frees Pavle's stub immediately, costs almost nothing.
2. **5–35 min — `harness.html` standalone**, textarea and a Run button. Frees the thesis test.
3. **Then** `render.ts`, the Dockerfile and the snapshot.

Do not start the Docker work before step 2 is usable in a browser tab.

## First bullet — target 13:00

Build `harness.html` and `render.ts` so that:

```
node render.js --in fixtures/good.glsl --out out/
```

produces three PNGs and a `result.json` matching contract 1, and

```
node render.js --in fixtures/bad.glsl --out out/
```

produces `status: "compile_error"` with the compiler log.

**Make `harness.html` also usable standalone in a browser tab** with a textarea and a Run button. Pavle needs that for the thesis test by 12:15 and it is a hard dependency — build it before the Docker work.

Then write the `Dockerfile` from the official Playwright image and build the Daytona snapshot.

**Done when** the same command works inside a sandbox created from that snapshot, and `harness/README.md` contains the snapshot name and the exact command line. The moment that filename exists, Pavle swaps out his stub.

## Chromium flags

```
--headless=new
--no-sandbox
--use-gl=angle
--use-angle=swiftshader
--enable-unsafe-swiftshader
--disable-dev-shm-usage
```

Every one of these earns its place:

- `--no-sandbox` — inside a container running as root, which is the common case in a Daytona sandbox, **Chromium refuses to start without it**, and the failure is an obscure launch error rather than a rendering problem.
- `--use-gl=angle` — insurance. `--use-angle=` only takes effect when the ANGLE backend is selected.
- `--enable-unsafe-swiftshader` — recent Chromium disables the SwiftShader WebGL fallback without it, and **the failure looks like a broken shader**. A sandbox has no GPU, so this is the flag the whole day hangs on.
- `--disable-dev-shm-usage` — the default `/dev/shm` in a container is 64 MB and Chromium will crash on it.

## Capture rules

- `preserveDrawingBuffer: true` on the WebGL context, or `toDataURL()` returns an empty image.
- One explicit `renderAt(t)` draw per frame, then capture. No `requestAnimationFrame` loop.
- `iTime` set explicitly to 0.0, 1.0, 2.0. Never a wall clock.
- On compile failure, read `gl.getShaderInfoLog()` into the result's `log` and return `status: "compile_error"` with exit code 0.
- Per-frame timeout 20 s → `status: "timeout"`, exit code 0.

## Fixtures — write these first, they unblock everyone

In `harness/fixtures/`:

| File | Purpose |
|---|---|
| `good.glsl` | A shader that definitely compiles and animates. Five minutes from memory |
| `bad.glsl` | A deliberate syntax error, for the `compile_error` path |
| `hang.glsl` | **A pathological shader with an unbounded loop.** See below |
| `t0.png`, `t1.png`, `t2.png` | Three real frames, so Pavle's stub and Djordje's UI have something to eat |

### `hang.glsl` is a demo asset, not a test fixture

A fragment shader with an unbounded loop locks the renderer thread. In a sandbox it hits the 20 s timeout and dies; on a user's machine it takes the whole tab with it.

**That is the single strongest fifteen seconds of the Daytona case**, and it goes in the recording: one tile times out and turns red, the other five keep rendering. Build the timeout path now rather than discovering it at 16:00.

## Second bullet — only after the first is checked in

- `prompts/rubric.md`.
- `prompts/codegen.md` with a helper block: hash, value noise, fbm, palette function. This raises the compile rate more than any prompt wording.
- Run the three chosen demo prompts through generation 1 and fix whatever renders black.
- The winner view: harness embedded live, source beside it, edit, run, export.

## If the 13:00 gate fails

Switch to **one sandbox, one Chromium, six pages**. Same contract, same everything downstream, less parallelism. Decide at 13:00, not at 14:00.

If that also fails, the browser renders on an offscreen canvas and posts frames back, and Daytona is used for parallel compile validation only. The contracts do not change — `HarnessResult` is produced by a different machine, that is all. We lose the hang beat and weaken the Daytona claim; we lose nothing else.
