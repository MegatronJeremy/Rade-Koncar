import type { Run } from "../types";
import { RunCard } from "./RunCard";

interface YourRunsProps {
  readonly runs: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  readonly onContinue: (runId: string) => void;
  readonly onStop: (runId: string) => void;
  /** Another run holds the sandboxes, so nothing new can start now. */
  readonly blocked: boolean;
}

const when = (ms: number): string => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

const bestOf = (run: Run, index: number): number =>
  (run.generations[index]?.candidates ?? []).reduce(
    (best, c) => Math.max(best, c.scores?.total ?? 0),
    0,
  );

/**
 * The visitor's own runs, as the same cards the samples use. A list of prompts
 * told you what you had asked for; the cards show what came back, which is the
 * thing worth looking at.
 */
export const YourRuns = ({
  runs,
  selectedId,
  onPick,
  onContinue,
  onStop,
  blocked,
}: YourRunsProps): React.JSX.Element | null => {
  if (runs.length === 0) return null;

  return (
    <section className="yours" aria-label="Your runs">
      <h2 className="yours-head">Your runs</h2>
      <div className="samplebar-row">
        {runs.map((run) => {
          const working = run.status === "queued" || run.status === "running";
          const gain = bestOf(run, run.generations.length - 1) - bestOf(run, 0);
          return (
            <RunCard
              key={run.id}
              run={run}
              active={run.id === selectedId}
              onPick={onPick}
              footer={
                <>
                  {working ? (
                    <span className="yours-live">
                      <i className="pip" aria-hidden="true" />
                      {run.status === "queued" ? "starting" : "running"}
                    </span>
                  ) : run.status === "failed" ? (
                    <span className="yours-failed">stopped</span>
                  ) : (
                    <>
                      <span>
                        {run.generations.length} round{run.generations.length === 1 ? "" : "s"}
                      </span>
                      {gain > 0 ? <b>+{gain}</b> : null}
                    </>
                  )}
                  <span className="yours-when">{when(run.createdAt)}</span>
                </>
              }
              action={
                working ? (
                  <button type="button" className="yours-act" onClick={() => onStop(run.id)}>
                    Stop
                  </button>
                ) : run.status === "done" ? (
                  <button
                    type="button"
                    className="yours-act is-go"
                    onClick={() => onContinue(run.id)}
                    disabled={blocked}
                    title={blocked ? "Another run is using the sandboxes" : "Run one more round"}
                  >
                    Next iteration
                  </button>
                ) : null
              }
            />
          );
        })}
      </div>
    </section>
  );
};
