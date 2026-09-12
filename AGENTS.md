# AGENTS.md: Shader Arena

An AI writes six fragment shaders from one text prompt. Each runs in an isolated Daytona sandbox
that screenshots what it drew at t=0, 1 and 2 seconds. A vision model scores those screenshots
against the prompt and writes a one-line critique. The best two survive, get mutated into six
children, three generations total. The user watches a grid of six tiles evolve, with generation 1
pinned beside it as the control.

The premise: an LLM cannot tell which of six plausible shaders actually renders as asked, because
the output is an image and nothing in a normal code pipeline ever looks at one. A shader that
compiles cleanly and outputs pure black is, to a compiler, a complete success. So the fitness
function here is an image, judged by a model that can see.

Built in one day at a hackathon in Belgrade, 12 September 2026, by three people working in three
folders at once. TypeScript everywhere, Node 20+, npm, one `package.json` per folder. No monorepo
tooling: it costs setup time and buys nothing in a day.

## Read before touching anything

| Doc | What it is |
|---|---|
| [`docs/README.md`](docs/README.md) | The product, the working rules, the demo prompts |
| [`docs/00-primer.md`](docs/00-primer.md) | Shaders, WebGL and the partner stack from zero. Read this first if you have not written a shader; everything else assumes it |
| [`docs/01-contracts.md`](docs/01-contracts.md) | The five frozen interfaces |
| [`docs/05-timeline.md`](docs/05-timeline.md) | Schedule, gates, dependencies, cut list |
| [`docs/06-shipping.md`](docs/06-shipping.md) | Video, submission requirements, judge answers |

Then the doc for whoever you are working as.

## You work as exactly one person

Ask which if you were not told. Do that person's bullet and write nothing outside their folder.
Three people edit this repo simultaneously; folder ownership is what keeps that free of merge
conflicts and of waiting.

| Folder | Owner | Doc | Contents |
|---|---|---|---|
| `harness/` | Vuk | [`docs/02-harness-vuk.md`](docs/02-harness-vuk.md) | `harness.html`, `render.ts`, `Dockerfile`, `fixtures/`, `README.md` |
| `orchestrator/` | Pavle | [`docs/03-orchestrator-pavle.md`](docs/03-orchestrator-pavle.md) | `generate.ts`, `sandbox.ts`, `score.ts`, `loop.ts`, `server.ts` |
| `web/` | Djordje | [`docs/04-web-djordje.md`](docs/04-web-djordje.md) | Convex backend (`convex/`), Vite React UI (`src/`), Render config |
| `prompts/` | shared | | `codegen.md`, `rubric.md`, `mutation.md`, `samples.md`, `thesis-test.md` |
| `experiments/` | Pavle | [`experiments/README.md`](experiments/README.md) | Versioned evidence: candidates, frames, manifests, and the review page |
| `docs/` | shared | | this folder |

## The contracts are frozen

[`docs/01-contracts.md`](docs/01-contracts.md) defines the five places the folders meet: the
harness CLI and its `HarnessResult`, the `Candidate` shape, the Convex schema, the two-stage score,
and the loop constants. They were written before anyone coded so nobody waits on anybody.

**Do not change one.** If you believe one must change, stop and say so. A unilateral change breaks
someone else's work silently, and they find out when the pieces are joined, which is the worst
possible moment.

## Never wait for another person

Every owner doc names the stub to build against: fixture PNGs for the sandbox call, an in-memory
logger for the Convex mutations, a seeded fake run for the grid. If you are blocked, you are
building against the wrong thing. Swap a stub for the real dependency the moment it lands; the
signatures are identical by construction, so it is a one-line change.

## Keep the demo path working at all times

A half-built feature that breaks the grid is worse than no feature. We are judged on a video of one
path working, not on how much exists. The cut list, in order, is in
[`docs/05-timeline.md`](docs/05-timeline.md); never-cut is the grid, the scoring, per-sandbox
rendering, and the one-shot column.

