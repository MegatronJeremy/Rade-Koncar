import { useCallback, useEffect, useState } from "react";

/**
 * `absent`  no VITE_ORCHESTRATOR_URL in this build
 * `probing` health check in flight
 * `up`      /health answered, prompts can be submitted
 * `down`    configured but unreachable
 */
export type OrchestratorState = "absent" | "probing" | "up" | "down";

const HEALTH_TIMEOUT_MS = 4000;

/**
 * One run at a time service-wide: Daytona allows 10 GiB and six sandboxes at
 * 4 GB each already own it. A second prompt is refused, which is a normal
 * answer rather than a failure, so it carries its own type.
 */
export class BusyError extends Error {
  readonly running: string | undefined;
  constructor(running: string | undefined) {
    super("busy");
    this.name = "BusyError";
    this.running = running;
  }
}

const configured = (): string | undefined => {
  const url = import.meta.env.VITE_ORCHESTRATOR_URL;
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim().replace(/\/$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * A non-empty but dead URL must not leave the page waiting forever, so the probe
 * is bounded rather than left to the browser's own connect timeout. Anything but
 * a healthy answer means the prompt box is not shown at all: a judge opening this
 * link long after the event should see a finished product, not a dead control.
 */
export const useOrchestrator = (): {
  readonly state: OrchestratorState;
  /** The prompt already running service-wide, if any. Only one run at a time. */
  readonly running: string | undefined;
  readonly submit: (prompt: string) => Promise<void>;
} => {
  const base = configured();
  const [state, setState] = useState<OrchestratorState>(
    base === undefined ? "absent" : "probing",
  );
  const [running, setRunning] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (base === undefined) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), HEALTH_TIMEOUT_MS);
    let cancelled = false;

    const started = Date.now();
    fetch(`${base}/health`, { signal: abort.signal })
      .then(async (res) => {
        console.info(`[orchestrator] /health ${res.status} in ${Date.now() - started}ms`);
        if (cancelled) return;
        setState(res.ok ? "up" : "down");
        const body = (await res.json().catch(() => ({}))) as { running?: string | null };
        if (!cancelled) setRunning(body.running ?? undefined);
      })
      .catch(() => {
        console.info(`[orchestrator] /health unreachable after ${Date.now() - started}ms`);
        if (!cancelled) setState("down");
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [base]);

  const submit = useCallback(
    async (prompt: string): Promise<void> => {
      if (base === undefined) throw new Error("No orchestrator configured");
      const started = Date.now();
      const res = await fetch(`${base}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      console.info(`[orchestrator] POST /run ${res.status} in ${Date.now() - started}ms`);

      const detail = (await res.json().catch(() => ({}))) as {
        error?: string;
        busy?: boolean;
        running?: string;
      };

      if (res.status === 429 || detail.busy === true) {
        setRunning(detail.running);
        throw new BusyError(detail.running);
      }
      if (!res.ok) throw new Error(detail.error ?? `Orchestrator returned ${res.status}`);
      setRunning(prompt);
    },
    [base],
  );

  return { state, running, submit };
};
