"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
require("./env");
const llm_1 = require("./llm");
const loop_1 = require("./loop");
const env_1 = require("./env");
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
const port = Number(process.env.PORT ?? (0, env_1.opt)("ORCHESTRATOR_PORT", "8787"));
/**
 * One run at a time, service wide. The Daytona account allows 10 GiB and each
 * sandbox is 4 GB, so a run already owns both boxes it is allowed. A second
 * concurrent run does not queue behind it, it fails on sandbox creation, so it
 * is refused up front with something the UI can say out loud.
 */
let inFlight;
(0, node_http_1.createServer)((req, res) => {
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
    const isRun = req.method === "POST" && req.url === "/run";
    const isContinue = req.method === "POST" && req.url === "/continue";
    const isStop = req.method === "POST" && req.url === "/stop";
    if (!isRun && !isContinue && !isStop) {
        res.writeHead(404, CORS).end();
        return;
    }
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
        let prompt = "";
        let steering;
        let runId;
        try {
            ({ prompt, steering, runId } = JSON.parse(body || "{}"));
        }
        catch {
            res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad json" }));
            return;
        }
        /*
         * Stopping is answered immediately: the loop notices the flag before the
         * next candidate renders. Knowing the run id is the permission, and a
         * browser only ever knows its own.
         */
        if (isStop) {
            if (runId === undefined) {
                res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "runId required" }));
                return;
            }
            (0, loop_1.requestStop)(runId);
            res.writeHead(202, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ stopping: true }));
            return;
        }
        if (isContinue && runId === undefined) {
            res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "runId required" }));
            return;
        }
        if (isRun && !prompt) {
            res.writeHead(400, { ...CORS, "Content-Type": "application/json" }).end(JSON.stringify({ error: "prompt required" }));
            return;
        }
        if (inFlight !== undefined) {
            res
                .writeHead(429, { ...CORS, "Content-Type": "application/json" })
                .end(JSON.stringify({ error: "busy", busy: true, running: inFlight }));
            return;
        }
        inFlight = prompt || (runId ?? "a run");
        /*
         * The id goes back to whoever asked, so the page can follow its own run and
         * nobody else's. Without it every visitor was shown whichever run happened
         * to be newest, which meant one person's prompt took over everyone's screen.
         *
         * Resolved on failure too: a run that dies before createRun must answer the
         * request rather than leave it hanging.
         */
        /*
         * One round per request. A round is about two and a half minutes against
         * seven for a whole run, so results arrive sooner, sandboxes are released
         * between rounds instead of held throughout, and whether to keep going is
         * the visitor's call rather than a constant.
         */
        const created = new Promise((resolve) => {
            (0, loop_1.runOnce)(prompt, resolve, { rounds: 1, resume: isContinue ? runId : undefined })
                .catch((err) => {
                process.stderr.write(`[run] ${String(err)}\n`);
                resolve(undefined);
            })
                .finally(() => {
                inFlight = undefined;
                resolve(undefined);
            });
        });
        void created.then((runId) => {
            res
                .writeHead(202, { ...CORS, "Content-Type": "application/json" })
                .end(JSON.stringify({ accepted: runId !== undefined, runId: runId ?? null }));
        });
        void steering;
    });
}).listen(port, () => {
    (0, llm_1.assertProvider)();
    console.log(`[orchestrator] http://localhost:${port}  POST /run {prompt}`);
});
