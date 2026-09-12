# Convex — data model and API

Contract 3 in `docs/01-contracts.md`. Public functions, no auth.

Set `CONVEX_URL` in the repo-root `.env` and write with `ConvexHttpClient`:

```ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../web/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const runId = await convex.mutation(api.runs.createRun, { prompt, mode: "text" });
```

## Mutations

| Function | Args | Returns |
|---|---|---|
| `api.runs.createRun` | `{ prompt, mode: "text" \| "reference", steering?, referenceId? }` | `Id<"runs">` |
| `api.runs.setRunStatus` | `{ runId, status: "queued" \| "running" \| "done" \| "failed" }` | — |
| `api.runs.pinRun` | `{ runId }` | — |
| `api.generations.createGeneration` | `{ runId, index }` | `Id<"generations">` |
| `api.generations.setGenerationStatus` | `{ generationId, status: "running" \| "done" }` | — |
| `api.candidates.createCandidate` | `{ runId, generationId, index, strategy, source, parentIds? }` | `Id<"candidates">` |
| `api.candidates.setCandidateStatus` | `{ candidateId, status, log? }` | — |
| `api.candidates.generateUploadUrl` | `{}` | upload URL `string` |
| `api.candidates.setCandidateFrames` | `{ candidateId, frameIds }` | — |
| `api.candidates.setCandidateScores` | `{ candidateId, scores, critique? }` | — |
| `api.candidates.markSurvivors` | `{ candidateIds }` | — |

Defaults on create so you do not have to pass them: a run starts `queued`, a
generation starts `running`, a candidate starts `queued` with no frames and
`survived: false`.

`setCandidateScores` also sets `status: "scored"` — one call, not two.

`pinRun` unpins whatever was pinned before. Only one run is ever pinned.

## Uploading frames

Never base64 a PNG into a document. Three steps per frame:

```ts
const url = await convex.mutation(api.candidates.generateUploadUrl, {});
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "image/png" },
  body: pngBuffer,
});
const { storageId } = await res.json();
// collect t0, t1, t2 in order, then:
await convex.mutation(api.candidates.setCandidateFrames, { candidateId, frameIds });
```

## Queries (the UI subscribes to these)

| Function | Args |
|---|---|
| `api.runs.latestRun` | `{}` |
| `api.runs.pinnedRun` | `{}` |
| `api.runs.runWithCandidates` | `{ runId }` |

All three return the same hydrated shape — the run with its generations, their
candidates, and `frameUrls` already resolved from storage ids. `null` if there
is no such run.

## The status field is the demo

Set `candidates.status` eagerly at every step: `queued` → `rendering` →
`scoring` → `scored`, or `compile_error` / `timeout`. The UI subscribes, so
tiles change under the viewer's eyes without anyone writing refresh logic. A run
that only writes a final status renders as a grid that sits still and then
blinks once.
