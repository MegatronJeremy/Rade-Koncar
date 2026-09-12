# web — Shader Arena UI

Vite + React + TypeScript. Owned by Djordje. See `docs/04-web-djordje.md`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Render (static site)

| Setting | Value |
|---|---|
| Root directory | `web` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Rewrite rule | `/*` → `/index.html` (Rewrite) |

Environment variables, once Convex and the orchestrator exist:
`VITE_CONVEX_URL`, `VITE_ORCHESTRATOR_URL`.

## Where the data comes from

`src/fixtures.ts` holds a seeded three-generation run so the grid works before
the orchestrator writes anything. `src/types.ts` mirrors the Convex data model in
`docs/01-contracts.md` with ids narrowed to `string`, so swapping fixtures for
live Convex queries is a change of source, not of shape.
