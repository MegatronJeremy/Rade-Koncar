import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { scoreFrames } from "./llm";
import type { Rendered, Scores } from "./types";

/** Contract 4 thresholds. Tuned against fixtures, not against a theory. */
const FLAT_STDDEV = 0.02;
const MOTION_MIN = 0.01;

const luminance = (p: PNG): Float64Array => {
  const v = new Float64Array(p.width * p.height);
  for (let i = 0, j = 0; i < p.data.length; i += 4, j++) {
    v[j] = (0.2126 * p.data[i]! + 0.7152 * p.data[i + 1]! + 0.0722 * p.data[i + 2]!) / 255;
  }
  return v;
};

/** Luminance standard deviation on t1. Catches black, white and flat colour. */
export function stddev(t1: Buffer): number {
  const v = luminance(PNG.sync.read(t1));
  let sum = 0;
  for (const x of v) sum += x;
  const mean = sum / v.length;
  let acc = 0;
  for (const x of v) acc += (x - mean) ** 2;
  return Math.sqrt(acc / v.length);
}

/** Mean absolute channel difference between t0 and t2. Catches a still image. */
export function motion(t0: Buffer, t2: Buffer): number {
  const a = PNG.sync.read(t0).data;
  const b = PNG.sync.read(t2).data;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    diff += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
  }
  return diff / ((a.length / 4) * 3 * 255);
}

export interface Scored {
  scores: Scores;
  critique: string;
}

/**
 * Prefilter first, vision only on what survives it. The two questions a vision
 * model answers worst, is it blank and does it move, are exactly the two pixel
 * arithmetic answers with certainty, so they are computed here and override the
 * model. Most generation-1 candidates are blank, and a blank candidate should
 * cost a standard deviation rather than an API call.
 */
export async function scoreCandidate(prompt: string, r: Rendered): Promise<Scored> {
  const [t0, t1, t2] = r.png;
  if (t0 === undefined || t1 === undefined || t2 === undefined) {
    return { scores: { flat: true, motion: 0, palette: 0, subject: 0, total: 0 }, critique: "no frames" };
  }

  const sd = stddev(t1);
  const md = motion(t0, t2);
  if (sd < FLAT_STDDEV) {
    return { scores: { flat: true, motion: 0, palette: 0, subject: 0, total: 0 }, critique: "renders flat" };
  }

  const dir = mkdtempSync(join(tmpdir(), "shader-"));
  const paths = r.png.map((buf, i) => {
    const p = join(dir, `t${i}.png`);
    writeFileSync(p, buf);
    return p;
  });

  const v = await scoreFrames(prompt, paths);
  const motionScore = md < MOTION_MIN ? 0 : v.motion;
  return {
    scores: {
      flat: false,
      motion: motionScore,
      palette: v.palette,
      subject: v.subject,
      total: v.palette + motionScore + v.subject,
    },
    critique: v.critique,
  };
}
