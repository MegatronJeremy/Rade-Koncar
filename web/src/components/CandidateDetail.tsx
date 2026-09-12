import { useCallback, useEffect, useRef, useState } from "react";
import type { Candidate } from "../types";

interface CandidateDetailProps {
  readonly candidate: Candidate;
  /** Resolves `parentIds` to the candidates they point at. */
  readonly parents: readonly Candidate[];
  readonly generationIndex: number;
  readonly onClose: () => void;
}

const FRAME_SECONDS = [0, 1, 2] as const;

const STATUS_TEXT: Record<Candidate["status"], string> = {
  queued: "Waiting for a sandbox",
  rendering: "Rendering in its sandbox",
  scoring: "Being scored",
  scored: "Rendered and scored",
  compile_error: "Never compiled",
  timeout: "Hung, and its sandbox was killed",
};

const CopyButton = ({ source }: { readonly source: string }): React.JSX.Element => {
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        void navigator.clipboard.writeText(source).then(() => setCopied(true));
      }}
    >
      {copied ? "Copied" : "Copy shader"}
    </button>
  );
};

/**
 * The live shader view, `harness/harness.html` in an iframe. It is the same page
 * the sandbox renders through, so what runs here is what the scorer saw.
 *
 * Source goes in by postMessage rather than a query string: shaders run to
 * several kilobytes and URLs have limits.
 *
 * If the page does not report itself ready, the caller falls back to the plain
 * source listing. A judge meeting an empty box is worse than a judge meeting
 * text, and the copy step that puts this file in `public/` is a build detail
 * that can fail without anyone noticing until the deploy.
 */
const HARNESS_URL = "/harness.html?embed=1&live=1";
const HARNESS_TIMEOUT_MS = 2500;

const LiveShader = ({
  source,
  onFailed,
}: {
  readonly source: string;
  readonly onFailed: () => void;
}): React.JSX.Element => {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef<boolean>(false);

  useEffect(() => {
    const send = (): void => {
      frame.current?.contentWindow?.postMessage(
        { type: "harness:source", source, autoplay: true },
        "*",
      );
    };

    const onMessage = (event: MessageEvent): void => {
      if (event.source !== frame.current?.contentWindow) return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null) return;
      if ((data as { type?: unknown }).type !== "harness:ready") return;
      ready.current = true;
      send();
    };

    window.addEventListener("message", onMessage);
    // harness:ready can fire before this effect subscribes, so push once anyway.
    const push = window.setTimeout(send, 150);
    const giveUp = window.setTimeout(() => {
      if (!ready.current) onFailed();
    }, HARNESS_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(push);
      window.clearTimeout(giveUp);
    };
    // onFailed must be referentially stable. The grid re-renders every 500 ms to
    // cycle frames, and an inline callback here would restart the timeout on
    // every one of those, so the fallback would never fire.
  }, [source, onFailed]);

  return <iframe ref={frame} className="detail-live" src={HARNESS_URL} title="Live shader" />;
};

export const CandidateDetail = ({
  candidate,
  parents,
  generationIndex,
  onClose,
}: CandidateDetailProps): React.JSX.Element => {
  const ref = useRef<HTMLDialogElement>(null);
  const [liveFailed, setLiveFailed] = useState<boolean>(false);
  const onLiveFailed = useCallback(() => setLiveFailed(true), []);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null || dialog.open) return;
    dialog.showModal();
  }, []);

  // A candidate that never compiled has nothing to run, so it keeps the listing.
  const canRunLive = !liveFailed && candidate.status !== "compile_error" && candidate.source.length > 0;

  const { scores } = candidate;

  return (
    <dialog
      ref={ref}
      className="detail"
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the dialog element itself is a backdrop click.
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <header className="detail-head">
        <div>
          <h2 className="detail-title">{candidate.strategy}</h2>
          <p className="detail-sub">
            Generation {generationIndex}, candidate {candidate.index + 1} of 6 —{" "}
            {STATUS_TEXT[candidate.status]}
          </p>
        </div>
        <button type="button" className="detail-close" onClick={() => ref.current?.close()}>
          Close
        </button>
      </header>

      <div className="detail-body">
        <div className="detail-grid">
        <div className="detail-visual">
          {candidate.frameUrls.length > 0 ? (
            <div className="strip">
              {candidate.frameUrls.map((url, i) => (
                <figure key={url.slice(-24)} className="strip-cell">
                  <img src={url} alt={`Rendered at ${FRAME_SECONDS[i] ?? i} seconds`} />
                  <figcaption>t = {FRAME_SECONDS[i] ?? i} s</figcaption>
                </figure>
              ))}
            </div>
          ) : candidate.status === "compile_error" ? (
            <div className="detail-fail">
              <h3>Compiler output</h3>
              <pre>{candidate.log ?? "No log recorded."}</pre>
            </div>
          ) : candidate.status === "timeout" ? (
            <div className="detail-fail">
              <h3>Killed at 60 seconds</h3>
              <p>
                This shader compiled, started drawing and never returned a frame — almost
                always an unbounded loop. It is not a catchable error: the renderer simply
                stops. Because it had a sandbox to itself, it died alone and the other five
                candidates finished normally.
              </p>
            </div>
          ) : (
            <div className="detail-fail">
              <h3>No frames yet</h3>
              <p>This candidate has not finished rendering.</p>
            </div>
          )}

          {scores !== undefined ? (
            <table className="scores">
              <caption>
                {scores.flat
                  ? "Flat image. Scored zero without spending a vision call."
                  : "Motion is measured from the pixels; palette and subject come from the vision model."}
              </caption>
              <tbody>
                <tr>
                  <th scope="row">Palette</th>
                  <td>{scores.palette}</td>
                </tr>
                <tr>
                  <th scope="row">Motion</th>
                  <td>{scores.motion}</td>
                </tr>
                <tr>
                  <th scope="row">Subject</th>
                  <td>{scores.subject}</td>
                </tr>
                <tr className="scores-total">
                  <th scope="row">Total</th>
                  <td>{scores.total}</td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="detail-text">
          {candidate.critique !== undefined ? (
            <section className="detail-block">
              <h3>What the model saw</h3>
              <p className="critique">{candidate.critique}</p>
            </section>
          ) : null}

          {parents.length > 0 ? (
            <section className="detail-block">
              <h3>Mutated from</h3>
              <ul className="lineage">
                {parents.map((parent) => (
                  <li key={parent.id}>
                    <span>{parent.strategy}</span>
                    {parent.scores !== undefined ? <b>{parent.scores.total}</b> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="detail-block">
              <h3>Mutated from</h3>
              <p className="detail-muted">
                Nothing. Generation 1 is written from the prompt alone — this is the
                one-shot control.
              </p>
            </section>
          )}

        </div>
        </div>

        <section className="detail-source">
          <div className="detail-source-head">
            <h3>{canRunLive ? "Shader, running live" : "Shader"}</h3>
            <CopyButton source={candidate.source} />
          </div>
          {canRunLive ? (
            <LiveShader source={candidate.source} onFailed={onLiveFailed} />
          ) : (
            <pre>{candidate.source}</pre>
          )}
        </section>
      </div>
    </dialog>
  );
};
