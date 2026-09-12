import type { ReactNode } from "react";
import type { Candidate, Run } from "../types";

interface RunCardProps {
  readonly run: Run;
  readonly active: boolean;
  readonly onPick: (runId: string) => void;
  /** Replaces the default "N rounds +gain" line. */
  readonly footer?: ReactNode;
  /** Stop, or next iteration. Sits outside the card's own button. */
  readonly action?: ReactNode;
}

const winnerOf = (run: Run, index: number): Candidate | undefined => {
  const g = run.generations[index];
  if (g === undefined) return undefined;
  return g.candidates.reduce<Candidate | undefined>(
    (best, c) =>
      best === undefined || (c.scores?.total ?? -1) > (best.scores?.total ?? -1) ? c : best,
    undefined,
  );
};

/**
 * The newest round that actually produced a scored shader.
 *
 * A run stopped mid-round leaves a last generation with nothing scored in it,
 * and pairing round one against that shows an empty square. The interesting
 * comparison is against the last round that finished, whatever its number.
 */
const lastScored = (run: Run): { candidate: Candidate; index: number } | undefined => {
  for (let i = run.generations.length - 1; i > 0; i--) {
    const g = run.generations[i];
    if (g === undefined) continue;
    if (!g.candidates.some((c) => c.scores !== undefined)) continue;
    const candidate = winnerOf(run, i);
    if (candidate !== undefined) return { candidate, index: i };
  }
  return undefined;
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
 * One run as a card: the best shader of the first round beside the best of the
 * last. That pair is the whole argument, which is why the samples use it, and
 * why a visitor's own runs should be shown the same way rather than as a list
 * of prompts.
 *
 * A run with one round has no "after" yet, so it shows the one it has. A run
 * still working shows a placeholder in the second slot: something is coming.
 */
export const RunCard = ({ run, active, onPick, footer, action }: RunCardProps): React.JSX.Element => {
  const before = winnerOf(run, 0);
  const after = lastScored(run);
  const working = run.status === "queued" || run.status === "running";
  const gain = (after?.candidate.scores?.total ?? 0) - (before?.scores?.total ?? 0);

  return (
    <div className={`runcard${active ? " is-active" : ""}`}>
      <button type="button" className="runcard-hit" onClick={() => onPick(run.id)} aria-pressed={active}>
        <span className="sample-shots">
          <Shot candidate={before} label="round 1" />
          <span className="sample-arrow" aria-hidden="true">
            →
          </span>
          {after !== undefined ? (
            <Shot candidate={after.candidate} label={`round ${after.index + 1}`} />
          ) : (
            <figure className="shot">
              <div className={`shot-blank${working ? " is-pending" : ""}`} />
              <figcaption>{working ? "working" : "one round"}</figcaption>
            </figure>
          )}
        </span>
        <span className="sample-prompt">{run.prompt}</span>
        <span className="sample-meta">
          {footer ?? (
            <>
              <span>
                {run.generations.length} round{run.generations.length === 1 ? "" : "s"}
              </span>
              {gain > 0 ? <b>+{gain}</b> : null}
            </>
          )}
        </span>
      </button>
      {action !== undefined ? <div className="runcard-action">{action}</div> : null}
    </div>
  );
};
