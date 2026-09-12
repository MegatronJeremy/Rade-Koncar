import type { Run } from "../types";
import { RunCard } from "./RunCard";

interface SampleBarProps {
  readonly samples: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  /** A run happening now owns the view; the bar says so rather than lying. */
  readonly liveRunning: boolean;
  readonly showingLive: boolean;
  readonly onFollowLive?: (() => void) | undefined;
}

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
        {samples.map((run) => (
          <RunCard
            key={run.id}
            run={run}
            active={!liveRunning && run.id === selectedId}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
};
