import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Boundary } from "./Boundary";
import { api } from "../../convex/_generated/api";
import type { Run } from "../types";
import { SampleBar } from "./SampleBar";

interface GalleryProps {
  /** Kept mounted while hidden: the query feeds the tab's count. */
  readonly hidden?: boolean;
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  readonly liveRunning: boolean;
  /** True while the live run owns the view and no sample has been picked. */
  readonly showingLive?: boolean;
  readonly onFollowLive?: () => void;
  readonly onLoaded: (runs: readonly Run[]) => void;
}

const Inner = ({ hidden, selectedId, onPick, liveRunning, showingLive, onFollowLive, onLoaded }: GalleryProps): React.JSX.Element | null => {
  const samples = useQuery(api.runs.sampleRuns);
  // Convex brands its ids; Run narrows them to string, so widen on the way out.
  const withTiles = (samples ?? []).filter((r) =>
    r.generations.some((g) => g.candidates.length > 0),
  ) as readonly Run[];

  /*
   * Biggest climb first. Creation order is arbitrary to a visitor, and the
   * first sample is the one most people will click, so it should be the run
   * where the loop most obviously did something.
   */
  const climb = (r: Run): number => {
    const best = (i: number) =>
      (r.generations[i]?.candidates ?? []).reduce((m, c) => Math.max(m, c.scores?.total ?? 0), 0);
    return best(r.generations.length - 1) - best(0);
  };
  const gallery = [...withTiles].sort((a, b) => climb(b) - climb(a));
  /*
   * Reported from an effect, not during render: the rail shows the count, and
   * writing it mid-render leaves the rail a paint behind with no re-render to
   * correct it. The dependency is the id list so a poll that returns equal data
   * does not loop.
   */
  const ids = gallery.map((r) => r.id).join(",");
  useEffect(() => {
    onLoaded(gallery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (hidden === true) return null;
  return (
    <SampleBar
      samples={gallery}
      selectedId={selectedId}
      onPick={onPick}
      liveRunning={liveRunning}
      showingLive={showingLive ?? false}
      onFollowLive={onFollowLive}
    />
  );
};

export const SampleGallery = (props: GalleryProps): React.JSX.Element => (
  <Boundary what="samples">
    <Inner {...props} />
  </Boundary>
);
