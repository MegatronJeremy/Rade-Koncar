import type { ReactNode } from "react";

export type Stage = "run" | "yours" | "samples";

interface RailProps {
  readonly stage: Stage;
  readonly onStage: (stage: Stage) => void;
  readonly sampleCount: number;
  readonly yoursCount: number;
  readonly running: boolean;
}

const Tab = ({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): React.JSX.Element => (
  <button type="button" className={`tab${active ? " is-on" : ""}`} onClick={onClick} aria-pressed={active}>
    {children}
  </button>
);

/**
 * Wordmark, one line of what this is, and the two things you can do. The rail
 * stays put; only the stage under it changes, so the run being watched never
 * scrolls away behind a tab.
 */
export const Rail = ({ stage, onStage, sampleCount, yoursCount, running }: RailProps): React.JSX.Element => (
  <div className="rail">
    <div className="rail-in">
      <div className="rail-id">
        <div className="rail-name">
          <img className="crest" src="/logo.png" alt="Rade Končar" width={22} height={33} />
          <h1 className="wordmark">Shader Arena</h1>
        </div>
        <p className="rail-thesis">
          A model writes six shaders, looks at what they drew, and rewrites the best two.
        </p>
      </div>
      <nav className="tabs" aria-label="Views">
        <Tab active={stage === "run"} onClick={() => onStage("run")}>
          Run yours
        </Tab>
        {yoursCount > 0 ? (
          <Tab active={stage === "yours"} onClick={() => onStage("yours")}>
            Your runs <span className="tab-n">{yoursCount}</span>
            {/* The pip lives here because this is where a run in flight is listed. */}
            {running ? <i className="pip" aria-label="a run is happening now" /> : null}
          </Tab>
        ) : null}
        <Tab active={stage === "samples"} onClick={() => onStage("samples")}>
          Samples <span className="tab-n">{sampleCount}</span>
        </Tab>
      </nav>
    </div>
  </div>
);
