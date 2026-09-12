import type { Run } from "../types";

interface SampleBarProps {
  readonly samples: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  /** A run happening now owns the view; the bar says so rather than lying. */
  readonly liveRunning: boolean;
}

const bestOf = (run: Run, index: number): number => {
  const g = run.generations[index];
  if (g === undefined) return 0;
  return g.candidates.reduce((best, c) => Math.max(best, c.scores?.total ?? 0), 0);
};

/**
 * The showcase. Samples are finished runs kept so there is something real on
 * screen before anyone types, and so the page still shows the product when no
 * orchestrator is reachable. The prompt box is the main event; this is the
 * evidence sitting beside it.
 */
export const SampleBar = ({
  samples,
  selectedId,
  onPick,
  liveRunning,
}: SampleBarProps): React.JSX.Element | null => {
  if (samples.length === 0) return null;

  return (
    <section className="samplebar" aria-label="Sample runs">
      <p className="samplebar-lede">
        <strong>Samples.</strong> Finished runs, three rounds each. Pick one, or send your own
        prompt above.
      </p>
      <div className="samplebar-row">
        {samples.map((run) => {
          const first = bestOf(run, 0);
          const last = bestOf(run, run.generations.length - 1);
          const active = !liveRunning && run.id === selectedId;
          return (
            <button
              key={run.id}
              type="button"
              className={`sample${active ? " is-active" : ""}`}
              onClick={() => onPick(run.id)}
              aria-pressed={active}
            >
              <span className="sample-prompt">{run.prompt}</span>
              <span className="sample-meta">
                {run.generations.length} rounds
                {last > first ? <b> · best {first} → {last}</b> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
