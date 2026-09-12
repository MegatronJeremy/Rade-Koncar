import { useQuery } from "convex/react";
import { Component, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { Run } from "../types";
import { SampleBar } from "./SampleBar";

/**
 * A query for a function the deployment does not have yet throws during render,
 * and an unguarded throw blanks the entire page. The gallery is the newest and
 * least important thing on screen, so it fails alone: the grid, the prompt box
 * and every sample already pinned keep working.
 */
class Boundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.warn("[samples] gallery unavailable:", error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

interface GalleryProps {
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  readonly liveRunning: boolean;
  readonly onLoaded: (runs: readonly Run[]) => void;
}

const Inner = ({ selectedId, onPick, liveRunning, onLoaded }: GalleryProps): React.JSX.Element => {
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
  onLoaded(gallery);
  return (
    <SampleBar
      samples={gallery}
      selectedId={selectedId}
      onPick={onPick}
      liveRunning={liveRunning}
    />
  );
};

export const SampleGallery = (props: GalleryProps): React.JSX.Element => (
  <Boundary>
    <Inner {...props} />
  </Boundary>
);
