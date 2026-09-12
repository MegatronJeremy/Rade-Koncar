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

## Results

| # | Prompt | Acceptable / 6 | Notes |
|---|---|---|---|
| 1 | ink dropping into water | | |
| 2 | rain on a night window | | |
| 3 | stained glass, sun behind | | |
| 4 | aurora over a dark ridge | | |
| 5 | molten metal cooling | | |
| 6 | knitted wool breathing | | |
| 7 | bioluminescent jellyfish | | |
| 8 | oil slick on wet asphalt | | |

## Decision

Three demo prompts, chosen at roughly two of six:

1.
2.
3.

Reference mode becomes core only if one-shot scored five or six on everything, which would mean text prompts are not discriminating and the target needs to be an image instead.
