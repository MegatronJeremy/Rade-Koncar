import { Daytona } from "@daytonaio/sdk";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(__dirname, "..", ".env");
const OUT_DIR = resolve(__dirname, "out", "sandbox");
const FIXTURES = ["good", "bad", "hang"];

async function main(): Promise<void> {
  if (existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);
  const snapshot = process.argv[2] || process.env.DAYTONA_SNAPSHOT;
  if (!snapshot) {
    process.stderr.write(`usage: node verify-sandbox.js [snapshot]   (falls back to DAYTONA_SNAPSHOT in ${ENV_PATH})\n`);
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const daytona = new Daytona();
  const t = Date.now();
  const sandbox = await daytona.create({ snapshot });
  console.log(`[daytona] sandbox ${sandbox.id} up in ${Date.now() - t}ms`);

  try {
    for (const name of FIXTURES) {
      const started = Date.now();
      const res = await sandbox.process.executeCommand(
        `node render.js --in fixtures/${name}.glsl --out out/${name} && cat out/${name}/result.json`,
        "/harness",
        undefined,
        120,
      );
      console.log(`\n=== ${name}.glsl  exit=${res.exitCode}  ${Date.now() - started}ms ===`);
      console.log(res.result.trim());
    }

    const png = await sandbox.fs.downloadFile("/harness/out/good/t1.png");
    const local = resolve(OUT_DIR, "t1.png");
    require("node:fs").writeFileSync(local, png);
    console.log(`\n[daytona] pulled ${png.length} bytes to ${local}`);
  } finally {
    await sandbox.delete();
    console.log("[daytona] sandbox deleted");
  }
}

main().catch((err) => {
  process.stderr.write(`[daytona] ${String(err)}\n`);
  process.exit(1);
});
