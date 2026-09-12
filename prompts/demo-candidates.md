# Demo prompt candidates

Owner: Pavle. Input to the thesis test. The three we demo are chosen from this list.

## The five

1. a red ball bouncing on a white floor
2. an analog clock with a sweeping second hand
3. snow falling and settling into a pile at the bottom
4. a candle flame flickering in the dark
5. a pendulum swinging back and forth

Every one is verifiable in a second by someone who knows nothing about graphics. That matters twice: it makes the thesis test fast to judge, and it makes the demo legible. A judge watching a bouncing ball go from hovering to bouncing needs no explanation. A judge watching abstract art get subtly better cannot tell whether the loop did anything.

They are also hard for the right reason. A fragment shader is stateless: every pixel computes itself from scratch each frame, knowing nothing about the previous frame or its neighbours. So a bounce curve over `iTime`, three hands rotating at three rates, or snow that accumulates all have to be faked, and the model reliably gets them half right.

| Prompt | Where one-shot goes wrong |
|---|---|
| bouncing ball | Ball hovers, drifts, or passes through the floor. Bounce has no gravity curve |
| analog clock | Hand angles and rates wrong, hands missing, no centre pivot |
| settling snow | Accumulation is impossible statelessly, so the pile never forms |
| candle flame | Static orange blob instead of a flame shape with flicker |
| pendulum | Constant-speed swing rather than slowing at the extremes |

## Rejected as too abstract

An earlier list ran ink in water, rain on a night window, molten metal and a jellyfish, recorded in `experiments/001-oneshot-sonnet-5`. All 24 candidates compiled and rendered, but "does this look like ink in water" is a judgment call even for a person, which makes it slow to score and unconvincing on video. Concrete beats atmospheric.

Also avoid: traffic light cycling, loading spinner, progress bar. Those come back six of six.

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
