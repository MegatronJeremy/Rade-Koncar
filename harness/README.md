# harness

Given GLSL source that defines `mainImage`, produce three 256x256 PNGs of what it draws.
Output shape is `docs/01-contracts.md` §1.

## render.js

```bash
npm install && npm run build
node render.js --in fixtures/good.glsl --out out/good
```

Writes `t0.png`, `t1.png`, `t2.png` and `result.json` into the output directory.
Exit code is 0 whenever `result.json` was written, which includes `compile_error` and
`timeout`; non-zero only when Chromium itself failed to come up.

Measured against the fixtures under SwiftShader:

| Input | status | wall |
|---|---|---|
| `good.glsl` | `ok`, compile 40 ms, frames 67/4/3 ms | under 3 s |
| `bad.glsl` | `compile_error`, log `ERROR: 0:3: ';' : syntax error` | under 3 s |
| `hang.glsl` | `timeout`, log `frame t0 exceeded 20000 ms` | 22 s |

The first frame costs an order of magnitude more than the rest: SwiftShader compiles the
shader to machine code lazily on first draw.

A wedged shader blocks inside `glFinish` and the `evaluate` promise never settles, so
`render.js` launches through `chromium.launchServer` and SIGKILLs the server on timeout.
`Browser` exposes no handle on its process, which is why it is not a plain `launch`.
Verified no Chromium survives a timeout run.

## Sandbox

Snapshot name: **`shader-arena-harness-1g`** (1 CPU / 1 GiB RAM / 5 GiB disk).
Set `DAYTONA_SNAPSHOT=shader-arena-harness-1g`.

Size is set by the organisation's cap of **10 GiB of concurrent sandbox memory**, not
by what Chromium wants. At 4 GiB each, `createPool` fails outright on a pool of two:

```
DaytonaValidationError: Total memory limit exceeded. Maximum allowed: 10GiB.
```

At 1 GiB a pool of six creates in 6.3 s and leaves headroom for a second person
running at the same time. Raising it costs parallelism, not speed: Chromium on
SwiftShader at 256x256 fits comfortably, and `--disable-dev-shm-usage` keeps it off
`/dev/shm`. One CPU roughly triples compile time (82 ms to 306 ms on `bad.glsl`) and
leaves frame times unchanged.

`shader-arena-harness` at 2 CPU / 4 GiB still exists and still renders, but cannot
support a pool of more than two. Prefer the smaller one.

Working directory in the sandbox is `/harness`, so the command is:

```bash
node render.js --in <uploaded>.glsl --out out/<id>
```

Measured in a real sandbox created from it, end to end:

| | |
|---|---|
| sandbox create | 1.6 s |
| `good.glsl` | exit 0, `ok`, 2.2 s, compile 106 ms, frames 139/11/5 ms |
| `bad.glsl` | exit 0, `compile_error`, 0.8 s |
| `hang.glsl` | exit 0, `timeout`, 20.7 s |

`node verify-sandbox.js <snapshot>` reruns exactly that: creates a sandbox, runs all
three fixtures, pulls `t1.png` back to `out/sandbox/`, deletes the sandbox.

Sandbox frames are close to but not byte-identical with the ones committed in
`fixtures/`, which were rendered by a different SwiftShader build. Comparisons are
only ever made between candidates from the same run, so this does not matter.

### Rebuilding it

```bash
npm run build && node snapshot.js shader-arena-harness
```

Needs `DAYTONA_API_KEY` in the repo-root `.env`; the name falls back to
`DAYTONA_SNAPSHOT` if the argument is omitted. Daytona builds the Dockerfile
server-side, so no local Docker is required.

`daytona snapshot create --dockerfile` does the same thing, but on Windows it dies
with `failed to remove tar file: ... being used by another process` after uploading
the context. The SDK path above has no such problem.

`Dockerfile` pins `mcr.microsoft.com/playwright:v1.63.0-noble` against playwright 1.63.0
in `package.json`. Those two versions must move together: the image carries browser builds
keyed to its own version, and a mismatched client looks for a path that is not there.

It builds in two stages so that typescript and the Daytona SDK stay out of the sandbox;
the runtime stage is `npm ci --omit=dev`, which leaves playwright as the only dependency.

