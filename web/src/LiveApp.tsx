import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { App } from "./App";
import { SEEDED_RUN } from "./fixtures";
import type { Run } from "./types";

/**
 * A live run takes over the view while it is running; otherwise the public URL
 * shows the pinned run. Judges open this link days later with nothing else
 * running, so the pinned run is the front door rather than a fallback.
 */
const pickRun = (live: Run | null, pinned: Run | null): Run | undefined => {
  if (live !== null && live.status === "running") return live;
  return pinned ?? live ?? undefined;
};

/**
 * Reads from Convex, and falls back to the bundled sample when Convex is still
 * loading or has no runs yet. The grid is never blank and never shows an error —
 * an empty database is a normal state on a fresh deploy, not a failure.
 */
export const LiveApp = (): React.JSX.Element => {
  const live = useQuery(api.runs.latestRun);
  const pinned = useQuery(api.runs.pinnedRun);

  // `undefined` means still loading; `null` means loaded and absent.
  const loading = live === undefined || pinned === undefined;
  const fromConvex = loading ? undefined : pickRun(live, pinned);

  return <App run={fromConvex ?? SEEDED_RUN} isSample={fromConvex === undefined} />;
};
