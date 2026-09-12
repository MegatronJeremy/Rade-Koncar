# Thesis test

Owner: Pavle. Run before the loop is built. Executed by Vuk at 13:30 on the harness.

## What it establishes

The premise of this project is that an LLM gets shaders wrong on the first attempt. If it does not, the loop is decoration, the grid shows something that was already correct in generation 1, and the product has no reason to exist.

That is worth thirty minutes to find out early rather than at 17:00 with the video half recorded.

## Method

For each prompt in `demo-candidates.md`:

1. Generate six one-shot candidates with `codegen.md`, no loop, no feedback.
2. Paste each into the standalone `harness.html` tab and look at it.
3. Count how many are acceptable by the three criteria in `demo-candidates.md`.

If the harness tab is not ready, paste into Shadertoy instead. Same test, same counts, no dependency on our code.

### How this run was actually done

48 candidates, one `claude -p` call per prompt through `codegen.md` unmodified, $2.55 and 96 to 156 seconds per prompt. No repair call, no feedback, exactly what generation 1 produces.

Rendered with `harness/batch.js`, which lays the six t1 frames of a generation out as one sheet. "Not blank" and "it moves" are the arithmetic from contract §4 (luminance stddev under 0.02, mean absolute t0/t2 difference under 0.01). "Recognisable" is a human looking at the sheet.

The sheets behind the three chosen prompts and behind aurora are in `thesis-sheets/`, so the counts below can be disagreed with rather than taken on trust. To regenerate any of them:

```bash
cd harness && node batch.js --in <dir of .glsl> --out <dir>
```

## Results

| # | Prompt | Acceptable / 6 | Notes |
|---|---|---|---|
| 1 | ink dropping into water | **2** | All six are black on white and all six move. Five are hard-edged dots or a star burst; only c1 and c3 have the diffusing edge that reads as ink. Nothing produces tendrils |
| 2 | rain on a night window | **2** | c3 is the only one with both bokeh and streaks. c1 has bokeh and no rain, c5 rain and no bokeh, c2 is green confetti polygons, c0 is static |
| 3 | stained glass, sun behind | **3** | Too easy. Leaded panes are a Voronoi exercise and the model knows it. c1, c2 and c5 all read correctly |
| 4 | aurora over a dark ridge | **0** | Palette and ridge are right and several look good. All six fail on motion, every one under 0.01. See the sampling note below |
| 5 | molten metal cooling | **1** | The whole set moves well and the failure is pure subject: five of six are uniformly orange with no dark crust, the inverse of what was asked. Only c4 has dark plates with glowing edges |
| 6 | knitted wool breathing | **1** | Nothing reads as knitting. c5 is a woven grid in purple and orange, the only one with any textile structure. The rest are marbled cloud, Voronoi cells, a radial burst |
| 7 | bioluminescent jellyfish | **3** | Too easy. A glowing bell with tentacles is a radial SDF. c0, c3, c4 all read correctly |
| 8 | oil slick on wet asphalt | **1** | Systematic failure: garish full spectrum rainbow instead of thin film iridescence, and no asphalt. Only c2 is close |

**13 of 48 acceptable, 27%.** The thesis holds.

### Where the failures are, which is not where the docs assume

**48 of 48 compiled.** Zero compile errors, zero timeouts, across every prompt. The helper block and the constraints in `codegen.md` are doing their job.

That contradicts two things written elsewhere. `01-contracts.md` §1 calls `compile_error` "common in generation 1" and `02-harness-vuk.md` says "perhaps half the candidates fail to compile". Neither is true of this codegen prompt. Red tiles will not appear on their own, so a demo that relies on showing one needs `hang.glsl` or a hand written candidate.

Failure counts by criterion, out of 48:

| Criterion | Failures |
|---|---|
| Blank | 2 |
| Does not move | 9, of which 6 are the aurora set |
| Not recognisable | 24 |

Subject is the dominant failure by a wide margin, and subject is exactly what the vision half of the rubric judges. The arithmetic prefilter catches 11 of 35 failures on its own, for no model call.

### The t=0,1,2 sampling window under-measures slow prompts

Aurora scores 0 of 6 on motion. Measuring the same six candidates over wider windows:

| Window | Aurora candidates above the 0.01 motion threshold |
|---|---|
| t = 0, 1, 2 | 0 of 6 |
| t = 0, 2, 4 | 1 of 6 |
| t = 0, 5, 10 | 3 of 6 |
| t = 0, 15, 30 | 3 of 6 |

So it is partly real and partly measurement. Four of six are genuinely near-static even over thirty seconds, but three cross the threshold once the window reaches ten seconds. Ink, by contrast, reads 0.108 at two seconds and 0.711 at ten: fast prompts are unaffected either way.

Three of the eight prompts say "slow" or "slowly". Contract §1 fixes the frames at 0, 1 and 2 seconds, so **this is a contract question and nobody should change it alone.** Raising it, not changing it. If we want aurora in play, the change is one line in the harness and one in the rubric.

## Decision

Three demo prompts, chosen at roughly two of six:

1. **ink dropping into water, slow, black on paper white** (2/6)
2. **rain on a night window with city bokeh behind it** (2/6)
3. **molten metal cooling, dark crust forming, orange cracks** (1/6)

Ink and rain sit exactly on the selection rule. The third comes from the group at 1 of 6, and molten metal is the strongest of those three because its failure is systematic, visible at thumbnail size and obviously fixable: generation 1 is uniform orange mush, and the target is dark crust with glowing cracks. It also already moves on all six, so the loop only has to climb on palette and subject.

Not chosen:

- **Stained glass (3/6) and jellyfish (3/6)** are what the banned list warns about. The model does them well one-shot and the grid would barely change across three generations.
- **Knitted wool (1/6)** is closer to zero than to one. Nothing in the set reads as knitting, so there is little for the loop to climb on.
- **Oil slick (1/6)** is the reserve. Its failure is as systematic as molten metal's and visually striking, but the palette it has to reach is subtler.
- **Aurora (0/6)** is the most interesting failure in the set and it is unusable under the current contract. If the sampling window changes it becomes a strong candidate, because the fix the loop needs to discover is a single scalar on `iTime` and the before and after would be unambiguous.

Reference mode stays a stretch. One-shot scored five or six on nothing, so text prompts discriminate fine and there is no reason to move the target to an image.
