# experiments

Evidence, versioned. Each experiment is a directory named `NNN-<what>-<model>`, holding
every candidate it generated, every frame those candidates rendered, and a manifest
recording what produced them.

This exists because the project's central claim is empirical: an LLM writes shaders that
compile and do not render as asked. `001` is the measurement behind that claim, and the
one-shot column in the UI is the same result shown live.

## Running one

```bash
experiments/bin/run.sh <experiment-id> <slug> "<prompt>"
MODEL=claude-opus-5 experiments/bin/run.sh 002-oneshot-opus-5 ink "ink dropping into water, ..."
```

Generates six one-shot candidates through `prompts/codegen.md`, renders each through
`harness/render.js`, and writes them under `experiments/<id>/<slug>/`. Default model is
`claude-sonnet-5`; override with `MODEL`.

Then build the page over everything in that experiment:

```bash
experiments/bin/sheet.sh <experiment-id>     # writes and opens <id>/index.html
```

## Reading one

`index.html` is the artifact to look at: a status table across prompts, then every
candidate with its three frames, its compiler log if it failed, and its full source.

Acceptable needs all three: not blank, it moves, a stranger would match the image to the
words. Counts go in `prompts/thesis-test.md`, which records the decision; this directory
records what the decision was made from.

## Layout

```
NNN-<what>-<model>/
  manifest.json      model, prompts, git sha, cost per call, timestamps
  index.html         the contact sheet
  <slug>/
    cands.json       the six {strategy, source} objects as returned
    c0.glsl .. c5.glsl
    envelope.json    raw CLI output including modelUsage
    r0/ .. r5/       t0.png t1.png t2.png result.json
```

Frames are 256x256, the same size the scorer sees. A full six-prompt experiment is a few
megabytes.

## Experiments

| ID | What | Model | Result |
|---|---|---|---|
| `001-oneshot-sonnet-5` | One-shot baseline across the demo prompt candidates | `claude-sonnet-5` | see `prompts/thesis-test.md` |
| `003-oneshot-opus-5` | One-shot across the eight abstract prompts, retired 13:25 | `claude-opus-5` | 13/48 acceptable, 48/48 compiled. see `prompts/thesis-test.md` |

`003` was rendered with `harness/batch.js` rather than `bin/run.sh`: one browser for
the whole set instead of one per candidate, and it emits the same `result.json`, so the
output drops into this layout unchanged.

```bash
cd harness && node batch.js --in <dir of .glsl> --out <dir> [--times 0,1,2]
```

It also writes `sheet.png`, a single image of a generation's six t1 frames, and
`summary.json` with the contract §4 prefilter numbers. `--times` moves the sampled
seconds, which is how the motion window finding in `thesis-test.md` was measured.
