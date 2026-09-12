# harness

Given GLSL source that defines `mainImage`, produce three 256x256 PNGs of what it draws.
Output shape is `docs/01-contracts.md` §1.

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
