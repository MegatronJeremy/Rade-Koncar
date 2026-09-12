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

## The total is the plain sum, and it does not choose survivors

`total = palette + motion + subject`, out of 30. It is displayed next to those three numbers, so it has to be the number they add up to. It is descriptive.

Selection is a separate question, answered by the ranking call below, because an absolute total is the wrong instrument for it. Subject is where candidates actually fail: of the 48 one-shot candidates in `experiments/003`, 24 were unrecognisable against 9 static and 2 blank. Yet an equal sum lets palette and motion outvote subject, which inverts this file's own instruction that a gorgeous nebula scores 0 when the prompt said knitted wool. Equal weighting gives that nebula 10 + 10 + 0 = 20 and a scruffy but correct wool texture 5 + 5 + 9 = 19, and the nebula becomes a parent.

When the ranking call is unavailable, `score.ts` falls back to ordering by `0.75 * palette + 0.75 * motion + 1.5 * subject`, which puts that pair at 15 against 21. That weighting is never shown, precisely because it would not add up on screen.

## Ranking a generation

One call per generation, after every candidate has its own score. Same system prompt, different question.

The per-candidate call stays because the UI subscribes to each score as it lands, and tiles changing while the user watches is most of why the grid feels alive. Batching the six into one call would leave the grid inert until all six finished.

What the ranking call adds is calibration. Scoring a candidate alone gives the model no anchor for what 7 rather than 8 means; ordering six it can see at once does, and ordering is all survivor selection needs.

```
Rank these candidates best first against the description.
Return `order` as candidate numbers, best first, every candidate exactly once.
```

Returns `{ order: number[], reason: string }`. `order` carries candidate numbers, not positions.

The answer is advisory. Nothing forces the model to return a permutation, so `loop.ts` rejects any order that is not one and falls back to the weighted score. A malformed model reply must never fail a run.

## Comparing the first generation with the last

One call at the end of a run, on the two best.

Absolute scores drift between generations, so a generation 3 total below generation 1's settles nothing. The product's whole claim is that three rounds improve on one, and this is the only measurement that speaks to it directly.

```
Two shaders, each as three frames. Which matches the description better?
Judge only the description. Answer `neither` if they are genuinely equal.
```

Returns `{ better: "first" | "second" | "neither", reason: string }`, where first is generation 1. Logged by the orchestrator as `IMPROVED`, `REGRESSED` or `NO CHANGE`.
