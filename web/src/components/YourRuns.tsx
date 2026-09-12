import type { Run } from "../types";
import { RunCard } from "./RunCard";

interface YourRunsProps {
  readonly runs: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  readonly onContinue: (runId: string) => void;
  readonly onStop: (runId: string) => void;
  /** Asked to stop, before the orchestrator has unwound. */
  readonly stopping: ReadonlySet<string>;
  /** Asked for another iteration, before the round is under way. */
  readonly starting: ReadonlySet<string>;
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
 * said what you had asked for; the cards show what came back.
 */
export const YourRuns = ({
  runs,
  selectedId,
  onPick,
  onContinue,
  onStop,
  stopping,
  starting,
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
          /*
           * A stopped run can be carried on: its finished rounds are stored, and
           * resuming reads them back. Offering another iteration only on a run
           * that ended cleanly left a stopped one with no way forward, which is
           * the opposite of why stopping exists.
           */
          const resumable = !working && run.generations.length > 0;
          return (
            <RunCard
              key={run.id}
              run={run}
              active={run.id === selectedId}
              onPick={onPick}
              footer={
                <>
                  {working && stopping.has(run.id) ? (
                    <span className="yours-stopping">
                      <i className="pip" aria-hidden="true" />
                      stopping
                    </span>
                  ) : working ? (
                    <span className="yours-live">
                      <i className="pip" aria-hidden="true" />
                      {run.status === "queued" ? "starting" : "running"}
                    </span>
                  ) : starting.has(run.id) ? (
                    <span className="yours-live">
                      <i className="pip" aria-hidden="true" />
                      starting
                    </span>
                  ) : (
                    <>
                      <span>
                        {run.generations.length} round{run.generations.length === 1 ? "" : "s"}
                      </span>
                      {run.status === "failed" ? <span className="yours-failed">stopped</span> : null}
                      {gain > 0 ? <b>+{gain}</b> : null}
                    </>
                  )}
                  <span className="yours-when">{when(run.createdAt)}</span>
                </>
              }
              action={
                working ? (
                  <button
                    type="button"
                    className="yours-act"
                    onClick={() => onStop(run.id)}
                    disabled={stopping.has(run.id)}
                  >
                    {stopping.has(run.id) ? "Stopping" : "Stop"}
                  </button>
                ) : resumable ? (
                  <button
                    type="button"
                    className="yours-act is-go"
                    onClick={() => onContinue(run.id)}
                    disabled={blocked || starting.has(run.id)}
                    title={blocked ? "Another run is using the sandboxes" : "Run one more round"}
                  >
                    {starting.has(run.id) ? "Starting" : "Next iteration"}
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
