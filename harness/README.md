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

`Dockerfile` pins `mcr.microsoft.com/playwright:v1.63.0-noble` against playwright 1.63.0
in `package.json`. Those two versions must move together: the image carries browser builds
keyed to its own version, and a mismatched client looks for a path that is not there.

Chromium runs with `--use-angle=swiftshader --enable-unsafe-swiftshader`, so a sandbox with
no GPU still gets WebGL2. Without the second flag recent Chromium refuses the software
fallback and every frame comes back blank, which reads as a broken shader.

Build the snapshot (needs `DAYTONA_API_KEY` and `DAYTONA_SNAPSHOT` in the repo-root `.env`):

```bash
npm run build && npm run snapshot
```

## harness.html

A standalone page: paste a candidate into the textarea, press Run, get three captured
frames and the compiler log. Serve it over http (the fixture loader uses `fetch`, which
file:// blocks):

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

## Fixtures

| File | Behaviour |
|---|---|
| `good.glsl` | Compiles. Luminance stddev 0.108 on t1, mean abs t0/t2 difference 0.127, both clear of the prefilter thresholds in contract §4 |
| `bad.glsl` | `ERROR: 0:3: ';' : syntax error` |
| `hang.glsl` | Compiles, then never finishes a frame. Exercises the timeout path, not the compile path |
| `t0.png` `t1.png` `t2.png` | `good.glsl` captured at t = 0, 1, 2 |

GLSL info logs come back NUL-terminated. `render.ts` strips trailing NULs before writing
`result.json`.
