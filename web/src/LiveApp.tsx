import { useQuery } from "convex/react";
import { useState } from "react";
import { useOrchestrator } from "./hooks/useOrchestrator";
import { api } from "../convex/_generated/api";
import { App } from "./App";
import { Hero } from "./components/Hero";
import { Rail, type Stage } from "./components/Rail";
import { SampleGallery } from "./components/SampleGallery";
import { YourRunsPanel } from "./components/YourRunsPanel";
import type { Run } from "./types";

/**
 * A run is worth showing only once it has a tile in it. A run exists from the
 * moment the orchestrator calls createRun, which is before its first candidate,
 * so showing whatever is newest blanks the grid at the start of every run.
 */
const hasTiles = (run: Run | null | undefined): run is Run =>
  run !== null && run !== undefined && run.generations.some((g) => g.candidates.length > 0);

/**
 * A run older than this is not live however it is labelled. The orchestrator
 * marks a run failed on its way out, but a crash, a Render restart or a kill
 * that outruns the handler leaves one stranded as running, and the view prefers
 * a running run over the pinned one. Without a clock on it, one stranded run
 * holds the front page forever. Fifteen minutes is twice the length of a normal
 * three-round run.
 */
/**
 * A run older than this is not working on anything, however it is labelled. The
 * orchestrator marks a run failed on its way out, but a crash, a Render restart
 * or a kill that outruns the handler leaves one stranded, and this view prefers
 * a working run over the pinned one. Without a clock, one stranded run holds the
 * front page forever, which is exactly what happened. Fifteen minutes is twice a
 * normal three-round run.
 */
const STALE_MS = 15 * 60 * 1000;

/**
 * Queued or running: the orchestrator is working on it, tiles or not. Showing a
 * run before its first tile is deliberate, so submitting a prompt does something
 * visible immediately, and it is also why the clock matters: a stranded run with
 * no tiles at all would otherwise take the page.
 */
const isWorking = (run: Run | null): run is Run =>
  run !== null &&
  (run.status === "queued" || run.status === "running") &&
  Date.now() - run.createdAt < STALE_MS;

/**
 * A working run takes over the view; otherwise the public URL shows the pinned
 * run. Judges open this link days later with nothing else running, so the
 * pinned run is the front door rather than a fallback.
 */
const pickRun = (live: Run | null, pinned: Run | null): Run | undefined => {
  if (isWorking(live)) return live;
  if (hasTiles(pinned)) return pinned;
  if (hasTiles(live)) return live;
  return undefined;
};

/**
 * Reads from Convex, and falls back to the bundled sample when Convex is still
 * loading or has nothing worth showing. The grid is never blank and never shows
 * an error: an empty database is a normal state on a fresh deploy, not a failure.
 */
/**
 * Every run this browser has started, newest first. Kept in localStorage so a
 * visitor's history survives a reload and a return visit; a run belongs to
 * whoever asked for it, and nobody else should see it take over their page.
 */
const MINE_KEY = "shader-arena.my-runs";
const MAX_HISTORY = 20;

const readMine = (): string[] => {
  try {
    const raw = window.localStorage.getItem(MINE_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const writeMine = (ids: string[]): void => {
  try {
    window.localStorage.setItem(MINE_KEY, JSON.stringify(ids.slice(0, MAX_HISTORY)));
  } catch {
    // Private mode: runs still work, the list just will not survive a reload.
  }
};

export const LiveApp = (): React.JSX.Element => {
  const pinned = useQuery(api.runs.pinnedRun);
  const [mineIds, setMineIds] = useState<string[]>(readMine);
  /*
   * Only this visitor's own run is followed. latestRun is global, so using it
   * meant whoever prompted last took over every open page. Skipped entirely
   * when nothing has been started here.
   */
  const [myRuns, setMyRuns] = useState<readonly Run[]>([]);
  // The newest of mine that the orchestrator is still working on, if any.
  const live = myRuns.find((r) => isWorking(r)) ?? null;
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const base = useOrchestrator();
  const orchestrator = {
    ...base,
    submit: async (prompt: string): Promise<string | undefined> => {
      const id = await base.submit(prompt);
      if (id !== undefined) {
        const next = [id, ...mineIds.filter((x) => x !== id)].slice(0, MAX_HISTORY);
        setMineIds(next);
        writeMine(next);
        setChosenId(undefined);
      }
      return id;
    },
  };
  const [stage, setStage] = useState<Stage>("run");

  /*
   * The gallery owns its own query so a deployment missing sampleRuns takes
   * down the bar and nothing else. It reports what it loaded back here, from an
   * effect, so the tab count and the chosen run both see it.
   */
  const [gallery, setGallery] = useState<readonly Run[]>([]);

  // `undefined` means still loading; `null` means loaded and absent.
  const loading = pinned === undefined;
  const chosen = [...gallery, ...myRuns].find((r) => r.id === chosenId);

  /*
   * A run happening now always wins: someone is watching their own prompt. A
   * sample the visitor picked comes next, then the pinned run.
   */
  const current = live ?? null;
  const liveRunning = isWorking(current);
  /*
   * An explicit click beats everything. A running run used to short-circuit
   * before `chosen` was consulted, so while anyone's run was in flight the
   * sample cards silently did nothing when clicked: the state changed and the
   * view did not. Automatic preferences only decide when the visitor has not.
   */
  const fromConvex = loading
    ? undefined
    : (chosen ?? (liveRunning ? current : pickRun(current, pinned ?? null)));

  return (
    <>
      <Rail
        stage={stage}
        onStage={setStage}
        sampleCount={gallery.length}
        running={liveRunning}
      />
      {stage === "run" ? (
        <>
          <Hero
          state={orchestrator.state}
          running={orchestrator.running}
          submit={orchestrator.submit}
            onBrowseSamples={() => setStage("samples")}
          />
          <YourRunsPanel
            ids={mineIds}
            selectedId={chosen?.id}
            onPick={setChosenId}
            onLoaded={setMyRuns}
          />
        </>
      ) : null}
      <SampleGallery
        hidden={stage !== "samples"}
        selectedId={chosen?.id ?? (liveRunning ? undefined : fromConvex?.id)}
        onPick={setChosenId}
        showingLive={liveRunning && chosen === undefined}
        onFollowLive={() => setChosenId(undefined)}
        liveRunning={liveRunning}
        onLoaded={setGallery}
      />
      <App run={fromConvex} />
    </>
  );
};
