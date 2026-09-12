import { chromium, type Browser, type BrowserServer, type Page } from "playwright";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Renders a directory of candidates and lays their t1 frames out as one sheet,
// so a generation can be judged by looking at a single image.

const FRAME_TIMEOUT_MS = 20_000;
const COLS = 3;
const CELL = 256;

const CHROMIUM_ARGS = [
  "--headless=new",
  "--no-sandbox",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--disable-dev-shm-usage",
];

type Status = "ok" | "compile_error" | "timeout";

interface Entry {
  name: string;
  status: Status;
  log: string;
  lumStdDev: number;
  motion: number;
  flat: boolean;
  still: boolean;
}

const PAGE_URL = pathToFileURL(join(__dirname, "harness.html")).href;

async function newSession(): Promise<{ server: BrowserServer; browser: Browser; page: Page }> {
  const server = await chromium.launchServer({ args: CHROMIUM_ARGS, timeout: 30_000 });
  const browser = await chromium.connect(server.wsEndpoint());
  const page = await browser.newPage();
  await page.goto(PAGE_URL, { waitUntil: "load", timeout: 30_000 });
  return { server, browser, page };
}

// Compile, capture t0/t1/t2, and measure the two things arithmetic knows better
// than a vision model: whether the image is blank and whether it moves.
function captureInPage(times: number[]): { frames: string[]; lumStdDev: number; motion: number } {
  const h = window.harness;
  const g = h.gl;
  const w = h.canvas.width;
  const ht = h.canvas.height;
  const read = (t: number) => {
    h.renderAt(t);
    const buf = new Uint8Array(w * ht * 4);
    g.readPixels(0, 0, w, ht, g.RGBA, g.UNSIGNED_BYTE, buf);
    return buf;
  };
  const frames: string[] = [];
  const bufs: Uint8Array[] = [];
  for (const t of times) {
    bufs.push(read(t));
    frames.push(h.canvas.toDataURL("image/png"));
  }
  const [a, b, c] = bufs;
  const lum = new Float64Array(b.length / 4);
  for (let i = 0; i < lum.length; i++) {
    lum[i] = (0.2126 * b[i * 4] + 0.7152 * b[i * 4 + 1] + 0.0722 * b[i * 4 + 2]) / 255;
  }
  let mean = 0;
  for (const v of lum) mean += v;
  mean /= lum.length;
  let variance = 0;
  for (const v of lum) variance += (v - mean) ** 2;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - c[i]);
  return {
    frames,
    lumStdDev: Math.sqrt(variance / lum.length),
    motion: diff / a.length / 255,
  };
}

function composite(cells: { dataUrl: string | null; label: string }[], cols: number, cell: number): Promise<string> {
  const rows = Math.ceil(cells.length / cols);
  const pad = 22;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * (cell + pad);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#101317";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "13px monospace";
  ctx.textBaseline = "middle";

  return Promise.all(
    cells.map(
      (c, i) =>
        new Promise<void>((res) => {
          const x = (i % cols) * cell;
          const y = Math.floor(i / cols) * (cell + pad);
          ctx.fillStyle = "#8fa3b8";
          ctx.fillText(c.label, x + 6, y + pad / 2);
          if (!c.dataUrl) {
            ctx.fillStyle = "#2a1a1a";
            ctx.fillRect(x, y + pad, cell, cell);
            res();
            return;
          }
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, x, y + pad, cell, cell);
            res();
          };
          img.onerror = () => res();
          img.src = c.dataUrl;
        }),
    ),
  ).then(() => canvas.toDataURL("image/png"));
}

