# Shader Arena

**We don't generate pictures. We generate programs that draw them, and we let the model see what its program drew.**

A fragment shader is a small program that runs per pixel per frame. LLMs write plausible GLSL and cannot tell which of six plausible programs actually renders as asked — the feedback signal is an image, and nothing in the pipeline ever looks at it. A shader that compiles cleanly and outputs pure black is, to every existing tool, a success.

We close that loop. Generate six candidates, render each in its own sandbox, screenshot three frames, score the frames, keep the best two, mutate with the critique, repeat. The grid of candidates evolves on screen in real time, with generation 1 pinned beside it as the one-shot control.

## Read in this order

| Doc | What it is | Who must read it |
|---|---|---|
| `README.md` | This file — thesis, rules, prompts | Everyone |
| [`01-contracts.md`](01-contracts.md) | The five frozen contracts and the env | Everyone |
| [`02-harness-vuk.md`](02-harness-vuk.md) | Harness, Docker image, Daytona snapshot | Vuk |
| [`03-orchestrator-pavle.md`](03-orchestrator-pavle.md) | Codegen, sandboxes, scoring, loop | Pavle |
| [`04-web-djordje.md`](04-web-djordje.md) | Convex, UI, deploys | Djordje |
| [`05-timeline.md`](05-timeline.md) | Schedule, gates, cut list | Everyone |
| [`06-shipping.md`](06-shipping.md) | Video, submission, judge answers | Pavle, then everyone at 17:00 |

## Team and folders

Each person owns one folder and does not write outside it.

```
harness/       Vuk       harness.html, render.ts, Dockerfile, fixtures/, README.md
orchestrator/  Pavle     generate.ts, sandbox.ts, score.ts, loop.ts, server.ts
web/           Djordje   Convex project (convex/) + Vite React UI (src/) + Render config
prompts/       shared    codegen.md, rubric.md, mutation.md, demo-candidates.md, thesis-test.md
docs/          shared    this folder
.env.example   shared    every variable listed, no values
```

Each folder has its own `package.json`. No workspace tooling.

## Working rules

- The contracts in `01-contracts.md` are **frozen**. If you think one must change, stop and say so. Do not change it unilaterally.
- When another person's piece isn't ready, **build against the stub** named in your doc. Never wait.
- TypeScript everywhere, Node 20+, npm. No new services, no auth, no test framework. Fixtures and a manual check are enough today.
- Ask whether the standard library does it before adding a dependency.
- Never commit `.env`. Keep `.env.example` current.
- Log every external call (x.ai, Daytona, Convex, Fal) with its duration.
- **Keep the demo path working at all times.** A half-built feature that breaks the grid is worse than no feature.

## Demo prompts

Full list in `prompts/demo-candidates.md`. The thesis test picks the three where one-shot gets roughly two of six acceptable.

1. ink dropping into water, slow, black on paper white
2. rain on a night window with city bokeh behind it
3. stained glass window with the sun moving behind it
4. aurora over a dark ridge, slow, green to violet
5. molten metal cooling, dark crust forming, orange cracks
6. knitted wool texture slowly breathing
7. bioluminescent jellyfish pulsing in deep water
8. oil slick on wet asphalt shifting colours

**Banned for the demo: lava lamp, plasma, plain gradients.** One-shot gets those right and the loop looks like decoration. This is the most important line in this file.

## The one-shot column

Generation 1 stays pinned on the left of the UI, permanently, labelled **"one shot"**, against the latest generation on the right.

This is not a nice-to-have. It is the thesis made visible, and it is the standing answer to the question that kills demos in this category — *wouldn't the model just do that in one shot?* Never cut it.
