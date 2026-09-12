import "./env";
import { assertProvider, spend } from "./llm";
import { runOnce } from "./loop";
import { pinRun } from "./store";

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).filter((a) => a !== "--pin").join(" ");
  if (prompt === "") {
    process.stderr.write('usage: node cli.js [--pin] "a red ball bouncing on a white floor"\n');
    process.exit(2);
  }
  assertProvider();
  const t = Date.now();
  const runId = await runOnce(prompt);
  if (process.argv.includes("--pin")) {
    await pinRun(runId);
    console.log("[pinned]");
  }
  console.log(`[run ${runId}] ${Math.round((Date.now() - t) / 1000)}s  $${spend().toFixed(3)}`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
