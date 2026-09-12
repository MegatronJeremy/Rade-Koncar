# Thesis test

Owner: Pavle. Run before the loop is built.

## What it establishes

The premise of this project is that an LLM gets shaders wrong on the first attempt. If it does not, the loop is decoration, the grid shows something that was already correct in generation 1, and the product has no reason to exist.

That is worth thirty minutes to find out early rather than at 17:00 with the video half recorded.

## Method

For each prompt in `demo-candidates.md`:

1. Generate six one-shot candidates with `codegen.md`, no loop, no feedback.
2. Paste each into the standalone `harness.html` tab and look at it.
3. Count how many are acceptable by the three criteria in `demo-candidates.md`.

If the harness tab is not ready, paste into Shadertoy instead. Same test, same counts, no dependency on our code.

## Results: the five concrete prompts

The live list. `experiments/002-oneshot-sonnet-5` holds the runs.

| # | Prompt | Acceptable / 6 | Notes |
|---|---|---|---|
| 1 | a red ball bouncing on a white floor | | |
| 2 | an analog clock with a sweeping second hand | | |
| 3 | snow falling and settling into a pile | | |
| 4 | a candle flame flickering in the dark | | |
| 5 | a pendulum swinging back and forth | | |

## Decision

Three demo prompts, chosen at roughly two of six:

1.
2.
3.

Reference mode becomes core only if one-shot scored five or six on everything, which would mean text prompts are not discriminating and the target needs to be an image instead.

---

## Prior run: the eight abstract prompts

48 candidates, six per prompt, on the prompt list as it stood before 13:25. That list was retired for being too abstract to judge quickly and unconvincing on video, so **these counts do not select anything.** They are kept because two of the findings survive the change of list.

Generated with one `claude -p` call per prompt through `codegen.md` unmodified, $2.55, 96 to 156 seconds per prompt, no repair call. Rendered with `harness/batch.js`.

Everything it produced is in `experiments/003-oneshot-opus-5`, so the counts below can be disagreed with rather than taken on trust. Open its `index.html`: every candidate runs live in WebGL beside its captured frames, its prefilter numbers and its source.

| # | Prompt | Acceptable / 6 | Notes |
|---|---|---|---|
| 1 | ink dropping into water | 2 | All six black on white and all six move. Five are hard-edged dots or a star burst; only two have the diffusing edge that reads as ink. Nothing produces tendrils |
| 2 | rain on a night window | 2 | One has both bokeh and streaks. One has bokeh and no rain, one rain and no bokeh, one is green confetti polygons, one is static |
| 3 | stained glass, sun behind | 3 | Too easy. Leaded panes are a Voronoi exercise and the model knows it |
| 4 | aurora over a dark ridge | 0 | Palette and ridge right, several look good, all six fail on motion |
| 5 | molten metal cooling | 1 | Whole set moves well and the failure is pure subject: five of six are uniformly orange with no dark crust, the inverse of what was asked |
| 6 | knitted wool breathing | 1 | Nothing reads as knitting. One woven grid in purple and orange, the rest marbled cloud and Voronoi cells |
| 7 | bioluminescent jellyfish | 3 | Too easy. A glowing bell with tentacles is a radial SDF |
| 8 | oil slick on wet asphalt | 1 | Garish full spectrum rainbow instead of thin film iridescence, and no asphalt |

13 of 48 acceptable, 27%. The thesis holds, which is the one thing this run was for.

### Finding: generation 1 does not fail to compile

**48 of 48 compiled. Zero compile errors, zero timeouts, across every prompt.** `experiments/001` saw the same on its 24, so it is 72 for 72 across two independent runs and two models.

`01-contracts.md` §1 calls `compile_error` "common in generation 1" and `02-harness-vuk.md` says "perhaps half the candidates fail to compile". Neither holds for this codegen prompt. Red tiles do not appear on their own, so a demo that wants one needs `hang.glsl` or a hand written candidate.

Failure counts by criterion, out of 48:

| Criterion | Failures |
|---|---|
| Blank | 2 |
| Does not move | 9, of which 6 are the aurora set |
| Not recognisable | 24 |

Subject dominates, and subject is exactly what the vision half of the rubric judges. The arithmetic prefilter catches 11 of 35 failures on its own, for no model call.

### Finding: the t=0,1,2 window under-measures slow motion

This one is independent of which prompts we use. The aurora set scored 0 of 6 on motion. The same six candidates over wider windows:

| Window | Above the 0.01 motion threshold |
|---|---|
| t = 0, 1, 2 | 0 of 6 |
| t = 0, 2, 4 | 1 of 6 |
| t = 0, 5, 10 | 3 of 6 |
| t = 0, 15, 30 | 3 of 6 |

Partly real and partly measurement: four of six are genuinely near-static even over thirty seconds, but three cross the threshold once the window reaches ten seconds. Fast prompts are unaffected, ink reads 0.108 at two seconds and 0.711 at ten.

It still applies to the concrete list. A pendulum with a slow period and a settling snow pile are both cases where two seconds may not contain enough change to measure.

Contract §1 fixes the frames at 0, 1 and 2 seconds, so **this is raised, not changed.** If we want it, the change is one line in the harness and one in the rubric.
