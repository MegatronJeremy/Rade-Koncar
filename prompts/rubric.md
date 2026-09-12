# Scoring rubric

Owner: Vuk. Consumed by `orchestrator/score.ts` through `llm.ts`. One vision call per candidate that survives the prefilter.

Provider neutral: the schema below is enforced by `zodOutputFormat` on the Anthropic path and parsed defensively on the x.ai path.

The call receives the three frames (t=0, 1, 2 seconds) and the original prompt.

## System

You judge whether a rendered shader matches a text description. You are shown three frames of the same shader at 0, 1 and 2 seconds.

Return **only** this JSON, no prose:

```json
{"palette": 0, "motion": 0, "subject": 0, "critique": "one line"}
```

### palette, 0 to 10

Do the colours match the described mood and materials?

- 0: unrelated colours, or the image is one flat tone
- 5: right family, wrong balance. The greens are there but it reads as neon rather than aurora
- 10: a colourist would pick these for this description

### motion, 0 to 10

Compare the three frames.

- 0: identical frames, nothing moves
- 5: something changes, although it is uniform drift or a global flicker rather than the described behaviour
- 10: the movement is the described movement. Slow means slow, pulsing means pulsing

### subject, 0 to 10

Would a stranger shown these frames and the description agree they match?

- 0: no relationship
- 5: the right category, the wrong thing. Fluid, but not ink in water
- 10: unmistakably the described subject

Judge the description, not beauty. A gorgeous nebula scores 0 on subject when the prompt said knitted wool.

### critique, one line

Written for the shader programmer who will revise this. Name the single biggest gap and, where you can, the direction to move: `edges too hard, needs diffusion at the boundary`. Not `could be better`. Under twenty words.

## User

```
Description: {PROMPT}
Frames at t=0, t=1, t=2 attached.
```

## What the model is not asked to decide

`flat` and the motion floor are computed arithmetically from the pixels in `score.ts` before this call, and they override the model. Standard deviation of luminance under 0.02 marks the candidate flat, scores it zero and skips this call entirely. A mean absolute difference under 0.01 forces `motion` to 0 whatever the model returns.

That difference is the **largest of t0/t1, t1/t2 and t0/t2**, not t0 against t2 alone. Comparing only the ends calls anything whose period divides two seconds motionless, because it has returned to where it started; a pendulum is the obvious case. Across the 48 candidates in `experiments/003` this rescues none of them, so it closes a hole rather than fixing observed damage.

This split is deliberate: is it blank and does it move are the two questions pixel maths answers with certainty and a vision model answers unreliably. The model is left with palette and subject, which it is good at.

## How the three become a total

Not an equal sum. `score.ts` computes:

```
total = round(0.75 * palette + 0.75 * motion + 1.5 * subject)
```

Still out of 30. Subject carries double the weight of either other axis.

An equal sum lets palette and motion outvote subject, which inverts this file's own instruction that a gorgeous nebula scores 0 when the prompt said knitted wool. Equal weighting gives that nebula 10 + 10 + 0 = 20 and a scruffy but correct wool texture 5 + 5 + 9 = 19, so the nebula becomes a parent. Weighted, it is 15 against 21.

Subject is also where candidates actually fail. Of the 48 one-shot candidates in `experiments/003`, 24 were unrecognisable, 9 did not move and 2 were blank.

The model is not told the weights. It scores each axis on its own terms and the arithmetic happens afterwards.
