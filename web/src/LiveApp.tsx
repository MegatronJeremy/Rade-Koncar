import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { App } from "./App";
import { SampleGallery } from "./components/SampleGallery";
import { SEEDED_RUN } from "./fixtures";
import type { Run } from "./types";

/**
 * A run is worth showing only once it has a tile in it. A run exists from the
 * moment the orchestrator calls createRun, which is before its first candidate,
 * so showing whatever is newest blanks the grid at the start of every run.
 */
const hasTiles = (run: Run | null | undefined): run is Run =>
  run !== null && run !== undefined && run.generations.some((g) => g.candidates.length > 0);

/**
 * A live run takes over the view while it is running; otherwise the public URL
 * shows the pinned run. Judges open this link days later with nothing else
 * running, so the pinned run is the front door rather than a fallback.
 */
const pickRun = (live: Run | null, pinned: Run | null): Run | undefined => {
  if (hasTiles(live) && live.status === "running") return live;
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

  /*
   * The gallery owns its own query so that a deployment missing sampleRuns
   * takes down the bar and nothing else. It hands the loaded runs back here,
   * through a ref rather than state, because writing state during another
   * component's render would loop.
   */
  const galleryRef = useRef<readonly Run[]>([]);

  // `undefined` means still loading; `null` means loaded and absent.
  const loading = live === undefined || pinned === undefined;
  const chosen = galleryRef.current.find((r) => r.id === chosenId);

  /*
   * A run happening now always wins: someone is watching their own prompt. A
   * sample the visitor picked comes next, then the pinned run.
   */
  const liveRunning = hasTiles(live) && live.status === "running";
  const fromConvex = loading ? undefined : liveRunning ? live : (chosen ?? pickRun(live, pinned));

  return (
    <>
      <SampleGallery
        selectedId={liveRunning ? undefined : (chosen?.id ?? fromConvex?.id)}
        onPick={setChosenId}
        liveRunning={liveRunning}
        onLoaded={(runs) => {
          galleryRef.current = runs;
        }}
      />
      <App run={fromConvex ?? SEEDED_RUN} isSample={fromConvex === undefined} />
    </>
  );
};
