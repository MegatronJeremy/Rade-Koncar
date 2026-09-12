import { useMemo, useState } from "react";
import { CandidateDetail } from "./components/CandidateDetail";
import { Column } from "./components/Column";
import { useFrameTick } from "./hooks/useFrameTick";
import type { Candidate, Generation, Run } from "./types";

export interface AppProps {
  readonly run: Run | undefined;
}

/** Every candidate in the run, for resolving `parentIds` to the tiles they name. */
const indexCandidates = (run: Run): ReadonlyMap<string, Candidate> =>
  new Map(run.generations.flatMap((g) => g.candidates.map((c) => [c.id, c] as const)));

const countWhere = (run: Run, match: (status: Candidate["status"]) => boolean): number =>
  run.generations.reduce(
    (total, g) => total + g.candidates.filter((c) => match(c.status)).length,
    0,
  );

const bestTotal = (generation: Generation): number =>
  generation.candidates.reduce((best, c) => Math.max(best, c.scores?.total ?? 0), 0);

export const App = ({ run }: AppProps): React.JSX.Element => {
  const frame = useFrameTick();
  const [shownGenerationId, setShownGenerationId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Candidate | undefined>(undefined);

  const byId = useMemo(
    () => (run === undefined ? new Map<string, Candidate>() : indexCandidates(run)),
    [run],
  );

  if (run === undefined) return <main className="empty" />;

  const tiles = run.generations.reduce((n, g) => n + g.candidates.length, 0);

  /*
   * A run is created before the model has written anything, and writing six
   * shaders takes around two minutes. Without this the page shows an empty grid
   * for that whole stretch, and anyone who reloads cannot tell their prompt
   * survived.
   */
  if (tiles === 0) {
    const working = run.status === "queued" || run.status === "running";
    return (
      <main className="starting">
        <span className={`run-state${working ? " is-live" : ""}`}>
          {working ? "Running now" : run.status}
        </span>
        <p className="starting-prompt">{run.prompt}</p>
        <p className="starting-note">
          {working
            ? "Writing six shaders. The first tiles appear in about two minutes, then each renders in its own sandbox."
            : "This run produced nothing."}
        </p>
      </main>
    );
  }

  const control = run.generations[0];
  /*
   * A generation exists from createGeneration, before its six candidates do, so
   * defaulting to the newest one empties the right column at the start of every
   * round. Fall back to the newest that actually holds tiles; an explicit pick
   * from the round picker still wins.
   */
  const withTiles = run.generations.filter((g) => g.candidates.length > 0);
  const shown =
    run.generations.find((g) => g.id === shownGenerationId) ??
    withTiles[withTiles.length - 1] ??
    run.generations[run.generations.length - 1];

  if (control === undefined || shown === undefined) {
    return (
      <main className="empty">
        <h1 className="wordmark">Shader Arena</h1>
        <p>This run has no generations.</p>
      </main>
    );
  }

  const failed = countWhere(run, (s) => s === "compile_error" || s === "timeout");
  const live = run.status === "running";
  const gain = bestTotal(shown) - bestTotal(control);

  return (
    <>
      <div className="run-bar">
        <span className={`run-state${live ? " is-live" : ""}`}>
          {live ? "Running now" : "Saved run"}
        </span>
        <span className="run-prompt">{run.prompt}</span>
        <span className="run-meta">
          <span>
            <b>{run.generations.length}</b> rounds
          </span>
          <span>
            <b>{failed}</b> never rendered
          </span>
          <span className="key">
            <i className="key-swatch" aria-hidden="true" /> survived
          </span>
        </span>
      </div>

      <p className="legend">
        Each tile is one shader, scored out of 30 by a vision model looking at three rendered
        frames: palette, motion and subject, 10 each. Anything that renders flat or never moves
        is rejected on the pixels first, without a vision call.
      </p>

      <main className="sheet">
        <Column
          kind="control"
          generation={control}
          heading="One shot"
          note="What the model writes from the prompt alone, with no feedback"
          frame={frame}
          onSelect={setSelected}
        />
        <Column
          kind="latest"
          generation={shown}
          heading={`Round ${shown.index}`}
          note={
            shown.index === control.index
              ? "Waiting for the first round of feedback"
              : `After ${shown.index - 1} round${shown.index - 1 === 1 ? "" : "s"} of rendering, scoring and mutation${gain > 0 ? `, best score up ${gain}` : ""}`
          }
          frame={frame}
          onSelect={setSelected}
          /* Round 1 is the baseline and is always on the left; offering it here
             too invites comparing it against itself. */
          generations={run.generations.slice(1)}
          onPick={setShownGenerationId}
        />
      </main>

      {selected !== undefined ? (
        <CandidateDetail
          candidate={selected}
          parents={selected.parentIds
            .map((id) => byId.get(id))
            .filter((c): c is Candidate => c !== undefined)}
          generationIndex={
            run.generations.find((g) => g.id === selected.generationId)?.index ?? 1
          }
          onClose={() => setSelected(undefined)}
        />
      ) : null}
    </>
  );
};