function toPng(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

// Same shape render.js writes, so a batch directory is readable by anything
// that already reads a single render. `times` is the extra field: it records
// which seconds these frames are, which is not always 0, 1, 2.
function writeResult(
  dir: string,
  r: { status: Status; frames: string[]; log: string; times: number[] },
): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "result.json"), JSON.stringify(r, null, 2));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) opts.set(argv[i].replace(/^--/, ""), argv[i + 1]);
  const inDir = opts.get("in");
  const outDir = opts.get("out");
  if (!inDir || !outDir) {
    process.stderr.write("usage: node batch.js --in <dir of .glsl> --out <dir> [--times 0,1,2]\n");
    process.exit(2);
  }
  // Contract §1 fixes the scored frames at 0, 1 and 2 seconds. --times is for
  // measuring how much a candidate moves over a longer window than that,
  // which is the difference between a still shader and a deliberately slow one.
  const times = (opts.get("times") ?? "0,1,2").split(",").map(Number);
  if (times.length !== 3 || times.some(Number.isNaN)) {
    process.stderr.write("--times takes three comma separated seconds, e.g. 0,5,10\n");
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(inDir).filter((f) => f.endsWith(".glsl")).sort();
  let session = await newSession();
  const entries: Entry[] = [];
  const cells: { dataUrl: string | null; label: string }[] = [];

  for (const file of files) {
    const name = basename(file, ".glsl");
    const source = readFileSync(join(inDir, file), "utf8");

    const compiled = await session.page.evaluate((src) => window.harness.compile(src), source);
    if (!compiled.ok) {
      const log = compiled.log.replace(/\0/g, "").trimEnd();
      writeResult(join(outDir, name), { status: "compile_error", frames: [], log, times });
      entries.push({ name, status: "compile_error", log, lumStdDev: 0, motion: 0, flat: true, still: true });
      cells.push({ dataUrl: null, label: `${name} COMPILE ERROR` });
      console.log(`${name}  compile_error  ${log.split("\n")[0]}`);
      continue;
    }

    let timer: NodeJS.Timeout;
    const work = session.page.evaluate(captureInPage, times);
    const guard = new Promise<null>((res) => {
      timer = setTimeout(() => res(null), FRAME_TIMEOUT_MS);
    });
    const shot = await Promise.race([work, guard]);
    clearTimeout(timer!);

    if (shot === null) {
      work.catch(() => {});
      session.server.kill();
      const log = `exceeded ${FRAME_TIMEOUT_MS} ms`;
      writeResult(join(outDir, name), { status: "timeout", frames: [], log, times });
      entries.push({ name, status: "timeout", log, lumStdDev: 0, motion: 0, flat: true, still: true });
      cells.push({ dataUrl: null, label: `${name} TIMEOUT` });
      console.log(`${name}  timeout`);
      // The browser is wedged, not the batch. Start a fresh one and carry on.
      session = await newSession();
      continue;
    }

    const dir = join(outDir, name);
    mkdirSync(dir, { recursive: true });
    shot.frames.forEach((f, i) => writeFileSync(join(dir, `t${i}.png`), toPng(f)));
    writeResult(dir, { status: "ok", frames: shot.frames.map((_, i) => `t${i}.png`), log: "", times });

    const flat = shot.lumStdDev < 0.02;
    const still = shot.motion < 0.01;
    entries.push({ name, status: "ok", log: "", lumStdDev: shot.lumStdDev, motion: shot.motion, flat, still });
    cells.push({ dataUrl: shot.frames[1], label: `${name}${flat ? " FLAT" : ""}${still ? " STILL" : ""}` });
    console.log(`${name}  ok  sd=${shot.lumStdDev.toFixed(4)}${flat ? " FLAT" : ""}  motion=${shot.motion.toFixed(4)}${still ? " STILL" : ""}`);
  }

  const sheet = await session.page.evaluate(
    ({ cells: c, cols, cell }) => (window as unknown as { __composite: typeof composite }).__composite(c, cols, cell),
    { cells, cols: COLS, cell: CELL },
  ).catch(async () => {
    await session.page.addScriptTag({ content: `window.__composite = ${composite.toString()}` });
    return session.page.evaluate(
      ({ cells: c, cols, cell }) => (window as unknown as { __composite: typeof composite }).__composite(c, cols, cell),
      { cells, cols: COLS, cell: CELL },
    );
  });

  writeFileSync(join(outDir, "sheet.png"), toPng(sheet));
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(entries, null, 2));
  console.log(`\nsheet -> ${join(outDir, "sheet.png")}`);

  await session.browser.close();
  await session.server.close();
}

main().catch((err) => {
  process.stderr.write(`[batch] ${String(err)}\n`);
  process.exit(1);
});
