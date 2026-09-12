# Timeline, gates and cut list

## Schedule

| Time | What |
|---|---|
| **11:30** | Scope frozen. No new ideas after this |
| **12:15** | Thesis-test results written to `prompts/thesis-test.md` |
| **12:30** | Five minutes together: pick the three demo prompts. Reference mode becomes core only if one-shot scored five of six on everything. Pavle asks Djordje for the second Render service |
| **13:00** | **Gate.** One screenshot out of one real sandbox, visible in the grid at the public URL |
| **15:30** | **Feature freeze.** Three generations end to end from the public URL on one demo prompt, one-shot column showing |
| 15:30–17:00 | Run the three demo prompts. Pick the one with the biggest visible gap between generation 1 and 3. Fix only that path. **Pin the best run in Convex** |
| **17:00** | Record. Two takes |
| **18:00** | Submit the form. See `06-shipping.md`. Never submit at 18:58 |
| 18:00–19:00 | README, repo tidy, resubmit final links |
| **19:00** | Deadline |

**Nothing ships after 17:00.** That window is video, README, submission and rehearsing the pitch.

## Gates

| Time | Gate | If it fails |
|---|---|---|
| 12:15 | One-shot demonstrably fails on at least three prompts | The loop is decoration. Stop and rethink with the whole team — this is why the test is early |
| 12:50 | Render URL live on a hello world | Djordje drops everything else until it is |
| **13:00** | One screenshot out of one real sandbox in the grid at the public URL | Switch to one sandbox, one Chromium, six pages. Decide at 13:00, **not 14:00** |
| 13:30 | Daytona concurrency limit known | Batches, or `POP = 4` |
| 15:30 | Three generations end to end on the public URL | Cut from the list below until it is true |

## Cut list, in order, if behind

1. Reference mode (if it stayed stretch)
2. Live editor (keep source display and a copy button)
3. Critique-driven mutation (seed a fresh generation with the two survivor sources)
4. `POP` 6 → 4
5. `GENS` 3 → 2

The Wall (`04-web-djordje.md`) is not on this list because it is not in scope. It is a 15:30 stretch, decided out loud.

## Never cut

- The grid
- The scoring
- Per-sandbox rendering
- **The one-shot column**
