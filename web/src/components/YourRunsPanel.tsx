import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import type { Run } from "../types";
import { Boundary } from "./Boundary";
import { YourRuns } from "./YourRuns";

interface PanelProps {
  /** Kept mounted while hidden: the query feeds the tab's count and the live run. */
  readonly hidden?: boolean;
  readonly ids: readonly string[];
  readonly selectedId: string | undefined;
  readonly onPick: (runId: string) => void;
  readonly onContinue: (runId: string) => void;
  readonly onStop: (runId: string) => void;
  readonly stopping: ReadonlySet<string>;
  readonly starting: ReadonlySet<string>;
  readonly blocked: boolean;
  readonly onLoaded: (runs: readonly Run[]) => void;
}

const Inner = ({ hidden, ids, selectedId, onPick, onContinue, onStop, stopping, starting, blocked, onLoaded }: PanelProps): React.JSX.Element | null => {
  const runs = useQuery(api.runs.runsByIds, ids.length === 0 ? "skip" : { ids: [...ids] });
  const mine = (runs ?? []) as readonly Run[];

  // From an effect, not during render: the parent uses this to decide which run
  // to show, and writing it mid-render leaves it a paint behind.
  const key = mine.map((r) => `${r.id}:${r.status}:${r.generations.length}`).join(",");
  useEffect(() => {
    onLoaded(mine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (hidden === true) return null;
  return (
    <YourRuns
      runs={mine}
      selectedId={selectedId}
      onPick={onPick}
      onContinue={onContinue}
      onStop={onStop}
      stopping={stopping}
      starting={starting}
      blocked={blocked}
    />
  );
};

export const YourRunsPanel = (props: PanelProps): React.JSX.Element => (
  <Boundary what="your runs">
    <Inner {...props} />
  </Boundary>
);
