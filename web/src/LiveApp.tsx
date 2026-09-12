import { useQuery } from "convex/react";
import { useState } from "react";
import { useOrchestrator } from "./hooks/useOrchestrator";
import { api } from "../convex/_generated/api";
import { App } from "./App";
import { Hero } from "./components/Hero";
import { Rail, type Stage } from "./components/Rail";
import { SampleGallery } from "./components/SampleGallery";
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
export const LiveApp = (): React.JSX.Element => {
  const live = useQuery(api.runs.latestRun);
  const pinned = useQuery(api.runs.pinnedRun);
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  const orchestrator = useOrchestrator();
  const [stage, setStage] = useState<Stage>("run");

  /*
   * The gallery owns its own query so a deployment missing sampleRuns takes
   * down the bar and nothing else. It reports what it loaded back here, from an
   * effect, so the tab count and the chosen run both see it.
   */
  const [gallery, setGallery] = useState<readonly Run[]>([]);

  // `undefined` means still loading; `null` means loaded and absent.
  const loading = live === undefined || pinned === undefined;
  const chosen = gallery.find((r) => r.id === chosenId);

  /*
   * A run happening now always wins: someone is watching their own prompt. A
   * sample the visitor picked comes next, then the pinned run.
   */
  const current = live ?? null;
  const liveRunning = isWorking(current);
  const fromConvex = loading
    ? undefined
    : liveRunning
      ? current
      : (chosen ?? pickRun(current, pinned ?? null));

  return (
    <>
      <Rail
        stage={stage}
        onStage={setStage}
        sampleCount={gallery.length}
        running={liveRunning}
      />
      {stage === "run" ? (
        <Hero
          state={orchestrator.state}
          running={orchestrator.running}
          submit={orchestrator.submit}
          onBrowseSamples={() => setStage("samples")}
        />
      ) : null}
      <SampleGallery
        hidden={stage !== "samples"}
        selectedId={liveRunning ? undefined : (chosen?.id ?? fromConvex?.id)}
        onPick={setChosenId}
        liveRunning={liveRunning}
        onLoaded={setGallery}
      />
      <App run={fromConvex} />
    </>
  );
};
