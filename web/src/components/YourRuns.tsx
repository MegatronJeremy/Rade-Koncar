import type { Run } from "../types";

interface YourRunsProps {
  readonly runs: readonly Run[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
}

const bestOf = (run: Run, index: number): number =>
  (run.generations[index]?.candidates ?? []).reduce(
    (best, c) => Math.max(best, c.scores?.total ?? 0),
    0,
  );

const when = (ms: number): string => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

/**
 * The visitor's own runs, kept in this browser. Nobody else's appear here and
 * theirs never appear anywhere else: a run belongs to whoever asked for it.
 */
export const YourRuns = ({ runs, selectedId, onPick }: YourRunsProps): React.JSX.Element | null => {
  if (runs.length === 0) return null;

  return (
    <section className="yours" aria-label="Your runs">
      <h2 className="yours-head">Your runs</h2>
      <ul className="yours-list">
        {runs.map((run) => {
          const last = run.generations.length - 1;
          const gain = bestOf(run, last) - bestOf(run, 0);
          const working = run.status === "queued" || run.status === "running";
          return (
            <li key={run.id}>
              <button
                type="button"
                className={`yours-row${run.id === selectedId ? " is-active" : ""}`}
                onClick={() => onPick(run.id)}
                aria-pressed={run.id === selectedId}
              >
                <span className="yours-prompt">{run.prompt}</span>
                <span className="yours-meta">
                  {working ? (
                    <span className="yours-live">
                      <i className="pip" aria-hidden="true" />
                      {run.status === "queued" ? "starting" : "running"}
                    </span>
                  ) : run.status === "failed" ? (
                    <span className="yours-failed">stopped</span>
                  ) : (
                    <>
                      <span>{run.generations.length} rounds</span>
                      {gain > 0 ? <b>+{gain}</b> : null}
                    </>
                  )}
                  <span className="yours-when">{when(run.createdAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
