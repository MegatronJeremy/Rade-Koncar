# Orchestrator — Pavle

## What you own

`orchestrator/`. You own the loop: **prompt in, six shaders out, rendered, scored, the best two mutated, three times over.**

It is a standalone Node process, not Convex functions. It calls x.ai to write shaders, Daytona to run them, and Convex to record everything as it happens.

Read [`00-primer.md`](00-primer.md) first if you have not written shaders — you do not need to write GLSL, but you need to know why a shader can compile perfectly and still be worthless, because that is the entire product. Then [`01-contracts.md`](01-contracts.md) §§1, 2, 4, 5.

## The five files

| File | Does |
|---|---|
| `generate.ts` | Prompt → six `Candidate`s via x.ai. Signature check, one repair call on `compile_error` |
| `sandbox.ts` | `renderInSandbox(sandbox, source): Promise<HarnessResult>` — ship source in, get frames back |
| `score.ts` | Prefilter arithmetic, then the vision call. Returns the score object |
| `loop.ts` | Three generations: generate, render six in parallel, score, pick two survivors, mutate |
| `server.ts` | `POST /run { prompt, mode, steering? }` and CORS |

## First bullet

Build `generate.ts` and `sandbox.ts` **against a stub** — a fake `renderInSandbox` that copies the three fixture PNGs from `harness/fixtures/` and returns `status: "ok"` after a short delay.

**Never wait for Vuk.** Swap the stub for the real sandbox the moment the snapshot name appears in `harness/README.md`. The signature is identical, so it is a one-line change.

Then `loop.ts` and `server.ts`.

**Done when** `POST /run` executes three generations end to end against the stub and every state change — queued, rendering, scoring, scored, survived — lands in Convex as it happens.

**Do not wait on Convex to write `loop.ts` either.** The state machine does not need Convex to exist: build it against an in-memory logger and swap in the mutation calls when Djordje's `CONVEX_URL` lands. Otherwise you are idle between roughly 12:45 and 13:00.

### Write status eagerly

Set `candidates.status` at every step — queued, rendering, scoring, scored. The UI subscribes to it, so tiles visibly change while the user watches. **That is most of why the demo feels alive rather than like a progress bar**, and it costs you one mutation call per transition.

### `compile_error` is not an error

In generation 1 a large fraction of candidates will not compile. `HarnessResult.status` of `compile_error` or `timeout` comes back with **exit code 0** and is a normal, expected outcome that gets stored and displayed as a red tile. Only a non-zero exit means the harness itself broke.

If you treat compile failures as exceptions your loop will fall over constantly in exactly the generation that matters most for the demo.

## The thesis test — 12:15 at the latest

**Do this before building the loop.** It is the highest-value thirty minutes of the day and it is not optional.

For each prompt in `prompts/demo-candidates.md`: generate six one-shot candidates, paste them one by one into Vuk's standalone harness tab, and count how many render acceptably. Write the counts into `prompts/thesis-test.md`.

Judge "acceptable" by the three criteria in `00-primer.md` §8 — not blank, it moves, you would recognise the prompt from the image. **Be strict.** A generous count makes our own product look unnecessary.

**Why this matters more than anything else you will do today:** our entire premise is that the model gets this wrong on the first attempt. If one-shot scores five or six out of six, the loop is decoration, the demo shows a grid that was already correct in round one, and we need to know that at 12:15 — not at 17:00 with the video half recorded.

The three prompts we demo are the ones where one-shot gets roughly two out of six. That is the sweet spot: bad enough that improvement is obvious, good enough that convergence is achievable in three generations.

At 12:30, five minutes with the whole team: pick the three demo prompts, and decide whether reference mode becomes core — it does only if one-shot scored five of six on everything, meaning text prompts are not discriminating and we need images as the target instead.

If Vuk's tab is not ready at 12:10, **run the candidates through Shadertoy in a browser tab instead.** Same test, same counts, zero dependency on our code.

## Deploy: local first, Render only if there is time

Run the orchestrator on your laptop all day with `LLM_PROVIDER=claude-cli`. Deploying it is a stretch goal, not a requirement, and here is why the requirement is already covered.

The hard requirement is a public URL that works. Djordje's static site plus Convex plus the **pinned run** satisfies it on its own: a judge opening the link days later watches a real three-generation run evolve with no orchestrator running anywhere. Deploying the orchestrator buys exactly one extra thing, which is a judge being able to type their own prompt.

So the pinned run is not a fallback, it is the delivery mechanism. **Call `pinRun` on the best run of the day and treat that as shipped.**

### Test `LLM_PROVIDER=xai` locally, once, early

This is the trap in "local now, deploy later". `claude-cli` cannot authenticate in a container, so deploying changes the provider **and** the environment in the same moment, and a failure could be either. Five minutes with `LLM_PROVIDER=xai` on your laptop reduces the deploy to one variable.

Prove the vision call specifically, not just codegen. It is the half that is unproven and the half the deployed path depends on.

### Stay deploy-ready for free

Three habits that cost nothing now and cost an hour at 17:00: config from env only, no absolute paths outside the harness output directory, CORS headers from the first commit. They are the laptop assumptions that accumulate quietly and then all fail at once.

### The 16:30 call

If the orchestrator is not deployed by 16:30, **do not deploy it.** Hide the prompt box, pin the best run, spend the time on the recording. Pushing an untested service live after feature freeze is how a working demo breaks.

## Second bullet

- Real sandbox fan-out with reuse across generations, per-candidate timeout.
- `score.ts` — the deterministic prefilter as pure functions over pixel buffers: `flat`, `motion`, histogram distance. **Yours, not Vuk's**: you are the only consumer and he is on the critical path twice.
- Scoring pipeline — prefilter first, vision call only on what survives it. Most generation-1 candidates are black, and a black candidate should cost you a standard deviation, not an API call.
- Mutation prompt.
- Reference mode: Fal call at run start, reference stored on the run, image attached to the vision call.
- **If the Daytona concurrency limit is under six, decide by 13:30: batches, or `POP = 4`.** Do not discover this at 15:00 — check the account limit early, it is a two-minute question.

## Logging

Log every external call — x.ai, Daytona, Convex, Fal — with its duration. At 16:00, when a run takes ninety seconds and it should take twenty, this is the only thing that will tell you which of the four is responsible.
