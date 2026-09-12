# CLAUDE.md

Read `docs/README.md` before doing anything, then `docs/01-contracts.md`, then the doc for the person you are working as.

Rules for every session:

- You work as exactly one person (Vuk, Pavle or Djordje). Ask which if not told. Do that person's bullet from their doc and nothing outside their folder.
  - Vuk → `docs/02-harness-vuk.md`
  - Pavle → `docs/03-orchestrator-pavle.md`
  - Djordje → `docs/04-web-djordje.md`
- The contracts in `docs/01-contracts.md` are frozen. If you think one must change, stop and say so; do not change it.
- When another person's piece isn't ready, build against the stub described in their doc. Never wait.
- TypeScript everywhere, Node 20+, npm. No new services, no auth, no test framework. Fixtures and a manual check are enough today.
- Ask whether the standard library does it before adding a dependency.
- Never commit `.env`. Keep `.env.example` current.
- Log every external call (x.ai, Daytona, Convex, Fal) with its duration.
- Keep the demo path working at all times. A half-built feature that breaks the grid is worse than no feature.
- Timeline, gates and the cut list are in `docs/05-timeline.md`. Shipping requirements are in `docs/06-shipping.md`.
