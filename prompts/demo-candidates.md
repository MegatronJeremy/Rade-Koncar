# Demo prompt candidates

Owner: Pavle. Input to the thesis test. The three we demo are chosen from this list.

## The eight

1. ink dropping into water, slow, black on paper white
2. rain on a night window with city bokeh behind it
3. stained glass window with the sun moving behind it
4. aurora over a dark ridge, slow, green to violet
5. molten metal cooling, dark crust forming, orange cracks
6. knitted wool texture slowly breathing
7. bioluminescent jellyfish pulsing in deep water
8. oil slick on wet asphalt shifting colours

Each names a subject, a palette and a motion, which is one axis per scoring dimension in `rubric.md`.

## Banned

**lava lamp, plasma, plain gradients.**

These are the classic beginner shader exercises. There are thousands of each on Shadertoy, so the model writes them correctly on the first attempt. Demoing one means generation 1 already looks right, generation 3 looks the same, and the product appears to do nothing.

## Selection rule

Demo the three where one-shot scores roughly **two acceptable out of six**.

- Six of six: the model does not need us. Unusable.
- Zero of six: convergence in three generations is unlikely, and a grid that stays black is not a demo.
- Two of six: failure is obvious in generation 1 and there is enough signal for the loop to climb.

## Acceptable, for counting purposes

All three must hold. Be strict: a generous count makes the product look unnecessary.

1. **Not blank.** Not pure black, not one flat colour, not white noise.
2. **It moves.** Compare the first and last frame.
3. **Recognisable.** A stranger shown the image and the words would agree they match.

Counts go in `thesis-test.md`.
