/**
 * Placeholder frames for the seeded run.
 *
 * The real grid renders `<img src>` pointing at Convex file storage. Until the
 * orchestrator writes real frames there, these SVG data URIs stand in: procedural
 * `feTurbulence` noise tinted to a palette, three per candidate with drifting
 * seeds so the 500 ms frame cycle has something to cycle through.
 *
 * Nothing downstream knows the difference — a frame is a URL either way.
 */

export interface FramePalette {
  /** Night sky behind the aurora, bottom of the wash. */
  readonly base: string;
  /** Night sky, top of the wash. */
  readonly sky: string;
  /** The light itself, low in the frame. */
  readonly glow: string;
  /** The light itself, high in the frame. */
  readonly glowTop: string;
}

export interface FrameSpec {
  readonly palette: FramePalette;
  /**
   * Noise scale per axis. A high x and low y stretches the noise into vertical
   * curtains; equal values give isotropic blobs that read as fog.
   */
  readonly frequencyX: number;
  readonly frequencyY: number;
  readonly octaves: number;
  /** Alpha gamma on the noise. Higher separates light from dark; lower muddies it. */
  readonly contrast: number;
  /** Whether a ridge silhouette anchors the bottom of the frame. */
  readonly ridge: boolean;
}

const svg = (spec: FrameSpec, seed: number): string => {
  const { palette, frequencyX, frequencyY, octaves, contrast, ridge } = spec;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs>
<linearGradient id="sky" x1="0" y1="1" x2="0" y2="0">
<stop offset="0" stop-color="${palette.base}"/>
<stop offset="1" stop-color="${palette.sky}"/>
</linearGradient>
<linearGradient id="light" x1="0" y1="1" x2="0" y2="0">
<stop offset="0" stop-color="${palette.glow}"/>
<stop offset="1" stop-color="${palette.glowTop}"/>
</linearGradient>
<linearGradient id="falloff" x1="0" y1="1" x2="0" y2="0">
<stop offset="0" stop-color="#000" stop-opacity="1"/>
<stop offset="0.42" stop-color="#000" stop-opacity="0.25"/>
<stop offset="1" stop-color="#000" stop-opacity="0"/>
</linearGradient>
<filter id="veil" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${frequencyX} ${frequencyY}" numOctaves="${octaves}" seed="${seed}" result="turb"/>
<feColorMatrix in="turb" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="mask"/>
<feComponentTransfer in="mask" result="shaped">
<feFuncA type="gamma" exponent="${contrast}" amplitude="1.6" offset="-0.12"/>
</feComponentTransfer>
<feComposite in="SourceGraphic" in2="shaped" operator="in"/>
</filter>
</defs>
<rect width="256" height="256" fill="url(#sky)"/>
<g filter="url(#veil)"><rect width="256" height="256" fill="url(#light)"/></g>
<rect width="256" height="256" fill="url(#falloff)" opacity="${ridge ? 0.85 : 0.45}"/>
${ridge ? `<path d="M0 256 L0 214 L38 191 L74 205 L112 178 L152 199 L196 172 L232 193 L256 183 L256 256 Z" fill="${palette.base}"/>` : ""}
</svg>`;
};

const toDataUri = (markup: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

/** Three frames at t = 0 s, 1 s, 2 s, matching the harness contract. */
export const makeFrames = (spec: FrameSpec, seed: number): readonly string[] =>
  [seed, seed + 11, seed + 23].map((s) => toDataUri(svg(spec, s)));

/** A flat, near-featureless render — what the `flat` prefilter catches. */
export const makeFlatFrames = (colour: string): readonly string[] => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${colour}"/></svg>`;
  const uri = toDataUri(markup);
  return [uri, uri, uri];
};
