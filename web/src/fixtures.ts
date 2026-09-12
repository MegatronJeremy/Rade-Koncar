/**
 * Seeded run: three generations of six candidates on a demo prompt.
 *
 * This exists so the grid visibly works before the orchestrator writes anything,
 * and so the public URL has something real to show when nothing is running. It
 * is replaced by Convex's `pinnedRun` once a real run has been pinned.
 */

import { makeFrames, makeFlatFrames, type FramePalette, type FrameSpec } from "./frames";
import type { Candidate, Generation, Run } from "./types";

/* Palettes drift from a desaturated sea green toward the green-to-violet ramp
   the prompt actually asked for. */
const MUDDY: FramePalette = { base: "#0d1114", sky: "#1b2630", glow: "#5c7a70", glowTop: "#63808f" };
const COOL: FramePalette = { base: "#080d12", sky: "#101f33", glow: "#3fa886", glowTop: "#4a7fb5" };
const VIVID: FramePalette = { base: "#04080c", sky: "#0d1430", glow: "#3ce39a", glowTop: "#7b6cff" };
const VIOLET: FramePalette = { base: "#05070f", sky: "#150e30", glow: "#6ad9b0", glowTop: "#a86dff" };

/* Form follows the critique. Isotropic noise reads as fog; stretching it
   vertically and raising the contrast turns it into hanging curtains. */
type Look = Omit<FrameSpec, "palette">;

const FOG: Look = { frequencyX: 0.013, frequencyY: 0.013, octaves: 4, contrast: 0.9, ridge: false };
const DRIFT: Look = { frequencyX: 0.032, frequencyY: 0.009, octaves: 4, contrast: 1.3, ridge: false };
const CURTAIN: Look = { frequencyX: 0.055, frequencyY: 0.006, octaves: 5, contrast: 1.9, ridge: true };

const SOURCES: Record<string, string> = {
  bands: `float band(vec2 p, float o) {
  return smoothstep(0.35, 0.0, abs(p.y - sin(p.x * 2.0 + o) * 0.18 - o * 0.3));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float a = 0.0;
  for (int i = 0; i < 4; i++) {
    a += band(uv, float(i) * 0.4 + iTime * 0.15) * 0.4;
  }
  vec3 col = mix(vec3(0.02, 0.04, 0.06), vec3(0.25, 0.85, 0.6), a);
  fragColor = vec4(col, 1.0);
}`,
  fbm: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float n = fbm(uv * 4.0 + vec2(0.0, iTime * 0.1));
  vec3 col = mix(vec3(0.02, 0.03, 0.05), vec3(0.2, 0.8, 0.55), smoothstep(0.4, 0.7, n));
  fragColor = vec4(col, 1.0);
}`,
  curl: `// curl-noise veil, sheared vertically so the curtain hangs
vec2 curl(vec2 p) {
  float e = 0.01;
  float n1 = fbm(p + vec2(0.0, e)), n2 = fbm(p - vec2(0.0, e));
  float n3 = fbm(p + vec2(e, 0.0)), n4 = fbm(p - vec2(e, 0.0));
  return vec2(n1 - n2, n4 - n3) / (2.0 * e);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 q = uv * vec2(3.0, 1.2);
  q += curl(q + iTime * 0.05) * 0.12;
  float veil = fbm(q * 2.0 + vec2(0.0, iTime * 0.08));
  veil *= smoothstep(0.0, 0.55, uv.y);
  vec3 green = vec3(0.28, 0.89, 0.63);
  vec3 violet = vec3(0.61, 0.43, 1.0);
  vec3 col = mix(green, violet, smoothstep(0.3, 0.9, uv.y + veil * 0.3));
  fragColor = vec4(vec3(0.02, 0.03, 0.06) + col * veil * 1.4, 1.0);
}`,
  broken: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = texture(iChannel0, uv).rgb;
  float d = sdSphere(vec3(uv, 0.0), 0.4);
  fragColor = vec4(col * d, 1.0);
}`,
  flat: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float g = dot(uv, vec2(0.0, 0.02));
  fragColor = vec4(vec3(0.03 + g), 1.0);
}`,
  hang: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float acc = 0.0;
  for (int i = 0; i < 4096; i++) {
    for (int j = 0; j < 4096; j++) { acc += fbm(uv * float(i * j)); }
  }
  fragColor = vec4(vec3(acc), 1.0);
}`,
};

