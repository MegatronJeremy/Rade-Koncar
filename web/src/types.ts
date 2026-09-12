/**
 * View-model types for the Shader Arena UI.
 *
 * These mirror the Convex data model in `docs/01-contracts.md` exactly, with
 * document ids narrowed to `string` so the UI can render seeded fixtures
 * before the Convex project exists. When the real queries land, the only
 * change is where the data comes from — not its shape.
 */

export type RunMode = "text" | "reference";

export type RunStatus = "queued" | "running" | "done" | "failed";

export type GenerationStatus = "running" | "done";

export type CandidateStatus =
  | "queued"
  | "rendering"
  | "scoring"
  | "scored"
  | "compile_error"
  | "timeout";

/** Set by the orchestrator's scoring pass. `total` is `flat ? 0 : palette + motion + subject`. */
export interface Scores {
  readonly flat: boolean;
  readonly motion: number;
  readonly palette: number;
  readonly subject: number;
  readonly total: number;
}

export interface Candidate {
  readonly id: string;
  readonly generationId: string;
  readonly index: number;
  readonly strategy: string;
  readonly source: string;
  readonly status: CandidateStatus;
  /** Three Convex storage URLs on success, empty otherwise. */
  readonly frameUrls: readonly string[];
  /** Compiler info log, present on `compile_error`. */
  readonly log?: string | undefined;
  readonly scores?: Scores | undefined;
  readonly critique?: string | undefined;
  readonly parentIds: readonly string[];
  readonly survived: boolean;
}

export interface Generation {
  readonly id: string;
  readonly index: number;
  readonly status: GenerationStatus;
  readonly candidates: readonly Candidate[];
}

export interface Run {
  readonly id: string;
  readonly prompt: string;
  readonly mode: RunMode;
  readonly status: RunStatus;
  readonly steering?: string | undefined;
  readonly createdAt: number;
  readonly pinned: boolean;
  readonly generations: readonly Generation[];
}
