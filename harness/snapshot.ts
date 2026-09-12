import { Daytona, Image } from "@daytonaio/sdk";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(__dirname, "..", ".env");

async function main(): Promise<void> {
  if (existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);

  if (!process.env.DAYTONA_API_KEY) {
    process.stderr.write(`DAYTONA_API_KEY not set (looked in ${ENV_PATH})\n`);
    process.exit(2);
  }
  const name = process.argv[2] || process.env.DAYTONA_SNAPSHOT;
  if (!name) {
    process.stderr.write(`usage: node snapshot.js [name]   (falls back to DAYTONA_SNAPSHOT in ${ENV_PATH})\n`);
    process.exit(2);
  }

  const started = Date.now();
  const daytona = new Daytona();

  // Daytona parses COPY targets out of the Dockerfile to build the upload
  // context, so this must run from harness/.
  const snapshot = await daytona.snapshot.create(
    {
      name,
      image: Image.fromDockerfile("Dockerfile"),
      // The organisation is capped at 10 GiB of concurrent sandbox memory and a
      // run holds POOL_SIZE at once, so 4 GiB each fails to create a pool of
      // two. Chromium on SwiftShader at 256x256 needs far less: measured peak
      // is well under 1 GiB, and --disable-dev-shm-usage keeps it off /dev/shm.
      // Raising this costs parallelism, not speed.
      resources: { cpu: 1, memory: 1, disk: 5 },
    },
    { onLogs: (chunk) => process.stdout.write(chunk.endsWith("\n") ? chunk : chunk + "\n") },
  );

  console.log(`[daytona] snapshot ${snapshot.name} ${snapshot.state} in ${Date.now() - started}ms`);
}

main().catch((err) => {
  process.stderr.write(`[daytona] ${String(err)}\n`);
  process.exit(1);
});