const COMPILE_LOG = `ERROR: 0:4: 'iChannel0' : undeclared identifier
ERROR: 0:4: 'texture' : no matching overloaded function found
ERROR: 0:5: 'sdSphere' : no matching overloaded function found
ERROR: 0:5: 'd' : cannot initialize with this type`;

interface Seed {
  readonly strategy: string;
  readonly source: keyof typeof SOURCES;
  readonly palette?: FramePalette;
  readonly look?: Look;
  readonly total?: number;
  readonly parts?: readonly [palette: number, motion: number, subject: number];
  readonly critique?: string;
  readonly survived?: boolean;
  readonly kind?: "compile_error" | "timeout" | "flat" | "queued" | "rendering" | "scoring";
}

const build = (
  generationId: string,
  seeds: readonly Seed[],
  frameSeed: number,
  parentIds: readonly string[] = [],
): readonly Candidate[] =>
  seeds.map((s, index): Candidate => {
    const id = `${generationId}-c${index}`;
    const base = {
      id,
      generationId,
      index,
      strategy: s.strategy,
      source: SOURCES[s.source] ?? "",
      parentIds,
      survived: s.survived === true,
    };

    if (s.kind === "queued" || s.kind === "rendering" || s.kind === "scoring") {
      return { ...base, status: s.kind, frameUrls: [] };
    }

    if (s.kind === "compile_error") {
      return { ...base, status: "compile_error", frameUrls: [], log: COMPILE_LOG };
    }
    if (s.kind === "timeout") {
      return { ...base, status: "timeout", frameUrls: [] };
    }
    if (s.kind === "flat") {
      return {
        ...base,
        status: "scored",
        frameUrls: makeFlatFrames("#08090B"),
        scores: { flat: true, motion: 0, palette: 0, subject: 0, total: 0 },
        critique: "Uniform near-black. Nothing to judge.",
      };
    }

    const [palette, motion, subject] = s.parts ?? [0, 0, 0];
    return {
      ...base,
      status: "scored",
      frameUrls: makeFrames(
        { palette: s.palette ?? COOL, ...(s.look ?? FOG) },
        frameSeed + index * 7,
      ),
      scores: { flat: false, motion, palette, subject, total: palette + motion + subject },
      ...(s.critique === undefined ? {} : { critique: s.critique }),
    };
  });

const GEN_1: readonly Seed[] = [
  { strategy: "layered sine bands", source: "bands", palette: MUDDY, look: FOG, parts: [5, 4, 5], total: 14, survived: true, critique: "Reads as stacked stripes, not a curtain. Colour is closer to sea green than aurora." },
  { strategy: "fbm threshold", source: "fbm", palette: MUDDY, look: FOG, parts: [4, 3, 4], total: 11, survived: true, critique: "Cloud-like rather than draped. No ridge, no horizon." },
  { strategy: "raymarched sdf", source: "broken", kind: "compile_error" },
  { strategy: "radial gradient sweep", source: "flat", kind: "flat" },
  { strategy: "value noise ridges", source: "fbm", palette: MUDDY, look: FOG, parts: [3, 3, 3], total: 9, critique: "Static grain. Motion is barely present between frames." },
  { strategy: "polar warp", source: "hang", kind: "timeout" },
];

const GEN_2: readonly Seed[] = [
  { strategy: "curl noise veil", source: "curl", palette: COOL, look: DRIFT, parts: [8, 7, 6], total: 21, survived: true, critique: "Curtain now hangs vertically. Violet is missing from the upper band." },
  { strategy: "domain-warped fbm", source: "fbm", palette: COOL, look: DRIFT, parts: [7, 6, 6], total: 19, survived: true, critique: "Good drift. Ridge silhouette still absent." },
  { strategy: "stacked fbm curtains", source: "fbm", palette: COOL, look: DRIFT, parts: [6, 5, 5], total: 16, critique: "Layers read as fog rather than discrete curtains." },
  { strategy: "layered sine bands + noise", source: "bands", palette: COOL, look: FOG, parts: [6, 5, 4], total: 15, critique: "Banding still visible at the edges." },
  { strategy: "flow field streaks", source: "broken", kind: "compile_error" },
  { strategy: "ridged multifractal", source: "fbm", palette: MUDDY, look: FOG, parts: [5, 4, 4], total: 13, critique: "Too high frequency. Looks like static, not light." },
];

