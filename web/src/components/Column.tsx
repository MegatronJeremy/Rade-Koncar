import type { Candidate, Generation } from "../types";
import { Tile } from "./Tile";

interface ColumnProps {
  readonly generation: Generation;
  readonly heading: string;
  readonly note: string;
  /** "control" is the pinned one-shot column, "latest" the evolving one. */
  readonly kind: "control" | "latest";
  readonly frame: number;
  readonly onSelect: (candidate: Candidate) => void;
  /** Generation numbers the reader can switch the column to. Control column omits this. */
  readonly generations?: readonly Generation[];
  readonly onPick?: (generationId: string) => void;
  /**
   * How many tiles this round will end up with. While a run is working the
   * missing ones are drawn as placeholders: writing six shaders takes up to
   * ninety seconds during which nothing exists to show status on, and an empty
   * grid for that long reads as broken rather than busy.
   */
  readonly expected?: number;
}

export const Column = ({
  generation,
  heading,
  note,
  kind,
  frame,
  onSelect,
  generations,
  onPick,
  expected = 0,
}: ColumnProps): React.JSX.Element => (
  <section className={`column ${kind}`}>
    <div className="column-head">
      <div>
        <h2 className="column-title">{heading}</h2>
        <p className="column-note">{note}</p>
      </div>
      {generations !== undefined && onPick !== undefined ? (
        <nav className="gen-picker" aria-label="Choose a generation">
          {generations.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`gen-pick${g.id === generation.id ? " is-current" : ""}`}
              aria-current={g.id === generation.id}
              onClick={() => onPick(g.id)}
            >
              {g.index}
              {g.status === "running" ? <i className="gen-live" aria-hidden="true" /> : null}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
    <div className="grid">
      {generation.candidates.map((candidate) => (
        <Tile key={candidate.id} candidate={candidate} frame={frame} onSelect={onSelect} />
      ))}
      {Array.from({ length: Math.max(0, expected - generation.candidates.length) }, (_, i) => (
        <article key={`pending-${i}`} className="tile is-pending" aria-hidden="true">
          <div className="tile-frame">
            <div className="tile-skeleton" />
          </div>
          <div className="tile-foot">
            <span className="skeleton-line" />
          </div>
        </article>
      ))}
    </div>
  </section>
);
