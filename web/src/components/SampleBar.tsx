import type { Candidate, Run } from "../types";

interface SampleBarProps {
  readonly samples: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  /** A run happening now owns the view; the bar says so rather than lying. */
  readonly liveRunning: boolean;
  readonly showingLive: boolean;
  readonly onFollowLive?: (() => void) | undefined;
}

const winnerOf = (run: Run, index: number): Candidate | undefined => {
  const g = run.generations[index];
  if (g === undefined) return undefined;
  return g.candidates.reduce<Candidate | undefined>(
    (best, c) => ((c.scores?.total ?? -1) > (best?.scores?.total ?? -1) ? c : best),
    undefined,
  );
};

const Shot = ({
  candidate,
  label,
}: {
  readonly candidate: Candidate | undefined;
  readonly label: string;
}): React.JSX.Element => {
  const src = candidate?.frameUrls[1] ?? candidate?.frameUrls[0];
  return (
    <figure className="shot">
      {src === undefined ? (
        <div className="shot-blank" />
      ) : (
        <img src={src} alt={`${label}: ${candidate?.strategy ?? ""}`} loading="lazy" />
      )}
      <figcaption>
        {label}
        {candidate?.scores !== undefined ? <b> {candidate.scores.total}</b> : null}
      </figcaption>
    </figure>
  );
};

/**
 * The showcase. Every sample is on screen at once, each showing the best of its
 * first round beside the best of its last: that pair is the whole argument, and
 * a row of text buttons hid it. Clicking a card opens the full run below.
 */
export const SampleBar = ({
  samples,
  selectedId,
  onPick,
  liveRunning,
  showingLive,
  onFollowLive,
}: SampleBarProps): React.JSX.Element | null => {
  if (samples.length === 0) return null;

  return (
    <section className="samplebar" aria-label="Sample runs">
      <p className="samplebar-lede">
        <strong>Samples.</strong> Finished runs. Each shows the best shader of round one beside
        the best of the last round. Open one, or send your own prompt.
        {liveRunning && !showingLive && onFollowLive !== undefined ? (
          <>
            {" "}
            <button type="button" className="linkish" onClick={onFollowLive}>
              Back to the run in progress
            </button>
          </>
        ) : null}
      </p>
      <div className="samplebar-row">
        {samples.map((run) => {
          const last = run.generations.length - 1;
          const before = winnerOf(run, 0);
          const after = winnerOf(run, last);
          const gain = (after?.scores?.total ?? 0) - (before?.scores?.total ?? 0);
          const active = !liveRunning && run.id === selectedId;
          return (
            <button
              key={run.id}
              type="button"
              className={`sample${active ? " is-active" : ""}`}
              onClick={() => onPick(run.id)}
              aria-pressed={active}
            >
              <span className="sample-shots">
                <Shot candidate={before} label="round 1" />
                <span className="sample-arrow" aria-hidden="true">
                  →
                </span>
                <Shot candidate={after} label={`round ${last + 1}`} />
              </span>
              <span className="sample-prompt">{run.prompt}</span>
              <span className="sample-meta">
                <span>{run.generations.length} rounds</span>
                {gain > 0 ? <b>+{gain}</b> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
