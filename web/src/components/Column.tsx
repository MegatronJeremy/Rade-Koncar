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
    </div>
  </section>
);
