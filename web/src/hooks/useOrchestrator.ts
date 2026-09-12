import { useCallback, useEffect, useState } from "react";

/**
 * `absent`  no VITE_ORCHESTRATOR_URL in this build
 * `probing` health check in flight
 * `up`      /health answered, prompts can be submitted
 * `down`    configured but unreachable
 */
export type OrchestratorState = "absent" | "probing" | "up" | "down";

const HEALTH_TIMEOUT_MS = 4000;

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
  readonly submit: (prompt: string) => Promise<void>;
} => {
  const base = configured();
  const [state, setState] = useState<OrchestratorState>(
    base === undefined ? "absent" : "probing",
  );

  useEffect(() => {
    if (base === undefined) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), HEALTH_TIMEOUT_MS);
    let cancelled = false;

    const started = Date.now();
    fetch(`${base}/health`, { signal: abort.signal })
      .then((res) => {
        console.info(`[orchestrator] /health ${res.status} in ${Date.now() - started}ms`);
        if (!cancelled) setState(res.ok ? "up" : "down");
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

      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? `Orchestrator returned ${res.status}`);
      }
    },
    [base],
  );

  return { state, submit };
};
