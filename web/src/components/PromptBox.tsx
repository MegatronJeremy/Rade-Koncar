import { useState } from "react";
import { BusyError, type OrchestratorState } from "../hooks/useOrchestrator";

interface PromptBoxProps {
  readonly state: OrchestratorState;
  /** What the orchestrator is already working on. One run at a time, service wide. */
  readonly running: string | undefined;
  readonly submit: (prompt: string) => Promise<string | undefined>;
}

/**
 * The main control. It is shown whether or not the orchestrator answered: this
 * is what the product does, and hiding it makes the page look like a gallery
 * that never had a prompt. When runs are off the input is disabled and the hero
 * says why.
 */
export const PromptBox = ({ state, running, submit }: PromptBoxProps): React.JSX.Element | null => {
  const [prompt, setPrompt] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState<boolean>(false);

  const ready = state === "up";

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
        // A refused second run is the service working as designed, not a failure.
        if (err instanceof BusyError) {
          setBusy(err.running ?? "another prompt");
          return;
        }
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
        disabled={sending || !ready}
      />
      <button
        type="submit"
        className="prompt-go"
        disabled={sending || !ready || prompt.trim().length === 0}
      >
        {sending ? "Starting" : "Run"}
      </button>
      {state === "probing" ? (
        <span className="prompt-note">Starting up, this can take a minute</span>
      ) : error !== undefined ? (
        <span className="prompt-note is-error">{error}</span>
      ) : busy !== undefined ? (
        <span className="prompt-note">
          Already running “{busy}”. One run at a time, since six sandboxes take the whole
          quota. Try again when it finishes.
        </span>
      ) : sent ? (
        <span className="prompt-note">Started. Six shaders are being written.</span>
      ) : running !== undefined ? (
        <span className="prompt-note">Currently running “{running}”.</span>
      ) : null}
    </form>
  );
};
