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

const port = Number(opt("ORCHESTRATOR_PORT", "8787"));

createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS).end();
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
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
    // Answer immediately; the UI watches Convex for everything that follows.
    res.writeHead(202, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ accepted: true }));
    runOnce(prompt).catch((err) => process.stderr.write(`[run] ${String(err)}\n`));
    void steering;
  });
}).listen(port, () => {
  assertProvider();
  console.log(`[orchestrator] http://localhost:${port}  POST /run {prompt}`);
});
