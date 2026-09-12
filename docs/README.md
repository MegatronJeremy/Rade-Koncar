# Shader Arena

## What this project is

**We don't generate pictures. We generate programs that draw them, and we let the model see what its program drew.**

You type a description — *"ink dropping into water, slow, black on paper white"*. An AI writes six small graphics programs that each try to draw that. Each program runs in an isolated cloud sandbox that screenshots what it produced. A vision model looks at those screenshots, scores them against your description, and says what's wrong with each. The two best survive, get mutated into six new variants, and it runs again.

On screen you watch a grid of six live animations get better across three rounds, with round one pinned beside it for comparison.

If you have never written a shader, read [`00-primer.md`](00-primer.md) first. It explains what a shader is, why AI is bad at writing them, and every piece of jargon in these docs. It takes about ten minutes and the rest of the documentation assumes it.

## Why this is worth building

A fragment shader is a small program that runs once per pixel, per frame, to compute a colour. Large language models write plausible-looking shader code and have **no way to tell which of six plausible programs actually renders as asked** — because the output is an image, and nothing in a normal code pipeline ever looks at an image.

A shader that compiles cleanly and outputs pure black is, to a compiler, a complete success. There are no tests. There is no error. The model has no idea it failed.

So every "AI writes shaders" tool works open-loop: generate, paste, squint, retry by hand. The human is the perception layer.

We close the loop. That is the whole idea, and it is one sentence: **the fitness function is an image, judged by a model that can see.**

## The context

One-day hackathon in Belgrade, Saturday 12 September 2026. Hacking runs 11:00 to a **19:00 submission deadline**. Three of us. Judging happens offline afterwards, on innovation first; there is also a room vote at 19:00.

Hard requirements, all of them: a public repo, a deployed public URL, and a short video. Details in [`06-shipping.md`](06-shipping.md).

## Read in this order

| Doc | What it is | Who must read it |
|---|---|---|
| `README.md` | This file — what we're building, rules, demo prompts | Everyone |
| [`00-primer.md`](00-primer.md) | **Shaders, WebGL and the partner stack from zero** | Everyone without graphics experience |
| [`01-contracts.md`](01-contracts.md) | The five frozen interfaces, each explained | Everyone |
| [`02-harness-vuk.md`](02-harness-vuk.md) | Rendering shaders to PNGs in a sandbox | Vuk |
| [`03-orchestrator-pavle.md`](03-orchestrator-pavle.md) | Codegen, sandboxes, scoring, the loop | Pavle |
| [`04-web-djordje.md`](04-web-djordje.md) | Convex, the UI, the deploys | Djordje |
| [`05-timeline.md`](05-timeline.md) | Schedule, gates, dependencies, cut list | Everyone |
| [`06-shipping.md`](06-shipping.md) | Video, submission, judge answers | Pavle, then everyone at 17:00 |

## Team and folders

Each person owns one folder and does not write outside it. This is how three people work at once without merge conflicts or waiting on each other.

```
harness/       Vuk       harness.html, render.ts, Dockerfile, fixtures/, README.md
orchestrator/  Pavle     generate.ts, sandbox.ts, score.ts, loop.ts, server.ts
web/           Djordje   Convex project (convex/) + Vite React UI (src/) + Render config
prompts/       shared    codegen.md, rubric.md, mutation.md, demo-candidates.md, thesis-test.md
docs/          shared    this folder
.env.example   shared    every variable listed, no values
```

Each folder has its own `package.json`. No monorepo tooling — it costs setup time and buys nothing in one day.

## Working rules

- **The contracts in `01-contracts.md` are frozen.** Three people are building against them simultaneously. If you think one must change, stop and say so out loud; changing one unilaterally breaks someone else's work silently.
- **Never wait for another person.** Every owner doc names a stub to build against. If you are blocked, you are building against the wrong thing.
- TypeScript everywhere, Node 20+, npm. No new services, no auth, no test framework. Fixtures and a manual check are enough for one day.
- Ask whether the standard library does it before adding a dependency.
- Never commit `.env`. Keep `.env.example` current.
- Log every external call (x.ai, Daytona, Convex, Fal) with its duration. At 16:00, when something is slow, this will be the only thing that tells you which one.
- **Keep the demo path working at all times.** A half-built feature that breaks the grid is worse than no feature. We are judged on a video of one path working, not on how much exists.

## Demo prompts

The full list lives in `prompts/demo-candidates.md`. We test all eight and demo the three where the AI does *worst* on its first try.

1. ink dropping into water, slow, black on paper white
2. rain on a night window with city bokeh behind it
3. stained glass window with the sun moving behind it
4. aurora over a dark ridge, slow, green to violet
5. molten metal cooling, dark crust forming, orange cracks
6. knitted wool texture slowly breathing
7. bioluminescent jellyfish pulsing in deep water
8. oil slick on wet asphalt shifting colours

**Banned for the demo: lava lamp, plasma, plain gradients.**

This is the most important line in this file, so here is the reasoning. Those three are the classic beginner shader exercises. There are thousands of them on Shadertoy, so the model writes them correctly on the first attempt. If we demo one, round one already looks right, round three looks the same, and our entire product appears to do nothing. **We must demo prompts where the first attempt visibly fails.** That is what the thesis test at 12:15 is for.

## The one-shot column

Round one stays pinned on the left of the screen, permanently, labelled **"one shot"**. The newest round is on the right.

This is not decoration. It is the thesis made visible, and it is the standing answer to the question that kills demos in this category: *wouldn't the model just get it right first try?* The left column is first try. The right column is three rounds later. Never cut it.
