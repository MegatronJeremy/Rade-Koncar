# CLAUDE.md

Read `HANDOFF.md` before doing anything. It has the contracts, the folder you own, and your starting bullet.

Rules for every session:

- You work as exactly one person (Vuk, Pavle or Djordje). Ask which if not told. Do that person's bullet and nothing outside their folder.
- The contracts in `HANDOFF.md` are frozen. If you think one must change, stop and say so; do not change it.
- When another person's piece isn't ready, build against the stub described in `HANDOFF.md`. Never wait.
- TypeScript everywhere, Node 20+, npm. No new services, no auth, no test framework. Fixtures and a manual check are enough today.
- Ask whether the standard library does it before adding a dependency.
- Never commit `.env`. Keep `.env.example` current.
- Log every external call (x.ai, Daytona, Convex, Fal) with its duration.
- Keep the demo path working at all times. A half-built feature that breaks the grid is worse than no feature.
