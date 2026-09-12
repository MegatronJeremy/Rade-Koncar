import { useCallback, useEffect, useRef, useState } from "react";
import { addTile } from "../liveTiles";
import type { Candidate } from "../types";

interface TileProps {
  readonly candidate: Candidate;
  /** Which of the three frames the whole grid is showing on this beat. */
  readonly frame: number;
  readonly onSelect: (candidate: Candidate) => void;
}

/**
 * A bare number means nothing to someone seeing this for the first time, so the
 * denominator is always shown. `flat` is the pixel prefilter rejecting a
 * candidate before any vision call: it reads as a bug next to a tile with
 * visible texture unless it says why.
 */
const scoreLabel = (candidate: Candidate): string => {
  const { scores, status } = candidate;
  if (status === "compile_error") return "no build";
  if (status === "timeout") return "killed";
  if (scores === undefined) return "";
  if (scores.flat) return "0 / 30";
  return `${scores.total} / 30`;
};

const scoreTitle = (candidate: Candidate): string => {
  const { scores, status } = candidate;
  if (status === "compile_error") return "The shader did not compile, so nothing was rendered.";
  if (status === "timeout") return "The shader never finished a frame and its sandbox was killed.";
  if (scores === undefined) return "";
  if (scores.flat) {
    return "Luminance barely varies across the image, so it scored 0 without a vision call.";
  }
  return `palette ${scores.palette} + motion ${scores.motion} + subject ${scores.subject}, out of 10 each`;
};

/**
 * The tile running its own shader. Falls back to the captured PNGs by telling
 * the parent it could not start, which covers a missing WebGL2 context, a
 * shader the browser rejects, and the context limit being reached.
 */
const LiveFrame = ({
  source,
  label,
  onUnavailable,
}: {
  readonly source: string;
  readonly label: string;
  readonly onUnavailable: () => void;
}): React.JSX.Element => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const release = addTile(canvas, source);
    if (release === null) {
      onUnavailable();
      return;
    }
    return release;
  }, [source, onUnavailable]);

  return <canvas ref={ref} className="tile-live" aria-label={label} />;
};

const FrameBody = ({
  candidate,
  frame,
}: {
  readonly candidate: Candidate;
  readonly frame: number;
}): React.JSX.Element => {
  const [liveOff, setLiveOff] = useState<boolean>(false);
  // Must be stable. The grid re-renders every 500 ms to advance `frame`, and an
  // inline callback would re-run the effect and re-register the tile each time.
  const onUnavailable = useCallback(() => setLiveOff(true), []);

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
      if (!liveOff && candidate.source.length > 0) {
        return (
          <LiveFrame
            source={candidate.source}
            label={`${candidate.strategy}, running live`}
            onUnavailable={onUnavailable}
          />
        );
      }
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
        {candidate.survived ? (
          <span className="survivor-mark" title="Scored in the top two, so it became a parent of the next round." />
        ) : null}
      </div>
      <div className="tile-foot">
        <span className="tile-strategy">{candidate.strategy}</span>
        <span
          className={`tile-score${failed ? " is-null" : ""}`}
          title={scoreTitle(candidate)}
        >
          {scoreLabel(candidate)}
        </span>
      </div>
      {candidate.critique !== undefined ? (
        <p className="tile-critique">
          <span className="critique-who">
            {candidate.scores?.flat === true ? "prefilter" : "scorer"}
          </span>
          {candidate.critique}
        </p>
      ) : null}
      <button type="button" className="tile-hit" onClick={() => onSelect(candidate)}>
        <span className="sr-only">
          Open {candidate.strategy}, candidate {candidate.index + 1}
        </span>
      </button>
    </article>
  );
};
