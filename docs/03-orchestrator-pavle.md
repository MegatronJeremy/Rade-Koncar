# Orchestrator — Pavle

You own `orchestrator/`. Standalone Node process, not Convex actions.

## First bullet

Build `generate.ts` — prompt → six `Candidate`s via x.ai, signature check, one repair call with the log on `compile_error` — and `sandbox.ts` — `renderInSandbox(sandbox, source): Promise<HarnessResult>`.

Build both **against a stub** that copies the three fixture PNGs from `harness/fixtures/` and returns `ok`. Never wait for Vuk. Swap the stub for the real sandbox the moment the snapshot name appears in `harness/README.md`.

Then `loop.ts` and `server.ts`.

**Done when** `POST /run` executes three generations end to end against the stub and every state change — queued, rendering, scoring, scored, survived — lands in Convex as it happens.

## The thesis test — 12:15 at the latest

**Do this before building the loop.** It is the highest-value thirty minutes of the day.

For each prompt in `prompts/demo-candidates.md`, generate six one-shot candidates, paste them into Vuk's standalone harness tab, and count how many render acceptably. Write the counts into `prompts/thesis-test.md`.

Why it matters: if one-shot scores five or six out of six, the loop is decoration and the product needs rethinking. **We need to know that at 12:15, not at 17:00.** The three prompts we demo are the ones where one-shot gets roughly two of six.

At 12:30, five minutes with the whole team: pick the three demo prompts, and decide whether reference mode becomes core (it does only if one-shot scored five of six on everything, meaning text prompts aren't discriminating).

## Deploy — do not skip this

**The orchestrator runs on Render as a web service, not on your laptop.**

If it lives on a laptop, the public URL is a dead app the moment the machine sleeps or the wifi drops — and judges click that link days after the event, when we have all gone home. That is criterion #2, "working product", failing silently a week later.

Two things, do both:

1. Deploy `orchestrator/` to Render as a second web service. Djordje already has the account wired; ask him for it at 12:30 rather than at 17:00.
2. **Pin the best run** (`pinRun` mutation) so the public URL replays a real evolving grid even with the orchestrator down. See `04-web-djordje.md`.

CORS: the browser calls `POST /run` directly. Send permissive CORS headers or the prompt box fails in the browser while working fine from curl. Five minutes now, an hour if you find it at 16:00.

## Second bullet

- Real sandbox fan-out with reuse across generations, per-candidate timeout.
- Scoring pipeline — import Vuk's pure prefilter functions, then the vision call.
- Mutation prompt.
- Reference mode: Fal call at run start, reference stored on the run, image attached to the vision call.
- **If the Daytona concurrency limit is under six, decide by 13:30: batches, or `POP = 4`.** Do not discover this at 15:00.

## Logging

Log every external call — x.ai, Daytona, Convex, Fal — with its duration. When something is slow at 16:00 this is the only thing that will tell you which one.
