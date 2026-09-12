/** Contract 2. What generate() returns, six per call. */
export interface Candidate {
  strategy: string;
  source: string;
}

/** Contract 1. What the harness writes to result.json. */
export type HarnessStatus = "ok" | "compile_error" | "timeout";

export interface HarnessResult {
  status: HarnessStatus;
  frames: string[];
  log: string;
  ms: { compile: number; frames: number[] };
}

/** A rendered candidate: the harness result plus the bytes it produced. */
export interface Rendered {
  result: HarnessResult;
  png: Buffer[];
}

/** Contract 4. */
export interface Scores {
  flat: boolean;
  motion: number;
  palette: number;
  subject: number;
  total: number;
}

export interface Vision {
  palette: number;
  motion: number;
  subject: number;
  critique: string;
}
