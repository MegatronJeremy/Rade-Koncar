import type { OrchestratorState } from "../hooks/useOrchestrator";
import { PromptBox } from "./PromptBox";

interface HeroProps {
  readonly state: OrchestratorState;
  readonly submit: (prompt: string) => Promise<void>;
}

/**
 * The prompt is the product, so it is the first and largest thing on the page.
 * Everything below is evidence that it works.
 */
export const Hero = ({ state, submit }: HeroProps): React.JSX.Element => (
  <header className="hero">
    <h1 className="wordmark">Shader Arena</h1>
    <p className="thesis">
      Describe anything. An AI writes six small programs that each try to draw it, every one
      renders in its own sandbox, and a model looks at the results and says what is wrong. The
      best two survive and breed. Three rounds.
    </p>
    <PromptBox state={state} submit={submit} />
  </header>
);
