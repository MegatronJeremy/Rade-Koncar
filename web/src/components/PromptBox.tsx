import { useState } from "react";
import type { OrchestratorState } from "../hooks/useOrchestrator";

interface PromptBoxProps {
  readonly state: OrchestratorState;
  readonly submit: (prompt: string) => Promise<void>;
}

/**
 * Shown only when the orchestrator answered its health check. With no
 * orchestrator the control is absent rather than disabled: a dead input with no
 * explanation reads as a broken product, and this link is opened long after the
 * event with nothing running behind it.
 */
export const PromptBox = ({ state, submit }: PromptBoxProps): React.JSX.Element | null => {
  const [prompt, setPrompt] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState<boolean>(false);

  if (state === "probing") return null;

  if (state !== "up") {
    return (
      <p className="prompt-quiet">
        Live runs during the event. This is a saved run.
      </p>
    );
  }

  const send = (event: React.FormEvent): void => {
    event.preventDefault();
    const text = prompt.trim();
    if (text.length === 0 || sending) return;

    setSending(true);
    setError(undefined);
    setSent(false);
    submit(text)
      .then(() => {
        setPrompt("");
        setSent(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not reach the orchestrator");
      })
      .finally(() => setSending(false));
  };

  return (
    <form className="prompt" onSubmit={send}>
      <input
        className="prompt-input"
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setSent(false);
        }}
        placeholder="a candle flame flickering in the dark"
        aria-label="Describe what the shaders should draw"
        disabled={sending}
      />
      <button type="submit" className="prompt-go" disabled={sending || prompt.trim().length === 0}>
        {sending ? "Starting" : "Run"}
      </button>
      {error !== undefined ? (
        <span className="prompt-note is-error">{error}</span>
      ) : sent ? (
        <span className="prompt-note">Started. Six shaders are being written.</span>
      ) : null}
    </form>
  );
};