Chromium runs with `--use-angle=swiftshader --enable-unsafe-swiftshader`, so a sandbox with
no GPU still gets WebGL2. Without the second flag recent Chromium refuses the software
fallback and every frame comes back blank, which reads as a broken shader.

## harness.html

The winner view and the renderer, in one file. Source on the left, a live canvas on the
right, the three scored frames underneath.

- Edit and press Run, or ctrl+enter. `Revert` restores the source it was given and the
  header shows `edited` until then.
- Play, pause, scrub, and 0.25x to 2x. Clicking a scored frame jumps the clock to it.
- `Export PNGs` downloads the three frames. `Copy source` takes the text.

The canvas is 256x256 internally whatever size it is displayed at, because that is what
`captureAt` hands back and what the scorer sees.

**It does not autoplay by default.** `render.ts` loads this page, and an animation loop
running underneath it would burn SwiftShader cycles in a sandbox for nothing. Pass
`?live=1` to autoplay; pressing Run also starts playback.

### Embedding it

`?embed=1` drops the padding and the standalone-only controls. Source goes in by
`postMessage`, so the parent needs no access to the iframe's document:

```js
iframe.contentWindow.postMessage({ type: "harness:source", source, autoplay: true }, "*");
```

Back out, on the parent's `message` event:

```js
{ type: "harness:ready" }
{ type: "harness:status", status: "ok", ms }
{ type: "harness:status", status: "compile_error", log }
```

Verified: default load does not autoplay, `?live=1` advances the clock, canvas pixels
change while playing, and a source pushed by `postMessage` compiles and renders.

Serve it over http (the fixture loader uses `fetch`, which file:// blocks):

```bash
python -m http.server 5199 --directory harness
```

then open `http://localhost:5199/harness.html`.

`render.ts` loads this same page and drives it through `window.harness`, so the browser
tab and the sandbox run identical code:

```ts
window.harness.compile(source)  // -> { ok, log, ms }   never throws; log is the compiler text
window.harness.renderAt(t)      // one explicit draw at iTime = t, then glFinish
window.harness.captureAt(t)     // -> { dataUrl, ms }   renderAt followed by toDataURL
```

The `animate` checkbox is a preview affordance. Capture never runs off a clock: `iTime` is
set to exactly 0.0, 1.0 and 2.0, so the same source gives byte-identical frames on every
run. Verified: two `captureAt(1.0)` calls return the same data URL.

## batch.js

Renders a directory of candidates in one browser and lays their t1 frames out as a
single sheet, so a generation is judged by looking at one image.

```bash
node batch.js --in <dir of .glsl> --out <dir> [--times 0,1,2]
```

Per candidate it writes `t0/t1/t2.png` and a `result.json` of the same shape `render.js`
produces, so the output is readable by anything that already reads a single render,
including `experiments/bin/sheet.sh`. Alongside those it writes `sheet.png` and a
`summary.json` carrying the contract §4 prefilter numbers, luminance stddev and t0/t2
mean absolute difference, with `FLAT` and `STILL` flagged.

Six candidates take 2.0 s, against 10.9 s for the same six one at a time through
`render.js`, because the browser starts once instead of six times. A candidate that
hangs kills only its own browser: the run relaunches and continues, so one bad shader
costs the batch 20 seconds rather than the whole set.

`--times` moves the three sampled seconds. Contract §1 fixes the scored frames at 0, 1
and 2, so this is for measuring how much a candidate moves over a longer window than the
one it is scored on, which is what separates a still shader from a deliberately slow one.

## Fixtures

| File | Behaviour |
|---|---|
| `good.glsl` | Compiles. Luminance stddev 0.108 on t1, mean abs t0/t2 difference 0.127, both clear of the prefilter thresholds in contract §4 |
| `bad.glsl` | `ERROR: 0:3: ';' : syntax error` |
| `hang.glsl` | Compiles, then never finishes a frame. Exercises the timeout path, not the compile path |
| `t0.png` `t1.png` `t2.png` | `good.glsl` captured at t = 0, 1, 2 |

GLSL info logs come back NUL-terminated. `render.ts` strips trailing NULs before writing
`result.json`.