**The one-shot column is the thesis made visible**, not decoration: generation 1 pinned left, newest
generation right. It is the standing answer to the question that kills demos in this category
(*wouldn't the model just get it right first try?*). Build it into the layout from the start;
retrofitting a two-column comparison late is exactly the change that breaks the demo on the day.

**Demo prompts are chosen for where the model fails one-shot.** Lava lamp, plasma and plain
gradients are banned: they are the classic beginner exercises, there are thousands on Shadertoy, the
model writes them correctly first try, and demoing one makes the product look like it does nothing.

## Invariants that produce a misleading symptom when broken

Each of these fails as something other than what it is, which is why they are written down.

- **`--enable-unsafe-swiftshader`** (plus `--use-gl=angle --use-angle=swiftshader`) on Chromium.
  Recent versions disable the software WebGL fallback unless asked, and a sandbox has no GPU. The
  symptom is a blank image, indistinguishable from a broken shader. Also `--no-sandbox` (Chromium
  refuses to run as root, which is the container default) and `--disable-dev-shm-usage` (64 MB
  `/dev/shm` in a container, Chromium crashes partway through).
- **`preserveDrawingBuffer: true`** on the WebGL context, or the browser may discard the buffer
  right after drawing and `toDataURL()` returns an empty image.
- **No animation loop and no wall clock in the harness.** One explicit `renderAt(t)` per frame with
  `iTime` set to 0.0, 1.0, 2.0. A wall clock makes the same shader produce different frames on
  different runs, so nothing downstream is reproducible or comparable.
- **Exit code 0 for `compile_error` and `timeout`.** A failed shader is a result in this product, not
  an exception: those tiles are content, shown red with the compiler message. Non-zero means the
  harness itself broke (no browser, no page). In generation 1 a large fraction of candidates do not
  compile, so an orchestrator that treats that as a crash falls over in the generation that matters
  most for the demo.
- **The Playwright base image tag must match the Playwright version in `harness/package.json`
  exactly**, or Chromium is not found. The symptom reads as broken infrastructure rather than a
  version mismatch.
- **Permissive CORS on the orchestrator.** The browser calls `POST /run` cross-origin, so without it
  the prompt box fails in the browser while working perfectly from curl.
- **Frames are files, never base64 in JSON or a Convex document.** Three inline PNGs are roughly a
  megabyte of text per candidate, against a document size limit.
- **Write `candidates.status` eagerly**, at every transition. The UI subscribes to it, so tiles
  change while the user watches. That is most of why the demo feels alive, at one mutation call per
  transition.

## Stack notes

- **x.ai** is OpenAI-compatible chat completions: the standard OpenAI SDK with a different `baseURL`
  and key. The model id comes from `XAI_MODEL`. Do not hardcode one; ids change and a stale one fails
  at the worst time.
- **Daytona** ships a TypeScript SDK. Verify the exact method names for create-from-snapshot, upload,
  exec and download in its README before writing `sandbox.ts`. Six sandboxes are created once per run
  and reused across all three generations.
- **Convex** re-renders subscribed React components by itself when the data changes. Lean on that
  rather than building refresh logic. Frames go to file storage via `generateUploadUrl`.
- **The orchestrator is deployed to Render**, not run from a laptop. Judges click the public URL days
  after the event; a laptop process is the "working product" criterion failing silently a week later.
  The pinned run (`pinRun`) is the front door for that visit, not a fallback.
- **Fal** (reference mode only) needs `abstract, full-frame, seamless, no objects, no text,
  procedural texture` appended to the diffusion prompt. A photoreal reference never converges,
  because a shader cannot produce a photograph of a specific object and the score never improves.
- Ask whether the standard library does it before adding a dependency. No new services, no auth, no
  test framework: fixtures and a manual check are enough today.
- Never commit `.env`. Keep `.env.example` current, every variable listed with no values.
- **Log every external call (x.ai, Daytona, Convex, Fal) with its duration.** When a run takes ninety
  seconds and should take twenty, this is the only thing that says which of the four is responsible.

## How to work

- **One increment per step**, and the repo stays in a working state after each. Small reviewable
  changes beat big batches.
- **Review before push, and push is gated on explicit approval.** Show the diff or the key snippets
  with enough surrounding context to read like a real PR: what changed, why it was done that way, the
  tradeoffs, and what remains unverified. The same gate covers anything else outward-facing or hard
  to reverse.
- **Verify NUMBERS, not just actions.** Never state a measurement, a timing, or a one-shot pass count
  that was not actually produced. If a measurement is unfinished, say so. A fabricated number is
  worse than "not measured yet", and the thesis test is a count that decides whether this product has
  a reason to exist.
- **"Looks correct" is only provable by looking.** A shader that compiles proves nothing, which is
  the entire premise of this repo. Reserve "it works" for after a PNG has been seen.
- On a rendering bug, lead with observation (when does it NOT happen?) and bisect with probes. Do not
  theory-chain fixes.
- **Flag conflicts of interest.** When reviewing work you produced earlier, say so, so the verdict can
  be weighted.
- Assume deep fundamentals in the reader: terse and correct beats verbose and hedged.

## Documentation

The markdown in this repo is a closed set. Do not add to it.

| File | Owner | Purpose |
|---|---|---|
| `README.md` (root) | Djordje | Public: problem, what it does, stack, run steps. A submission requirement, judged, and not the place for contributor workflow |
| `AGENTS.md`, `CLAUDE.md` | shared | This guidance |
| `docs/*.md` | per the table above | The plan, the contracts, the schedule |
| `harness/README.md` | Vuk | Snapshot name and the exact command line, which is how Pavle knows to swap out his stub |
| `prompts/codegen.md`, `prompts/rubric.md` | Vuk | Model instructions |
| `prompts/mutation.md`, `prompts/samples.md`, `prompts/thesis-test.md` | Pavle | Model instructions, the sample prompts, and the one-shot counts |
| `experiments/README.md` | Pavle | What each experiment measured and how to rerun it |
| `.env.example` | shared | Every variable, no values |

No `PROGRESS.md`, no `NOTES.md`, no `SUMMARY.md`, no plan or handoff files. A new markdown file is
almost always status wearing a filename, and status in git rots and then costs a churn commit to
correct.

Doc ownership mirrors folder ownership: edit your own owner doc, propose changes to anyone else's
rather than making them. [`docs/01-contracts.md`](docs/01-contracts.md) is frozen as a file, not
only as a set of shapes.

**Write a fact down the moment you learn it, in the doc that needs it.** Three sessions run in
parallel and cannot see each other's terminals. The snapshot name, the Daytona concurrency limit,
the model id that actually accepts image input, a threshold tuned against fixtures: each is inert in
your scrollback and load-bearing in a file. The alternative to a two-line doc edit is someone else
rediscovering the same thing at 16:00.

## Writing: comments, docs, commits

- **Maximal information, minimal text.** Cut every word that adds none. Keep the quantitative (names,
  counts, thresholds) and the qualitative (why, tradeoff), and cut the connective overhead between
  them.
- **Committed artifacts state durable facts, not status.** No work log, no TODO, no "as of this
  change". Ephemeral status belongs in the docs' timeline or in the room, where it is meant to
  change; in a file it rots and forces a churn commit to correct it.
- **Comments: default to none.** Names carry WHAT. Comment only a non-obvious WHY the code cannot
  express: a hidden constraint, a load-bearing ordering, a workaround, or domain a reader cannot
  derive from the code. Cold-reader test: would a competent reader who does not already hold this
  domain in their head be lost here? Prefer a structural fix (named constant, better name, small
  helper) over a comment. Never restate the signature or narrate the line.
- **No em-dashes, anywhere.** The glyph is not the whole problem: the tell is clauses joined by
  adjacency instead of by a stated relationship, so deleting the character alone relocates the habit
  into comma splices and stacked parentheticals. Name the relationship instead. A colon if the second
  half explains the first, "although" or "since" if it qualifies, parentheses for a genuine aside. A
  plain hyphen dash is fine.
- **Revise, do not just constrain.** Run a second pass over your own draft: with the whole clause in
  context the connective can match how the sentence actually ended, which an upfront ban cannot do.
  Strip the other AI-writing tells on that pass (the "not just X, but Y" antithesis, rule-of-three
  lists, hollow puffery).
- **Keep contributor workflow out of the public README.** It is for someone using the thing. Build,
  deploy and fixture process lives next to the code it concerns.
