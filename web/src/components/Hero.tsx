import type { OrchestratorState } from "../hooks/useOrchestrator";
import { PromptBox } from "./PromptBox";

interface HeroProps {
  readonly state: OrchestratorState;
  readonly running: string | undefined;
  readonly submit: (prompt: string) => Promise<string | undefined>;
  readonly onBrowseSamples: () => void;
}

/**
 * The prompt is the product, so it gets the stage to itself. When runs are off
 * the control stays visible and disabled with the reason: hiding a product's
 * main feature to avoid a dead input is worse than a dead input that explains
 * itself and points somewhere useful.
 */
export const Hero = ({ state, running, submit, onBrowseSamples }: HeroProps): React.JSX.Element => (
  <section className="stage stage-run">
    <p className="ask">Describe anything.</p>
    <PromptBox state={state} running={running} submit={submit} />
    <p className="how">
      Six shaders get written, each renders in its own sandbox, and a model scores what they
      actually drew. About two and a half minutes for a round. Then you decide whether the best
      two get rewritten with the criticism, and go again.
    </p>
    {state === "up" || state === "probing" ? null : (
      <p className="how">
        Live runs are off right now.{" "}
        <button type="button" className="linkish" onClick={onBrowseSamples}>
          Browse finished runs
        </button>{" "}
        instead.
      </p>
    )}
  </section>
);
