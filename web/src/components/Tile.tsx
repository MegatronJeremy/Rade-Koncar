import type { Candidate } from "../types";

interface TileProps {
  readonly candidate: Candidate;
  /** Which of the three frames the whole grid is showing on this beat. */
  readonly frame: number;
  readonly onSelect: (candidate: Candidate) => void;
}

const scoreLabel = (candidate: Candidate): string => {
  const { scores, status } = candidate;
  if (status === "compile_error") return "no build";
  if (status === "timeout") return "killed";
  if (scores === undefined) return "";
  if (scores.flat) return "0 flat";
  return `${scores.total}`;
};

const FrameBody = ({
  candidate,
  frame,
}: {
  readonly candidate: Candidate;
  readonly frame: number;
}): React.JSX.Element => {
  switch (candidate.status) {
    case "compile_error":
      return <pre className="tile-log">{candidate.log ?? "Shader failed to compile."}</pre>;

    case "timeout":
      return (
        <div className="tile-stalled">
          <strong className="stalled-word">timed out</strong>
          <span>
            Never returned a frame. Its sandbox was killed at 60 s; the other five kept
            rendering.
          </span>
        </div>
      );

    case "queued":
    case "rendering":
    case "scoring":
      return (
        <div className={`tile-working is-${candidate.status}`}>
          <span className="working-word">{candidate.status}</span>
        </div>
      );

    case "scored": {
      const src = candidate.frameUrls[frame] ?? candidate.frameUrls[0];
      if (src === undefined) {
        return (
          <div className="tile-stalled">
            <strong className="stalled-word">no frames</strong>
          </div>
        );
      }
      return (
        <img
          src={src}
          alt={`${candidate.strategy}, rendered at ${frame} second${frame === 1 ? "" : "s"}`}
        />
      );
    }

    default: {
      const exhaustive: never = candidate.status;
      return <div className="tile-stalled">{exhaustive}</div>;
    }
  }
};

export const Tile = ({ candidate, frame, onSelect }: TileProps): React.JSX.Element => {
  const failed = candidate.status === "compile_error" || candidate.status === "timeout";
  const classes = ["tile", candidate.survived ? "survived" : "", failed ? "failed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="tile-frame">
        <FrameBody candidate={candidate} frame={frame} />
        {candidate.survived ? <span className="survivor-mark" aria-hidden="true" /> : null}
      </div>
      <div className="tile-foot">
        <span className="tile-strategy">{candidate.strategy}</span>
        <span className={`tile-score${failed ? " is-null" : ""}`}>{scoreLabel(candidate)}</span>
      </div>
      {candidate.critique !== undefined ? (
        <p className="tile-critique">{candidate.critique}</p>
      ) : null}
      <button type="button" className="tile-hit" onClick={() => onSelect(candidate)}>
        <span className="sr-only">
          Open {candidate.strategy}, candidate {candidate.index + 1}
        </span>
      </button>
    </article>
  );
};
