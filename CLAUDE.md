# CLAUDE.md

## What this repo is

**Shader Arena.** An AI writes six small graphics programs (fragment shaders) from a text prompt, each runs in an isolated cloud sandbox that screenshots what it drew, a vision model scores those screenshots against the prompt, the best two survive and get mutated, three rounds. The user watches the grid evolve.

The point: LLMs cannot tell which of six plausible shaders actually renders as asked, because the output is an image and nothing in a normal pipeline ever looks at one. We close that loop.

Built in one day at a hackathon in Belgrade, 12 September 2026. Submission deadline 19:00.

## Read before doing anything

1. `docs/README.md` — what we are building and the working rules
2. `docs/00-primer.md` — shaders, WebGL and the partner stack from zero. **Read this if you have not written a shader before**; everything else assumes it
3. `docs/01-contracts.md` — the five frozen interfaces
4. The doc for the person you are working as

## Rules for every session

- You work as exactly **one person** (Vuk, Pavle or Djordje). Ask which if not told. Do that person's bullet from their doc and nothing outside their folder.
  - Vuk → `docs/02-harness-vuk.md` — renders shaders to PNGs in a sandbox
  - Pavle → `docs/03-orchestrator-pavle.md` — codegen, sandboxes, scoring, the loop
  - Djordje → `docs/04-web-djordje.md` — Convex, the UI, the deploys
- The contracts in `docs/01-contracts.md` are **frozen**. Three people build against them simultaneously. If you think one must change, stop and say so; do not change it.
- When another person's piece is not ready, **build against the stub described in your doc. Never wait.**
- TypeScript everywhere, Node 20+, npm. No new services, no auth, no test framework. Fixtures and a manual check are enough today.
- Ask whether the standard library does it before adding a dependency.
- Never commit `.env`. Keep `.env.example` current.
- Log every external call (x.ai, Daytona, Convex, Fal) with its duration.
- **Keep the demo path working at all times.** A half-built feature that breaks the grid is worse than no feature.

Timeline, dependencies, gates and the cut list: `docs/05-timeline.md`.
Video, submission requirements and the judge answers: `docs/06-shipping.md`.
