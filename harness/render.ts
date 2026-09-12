import { chromium, type BrowserServer } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type HarnessStatus = "ok" | "compile_error" | "timeout";

interface HarnessResult {
  status: HarnessStatus;
  frames: string[];
  log: string;
  ms: { compile: number; frames: number[] };
}

const FRAME_TIMES = [0, 1, 2];
const FRAME_TIMEOUT_MS = 20_000;
const LAUNCH_TIMEOUT_MS = 30_000;

// A sandbox has no GPU. Without --enable-unsafe-swiftshader recent Chromium
// refuses the software WebGL fallback and every frame comes back blank, which
// reads as a broken shader rather than a missing flag.
const CHROMIUM_ARGS = [
  "--headless=new",
  "--no-sandbox",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--disable-dev-shm-usage",
];

function parseArgs(argv: string[]): { in: string; out: string } {
  const opts = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || argv[i + 1] === undefined) break;
    opts.set(argv[i].slice(2), argv[i + 1]);
  }
  const inPath = opts.get("in");
  const outDir = opts.get("out");
  if (!inPath || !outDir) {
    process.stderr.write("usage: node render.js --in <path.glsl> --out <dir>\n");
    process.exit(2);
  }
  return { in: inPath, out: outDir };
}

// GLSL info logs come back NUL-terminated and JSON.stringify would emit the
// escape into result.json, where it survives all the way to the UI.
function clean(log: string): string {
  return log.replace(/\0/g, "").trimEnd();
}

function write(outDir: string, result: HarnessResult): void {
  writeFileSync(join(outDir, "result.json"), JSON.stringify(result, null, 2));
  const { status, ms } = result;
  console.log(`[harness] ${status} compile=${ms.compile.toFixed(0)}ms frames=[${ms.frames.map((n) => n.toFixed(0)).join(",")}]`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = readFileSync(args.in, "utf8");
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });

  const pageUrl = pathToFileURL(join(__dirname, "harness.html")).href;

  // launchServer rather than launch: a wedged shader can only be escaped by
  // killing the browser outright, and Browser exposes no handle on its process.
  let server: BrowserServer;
  try {
    server = await chromium.launchServer({ args: CHROMIUM_ARGS, timeout: LAUNCH_TIMEOUT_MS });
  } catch (err) {
    process.stderr.write(`[harness] chromium failed to launch: ${String(err)}\n`);
    process.exit(1);
  }
  const browser = await chromium.connect(server.wsEndpoint());

  // A shader with an unbounded loop wedges the renderer inside glFinish. The
  // evaluate promise never settles and close() would block behind it, so the
  // only way out is to kill the process and report the timeout.
  // close() on a connected browser only drops the websocket; the server we
  // launched outlives it and the process never exits.
  async function shutdown(): Promise<void> {
    await browser.close();
    await server.close();
  }

  function abandon(result: HarnessResult): never {
    write(outDir, result);
    server.kill();
    process.exit(0);
  }

  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
    await page.goto(pageUrl, { waitUntil: "load", timeout: LAUNCH_TIMEOUT_MS });

    const ready = await page.evaluate(() => Boolean(window.harness?.ready));
    if (!ready) {
      process.stderr.write("[harness] harness.html loaded without a webgl2 context\n");
      process.exit(1);
    }

    const compiled = await page.evaluate((src) => window.harness.compile(src), source);
    if (!compiled.ok) {
      write(outDir, {
        status: "compile_error",
        frames: [],
        log: clean(compiled.log),
        ms: { compile: compiled.ms, frames: [] },
      });
      await shutdown();
      return;
    }

    const frames: string[] = [];
    const frameMs: number[] = [];

    for (const t of FRAME_TIMES) {
      const name = `t${t}.png`;
      let timer: NodeJS.Timeout;
      const capture = page.evaluate((time) => window.harness.captureAt(time), t);
      const guard = new Promise<null>((res) => {
        timer = setTimeout(() => res(null), FRAME_TIMEOUT_MS);
      });

      const shot = await Promise.race([capture, guard]);
      clearTimeout(timer!);

      if (shot === null) {
        capture.catch(() => {});
        abandon({
          status: "timeout",
          frames: [],
          log: `frame t${t} exceeded ${FRAME_TIMEOUT_MS} ms`,
          ms: { compile: compiled.ms, frames: frameMs },
        });
      }

      const png = Buffer.from(shot.dataUrl.slice(shot.dataUrl.indexOf(",") + 1), "base64");
      writeFileSync(join(outDir, name), png);
      frames.push(name);
      frameMs.push(shot.ms);
    }

    write(outDir, { status: "ok", frames, log: "", ms: { compile: compiled.ms, frames: frameMs } });
    await shutdown();
  } catch (err) {
    process.stderr.write(`[harness] ${String(err)}\n`);
    server.kill();
    process.exit(1);
  }
}

main();
