# Web — Djordje

You own `web/`: the Convex project (`convex/`), the Vite React UI (`src/`), and the Render config.

## Render green first

Before anything else, get a public URL loading a hello world, auto-deploying from `main`. Nothing else matters until that is true — a live URL is a hard requirement and every hour we delay it is an hour the deploy problem could be hiding in.

You are also the account owner for **two** Render services:

| Service | Type | Owner |
|---|---|---|
| `web/` | Static site | You |
| `orchestrator/` | Web service | Pavle deploys, you wire the account |

Pavle will ask for the second one around 12:30. Say yes then, not at 17:00.

## First bullet — done by 13:00

Define the Convex schema from `01-contracts.md`, the mutations and queries listed there including `generateUploadUrl`, and a grid page subscribed to `latestRun` showing one tile per candidate — `t1` frame, status, score, strategy label — with `compile_error` tiles showing the log text instead of an image.

**Seed it with a fake run of three generations** so it visibly works before anything real exists. Do not wait for Pavle or Vuk.

Deploy to Render.

**Done when** a teammate opens the public URL on a phone and sees the fake run.

## The one-shot column

Generation 1 is pinned on the left, permanently, labelled **"one shot"**. The latest generation is on the right.

This is the thesis made visible and it is on the never-cut list. Build it into the layout from the start rather than bolting it on — retrofitting a two-column comparison at 16:00 is exactly the kind of change that breaks the demo path.

## The pinned-run landing state

The public URL must show a real evolving grid **even when the orchestrator is down**.

- `pinnedRun` query returns the run flagged by Pavle's `pinRun`.
- With no live run in progress, the grid renders the pinned run: full three generations, one-shot column, scores, critiques.
- A live run takes over the view while it is running.

Judges open this link days after the event, on a Thursday, with nothing else running. What they see is the pinned run. Treat it as the product's front door, not a fallback.

## Second bullet

- Tiles cycle through their three frames on a 500 ms timer.
- Comparison view: generation 1 pinned left labelled "one shot", latest generation right.
- Prompt box calling `POST /run` via `VITE_ORCHESTRATOR_URL`.
- Reference image upload.
- Survivors highlighted.
- Critique on hover.
- Phone check of everything.

## Stretch, decided out loud at 15:30 — the Wall

Not in scope, and it is a deliberate choice rather than an oversight.

The room votes on a community prize at 19:00. Nothing in the current build puts the room inside the product, which forfeits that vote. If — and only if — the three-generation path is polished and running at 15:30, the cheapest version is:

- A name field on the prompt box.
- A gallery route showing everyone's best shader with their name under it.

Nothing else. No auth, no accounts, no leaderboard. **If it is not obviously easy at 15:30, do not start it.** A polished core beats a rushed Wall.
