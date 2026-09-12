"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./env");
const llm_1 = require("./llm");
const loop_1 = require("./loop");
const store_1 = require("./store");
async function main() {
    const prompt = process.argv.slice(2).filter((a) => a !== "--pin").join(" ");
    if (prompt === "") {
        process.stderr.write('usage: node cli.js [--pin] "a red ball bouncing on a white floor"\n');
        process.exit(2);
    }
    (0, llm_1.assertProvider)();
    const t = Date.now();
    const runId = await (0, loop_1.runOnce)(prompt);
    if (process.argv.includes("--pin")) {
        await (0, store_1.pinRun)(runId);
        console.log("[pinned]");
    }
    console.log(`[run ${runId}] ${Math.round((Date.now() - t) / 1000)}s  $${(0, llm_1.spend)().toFixed(3)}`);
}
main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exit(1);
});