const GEN_3: readonly Seed[] = [
  { strategy: "curl noise veil, vertical shear", source: "curl", palette: VIVID, look: CURTAIN, parts: [9, 9, 8], total: 26, survived: true, critique: "Green-to-violet ramp lands. Ridge silhouette anchors the frame." },
  { strategy: "domain-warped fbm, violet ramp", source: "curl", palette: VIOLET, look: CURTAIN, parts: [9, 8, 8], total: 25, survived: true, critique: "Strong palette. Drift is slightly faster than 'slow' asks for." },
  { strategy: "curtain fbm + horizon glow", source: "curl", palette: VIVID, look: CURTAIN, parts: [8, 8, 7], total: 23, critique: "Horizon glow works. Upper curtain thins out too early." },
  { strategy: "curl noise, higher octaves", source: "curl", palette: VIOLET, look: CURTAIN, parts: [8, 7, 7], total: 22, critique: "Detail is good but the violet dominates the green." },
  { strategy: "layered curtains, slow drift", source: "curl", palette: VIVID, look: CURTAIN, parts: [7, 7, 6], total: 20, critique: "Pace is right. Curtains sit too flat against the sky." },
  { strategy: "ridged fbm veil", source: "fbm", palette: COOL, look: DRIFT, parts: [7, 6, 5], total: 18, critique: "Reads more as mist than aurora." },
];

/* The mutation prompt receives both survivors, so every child of a generation
   descends from both of the previous generation's survivors. */
const GEN_1_SURVIVORS = ["g1-c0", "g1-c1"] as const;
const GEN_2_SURVIVORS = ["g2-c0", "g2-c1"] as const;

const PROMPT = "aurora over a dark ridge, slow, green to violet";

const generation1: Generation = {
  id: "g1",
  index: 1,
  status: "done",
  candidates: build("g1", GEN_1, 3),
};

const generation2: Generation = {
  id: "g2",
  index: 2,
  status: "done",
  candidates: build("g2", GEN_2, 41, GEN_1_SURVIVORS),
};

const generation3: Generation = {
  id: "g3",
  index: 3,
  status: "done",
  candidates: build("g3", GEN_3, 77, GEN_2_SURVIVORS),
};

/**
 * The pinned run. This is what the public URL shows when nothing is running —
 * the version of the product most people who matter will ever see.
 */
export const SEEDED_RUN: Run = {
  id: "seed-aurora",
  prompt: PROMPT,
  mode: "text",
  status: "done",
  createdAt: Date.parse("2026-09-12T11:20:00Z"),
  pinned: true,
  generations: [generation1, generation2, generation3],
};

/* Generation 3 mid-flight: the orchestrator sets `candidates.status` at every
   step, so tiles move through queued, rendering and scoring while you watch. */
const GEN_3_IN_FLIGHT: readonly Seed[] = [
  GEN_3[0] as Seed,
  GEN_3[1] as Seed,
  { strategy: "curtain fbm + horizon glow", source: "curl", kind: "scoring" },
  { strategy: "curl noise, higher octaves", source: "curl", kind: "rendering" },
  { strategy: "layered curtains, slow drift", source: "curl", kind: "rendering" },
  { strategy: "ridged fbm veil", source: "fbm", kind: "queued" },
];

/**
 * A run in progress. Not shown by the static build — `pickRun` prefers it over
 * the pinned run the moment Convex reports a live one, which is the real
 * behaviour this exists to exercise.
 */
export const LIVE_RUN: Run = {
  id: "live-aurora",
  prompt: PROMPT,
  mode: "text",
  status: "running",
  createdAt: Date.parse("2026-09-12T12:40:00Z"),
  pinned: false,
  generations: [
    generation1,
    generation2,
    {
      id: "lg3",
      index: 3,
      status: "running",
      candidates: build("lg3", GEN_3_IN_FLIGHT, 77, GEN_2_SURVIVORS),
    },
  ],
};

/** Every candidate in the run, for resolving `parentIds` to strategy labels. */
export const indexCandidates = (run: Run): ReadonlyMap<string, Candidate> =>
  new Map(
    run.generations.flatMap((g) => g.candidates.map((c) => [c.id, c] as const)),
  );
