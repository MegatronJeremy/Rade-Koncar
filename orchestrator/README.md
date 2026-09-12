# orchestrator

Prompt in, three generations of six shaders out. Contracts 2, 4 and 5 in `docs/01-contracts.md`.

```bash
npm install && npm run build
node cli.js "a red ball bouncing on a white floor"     # one run
node cli.js --pin "..."                                # and pin it as the landing run
GENS=1 node cli.js "..."                               # one generation, for a smoke test
node server.js                                         # POST /run {prompt}
node reap.js                                           # delete every sandbox on the account
```

Reads the repo-root `.env`.

## Shape

| File | Does |
|---|---|
| `llm.ts` | `claude -p --output-format json --json-schema` for codegen, mutation and vision. Accumulates `modelUsage[].costUSD` |
| `sandbox.ts` | Daytona pool plus a work queue over it |
| `score.ts` | Prefilter arithmetic, then the vision call on what survives |
| `store.ts` | Convex writes through `anyApi` |
| `loop.ts` | Three generations: generate, render, score, keep two, mutate |
| `cli.ts` / `server.ts` | One run from the shell, or over HTTP with CORS |

## Two limits found the hard way

**Two sandboxes, not six.** The account allows 10 GiB total and the snapshot asks
for 4 GB, so three concurrent boxes is already over. `POP` stays 6 and the
candidates queue through a pool of `POOL_SIZE` (default 2), which costs about ten
seconds a generation. A pool that fails partway deletes what it made before
rethrowing; two leaked sandboxes are 8 GiB and block every later run until they
are reaped. `node reap.js` clears them. The SDK's `list()` does not return a
plain array, so reap goes to the REST endpoint.

**A trailing slash on `CONVEX_URL`** makes every mutation reject with an `Error`
whose message is the empty string. `store.ts` strips it.

## Measured

One generation of six, `claude-sonnet-5`: 198 s, $0.38. Sandbox pool up in 2.2 s,
frame upload 85-170 ms per candidate. A full three-generation run is therefore
around ten minutes and a dollar.
