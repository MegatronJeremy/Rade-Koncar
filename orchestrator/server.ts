import { createServer } from "node:http";
import "./env";
import { assertProvider } from "./llm";
import { runOnce } from "./loop";
import { opt } from "./env";

/**
 * The browser calls this cross-origin, so without permissive CORS the prompt box
 * fails in the browser while working perfectly from curl.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Render injects PORT and expects the service to bind it. ORCHESTRATOR_PORT is
// the local override.
const port = Number(process.env.PORT ?? opt("ORCHESTRATOR_PORT", "8787"));

/**
 * One run at a time, service wide. The Daytona account allows 10 GiB and each
 * sandbox is 4 GB, so a run already owns both boxes it is allowed. A second
 * concurrent run does not queue behind it, it fails on sandbox creation, so it
 * is refused up front with something the UI can say out loud.
 */
let inFlight: string | undefined;

createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS).end();
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res
      .writeHead(200, { ...CORS, "Content-Type": "application/json" })
      .end(JSON.stringify({ ok: true, busy: inFlight !== undefined, running: inFlight ?? null }));
    return;
  }
  if (req.method !== "POST" || req.url !== "/run") {
    res.writeHead(404, CORS).end();
    return;
  }

  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    let prompt = "";
    let steering: string | undefined;
    try {
      ({ prompt, steering } = JSON.parse(body || "{}"));
    } catch {
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad json" }));
      return;
    }
    if (!prompt) {
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "prompt required" }));
      return;
    }
    if (inFlight !== undefined) {
      res
        .writeHead(429, { ...CORS, "Content-Type": "application/json" })
        .end(JSON.stringify({ error: "busy", busy: true, running: inFlight }));
      return;
    }
    inFlight = prompt;
    // Answer immediately; the UI watches Convex for everything that follows.
    res.writeHead(202, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ accepted: true }));
    runOnce(prompt)
      .catch((err) => process.stderr.write(`[run] ${String(err)}\n`))
      .finally(() => {
        inFlight = undefined;
      });
    void steering;
  });
}).listen(port, () => {
  assertProvider();
  console.log(`[orchestrator] http://localhost:${port}  POST /run {prompt}`);
});
