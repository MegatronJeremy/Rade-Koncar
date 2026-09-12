import { useMemo, useState } from "react";
import { CandidateDetail } from "./components/CandidateDetail";
import { Column } from "./components/Column";
import { indexCandidates, SEEDED_RUN } from "./fixtures";
import { useFrameTick } from "./hooks/useFrameTick";
import type { Candidate, Generation, Run } from "./types";

/**
 * A live run takes over the view while it is running; otherwise the public URL
 * shows the pinned run. Judges open this link days later with nothing else
 * running, so the pinned run is the front door rather than a fallback.
 */
const pickRun = (live: Run | undefined, pinned: Run | undefined): Run | undefined => {
  if (live !== undefined && live.status === "running") return live;
  return pinned ?? live;
};

const countWhere = (run: Run, match: (status: Candidate["status"]) => boolean): number =>
  run.generations.reduce(
    (total, g) => total + g.candidates.filter((c) => match(c.status)).length,
    0,
  );

const bestTotal = (generation: Generation): number =>
  generation.candidates.reduce((best, c) => Math.max(best, c.scores?.total ?? 0), 0);

export const App = (): React.JSX.Element => {
  const frame = useFrameTick();
  const [shownGenerationId, setShownGenerationId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Candidate | undefined>(undefined);

  // Until Convex is wired, there is no live run — `pickRun` still decides.
  const run = pickRun(undefined, SEEDED_RUN);
  const byId = useMemo(() => (run === undefined ? new Map() : indexCandidates(run)), [run]);

  if (run === undefined) {
    return (
      <main className="empty">
        <h1 className="wordmark">Shader Arena</h1>
        <p>No runs yet. Send a prompt to start one.</p>
      </main>
    );
  }

  const control = run.generations[0];
  const shown =
    run.generations.find((g) => g.id === shownGenerationId) ??
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
      <header className="masthead">
        <h1 className="wordmark">Shader Arena</h1>
        <p className="thesis">
          An AI writes six small programs that each try to draw your description. Every one
          runs in its own sandbox, gets screenshotted, and is scored on what it actually
          drew. The best two survive and breed. Three rounds.
        </p>
      </header>

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
              ? "The same round, side by side"
              : `After ${shown.index - 1} round${shown.index - 1 === 1 ? "" : "s"} of rendering, scoring and mutation${gain > 0 ? ` — best score up ${gain}` : ""}`
          }
          frame={frame}
          onSelect={setSelected}
          generations={run.generations}
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
