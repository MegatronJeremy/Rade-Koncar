# Web — Djordje

## What you own

`web/`: the Convex backend (`convex/`), the React UI (`src/`), and both Render deploys.

Your job is that **a stranger can open a public URL on a phone and watch six shaders evolve.** The public URL is a hard requirement of the hackathon — without it we cannot win anything, regardless of what we built.

Read [`00-primer.md`](00-primer.md) §§6–7 for the vocabulary and the Convex model, then [`01-contracts.md`](01-contracts.md) §3.

## Render green first

Before anything else: a public URL loading a hello world, auto-deploying from `main`.

Nothing else matters until that is true. Deploy problems are the classic way a hackathon team discovers at 18:30 that it has no submission, and every hour we delay is an hour the problem stays hidden.

| Service | Type | Deployed by | When |
|---|---|---|---|
| `web/` | Static site | You | Immediately, before anything else |
| `orchestrator/` | Web service | Pavle, on your account | Stretch. Decided at 16:30, often not at all |

Only the first is required. Pavle runs the orchestrator on his laptop all day, because the provider he uses locally cannot authenticate in a container. If he asks for the second service, wire it; if 16:30 arrives without it, that is the expected outcome and not a problem.

**What carries the product instead is the pinned run.** Your static site plus Convex plus a pinned run is a complete, judgeable product with no orchestrator anywhere.

## First bullet — done by 13:00

Define the Convex schema from `01-contracts.md` §3, the mutations and queries listed there including `generateUploadUrl`, and a grid page subscribed to `latestRun` showing one tile per candidate: the `t1` frame, its status, its score, its strategy label. `compile_error` tiles show the compiler message as text instead of an image.

**Seed it with a fake run of three generations** so it visibly works before anything real exists. You should never be waiting for Pavle or Vuk.

Deploy it.

**Done when** a teammate opens the public URL on a phone and sees the fake run.

### A note on Convex, if it is new to you

You define a schema and write query and mutation functions in TypeScript. The React client subscribes to a query with `useQuery`, and **when the underlying data changes the component re-renders by itself** — no polling, no websockets, no state syncing.

This is why the evolving grid is almost free for us: Pavle writes `candidates.status` as each shader moves through the pipeline, and the tiles animate on their own. Lean on it rather than building any refresh logic.

## The one-shot column

Generation 1 stays pinned on the left, permanently, labelled **"one shot"**. The newest generation is on the right.

This is the thesis made visible: the left column is what the AI produces with no feedback loop, the right is the same prompt after three rounds of looking at its own output. It is the standing answer to the question that kills demos in this category — *wouldn't the model just get it right first try?*

**Build it into the layout from the start.** Retrofitting a two-column comparison at 16:00 is exactly the kind of change that breaks the demo path on the day. It is on the never-cut list.

## Graceful degradation: required, not a nicety

The orchestrator is usually unreachable from the deployed site. **A judge must never see a red error.**

- `VITE_ORCHESTRATOR_URL` may be **unset** in the deployed build. Handle absent config, not just a failed fetch.
- On unset or unreachable, hide the prompt input entirely and render the pinned run with one quiet line: *live runs during the event*.
- Never show a stack trace, a spinner that never resolves, or a disabled button with no explanation.

Twenty minutes of work, and it is the difference between a judge seeing a finished product and a judge seeing something broken. Build it whether or not the orchestrator is ever deployed.

## The pinned-run landing state

The public URL must show a real evolving grid **even when the orchestrator is down**.

- The `pinnedRun` query returns the run Pavle flagged with `pinRun`.
- With no live run in progress, the grid renders that pinned run in full: three generations, one-shot column, scores, critiques.
- A live run takes over the view while it is running.

Judges open this link days after the event, on a weekday, with nothing else running. What they see is the pinned run. **Treat it as the product's front door, not a fallback** — it is the version of the product most people who matter will ever see.

## Second bullet

- Tiles cycle through their three frames on a 500 ms timer. Three frames on a loop reads as motion and makes a static grid feel alive.
- Comparison view: generation 1 pinned left labelled "one shot", latest generation right.
- Prompt box calling `POST /run` via `VITE_ORCHESTRATOR_URL`.
- Reference image upload.
- Survivors highlighted — the two that became parents of the next generation.
- Critique on hover. The model's one-line explanation of what is wrong with a candidate is the most interesting text in the product; do not bury it.
- Phone check of everything.

## Stretch, decided out loud at 15:30 — the Wall

Not in scope, and that is a deliberate choice rather than an oversight.

There is a room vote at 19:00 for a separate prize. Nothing in the current build puts other attendees inside the product, which forfeits that vote. If — and only if — the three-generation path is polished and running at 15:30, the cheapest version is:

- A name field on the prompt box.
- A gallery route showing everyone's best shader with their name under it.

Nothing else. No auth, no accounts, no leaderboard.

**If it is not obviously easy at 15:30, do not start it.** A polished core beats a rushed Wall, and the cash prize is decided by judges watching a video, not by the room.
