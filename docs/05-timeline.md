# Timeline, dependencies, gates and cut list

## The shape of the day

One-day hackathon, Belgrade, Saturday 12 September 2026. Hacking started at 11:00. **Submission closes at 19:00.** Judging happens offline afterwards; there is also a room vote at 19:00 for a separate prize.

The plan is reverse-planned from 19:00, not forward from now. **Nothing ships after 17:00** — that window is video, README, submission and rehearsal, and it is not padding.

## Schedule

| Time | What |
|---|---|
| **11:30** | Scope frozen. No new ideas after this |
| **12:15** | Thesis-test results written to `prompts/thesis-test.md` |
| **12:30** | Five minutes together: pick the three demo prompts. Reference mode becomes core only if one-shot scored five of six on everything. Pavle asks Djordje for the second Render service |
| **13:00** | **Gate:** one screenshot out of one real sandbox, visible in the grid at the public URL |
| **15:30** | **Feature freeze.** Three generations end to end from the public URL on one demo prompt, one-shot column showing |
| 15:30–17:00 | Run the three demo prompts. Pick the one with the biggest visible gap between generation 1 and 3. Fix only that path. **Pin the best run in Convex** |
| **16:30** | Orchestrator deploy call. Not deployed by now means do not deploy: hide the prompt box, pin the best run |
| **17:00** | Record. Two takes |
| **18:00** | Submit the form. See `06-shipping.md`. Never submit at 18:58 |
| 18:00–19:00 | README, repo tidy, resubmit final links |
| **19:00** | Deadline |

## Dependencies and handoffs

The three folders are independent from minute zero. There are four handoff points, and two of them land on Vuk, who is also the critical path — so his first thirty minutes are ordered to unblock other people **before** he starts on his own hard problem.

```
Vuk: fixtures (good/bad/hang.glsl + 3 PNGs)  ──►  Pavle's sandbox stub       ~12:30
Vuk: standalone harness.html tab             ──►  Pavle's THESIS TEST         12:15   ← tightest
Djordje: Convex schema deployed + CONVEX_URL ──►  Pavle's loop.ts writes     ~13:00
Vuk: snapshot name in harness/README.md      ──►  Pavle swaps out the stub   ~13:00

later:
Pavle: score.ts prefilter functions          ──►  Pavle's scoring pipeline   ~14:00
Pavle: VITE_ORCHESTRATOR_URL                 ──►  Djordje's prompt box       second bullet
```

### Vuk's first thirty minutes, in this order

The 12:15 thesis test is the tightest coupling in the day and it lands on the person who also owns the 13:00 snapshot gate. So:

1. **0–5 min — fixtures.** `good.glsl`, `bad.glsl`, `hang.glsl` and three real PNGs in `harness/fixtures/`. Frees Pavle's stub immediately, costs almost nothing.
2. **5–35 min — `harness.html` standalone**, textarea and a Run button. Frees the thesis test.
3. **Then** `render.ts`, the Dockerfile and the snapshot.

Do not start the Docker work before step 2 is usable in a browser tab.

### Two de-riskers

**Pavle does not wait on Convex for `loop.ts`.** The state machine — queued, rendering, scoring, scored, survived — does not need Convex to exist. Write it against an in-memory logger and swap in the mutation calls when `CONVEX_URL` lands. Otherwise there is dead time between roughly 12:45 and 13:00.

**`score.ts` prefilter functions belong to Pavle, not Vuk.** They are pure functions over pixel buffers, Pavle is the only consumer, and Vuk is on the critical path twice already. Moved — see `03-orchestrator-pavle.md`.

### Standing rule

Nobody waits. Every owner doc names the stub to build against. **If you are blocked, you are building against the wrong thing.**

## Gates

A gate is a yes/no question with a pre-decided answer for "no". The point is to make the bad decision cheap and early, rather than discovering it at 17:00 when nothing can be changed.

| Time | Gate | If it fails |
|---|---|---|
| 12:15 | One-shot demonstrably fails on at least three prompts | **The loop is decoration.** Stop and rethink with the whole team — this is exactly why the test is early |
| 12:50 | Render URL live on a hello world | Djordje drops everything else until it is |
| **13:00** | One screenshot out of one real sandbox in the grid at the public URL | Switch to one sandbox, one Chromium, six pages. Decide at 13:00, **not 14:00** |
| 13:30 | Daytona concurrency limit known | Batches, or `POP = 4` |
| 15:30 | Three generations end to end on the public URL | Cut from the list below until it is true |
| 16:30 | Orchestrator deployed | Expected outcome is no. Hide the prompt box, pin the best run, move to the recording |

## Cut list, in order, if behind

Cut from the top. Each of these removes work without removing the thing being demonstrated.

1. **Reference mode** (if it stayed stretch) — a second input modality we can live without
2. **Live editor** — keep source display and a copy button
3. **Critique-driven mutation** — seed a fresh generation from the two survivor sources without feeding the critiques back
4. **`POP` 6 → 4** — four tiles still reads as a population
5. **`GENS` 3 → 2** — two generations still show a before and after

The Wall (`04-web-djordje.md`) is not on this list because it is not in scope. It is a 15:30 stretch, decided out loud.

## Never cut

- **The grid** — it is the product
- **The scoring** — without it this is just six random shaders
- **Per-sandbox rendering** — it is the isolation story and a separate prize
- **The one-shot column** — it is the proof, and the answer to the hardest question we will be asked
