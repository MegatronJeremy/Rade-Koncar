import { useCallback, useEffect, useState } from "react";

/**
 * `absent`  no VITE_ORCHESTRATOR_URL in this build
 * `probing` health check in flight, or waiting to try again
 * `up`      /health answered, prompts can be submitted
 * `down`    configured, and still unreachable after every attempt
 */
export type OrchestratorState = "absent" | "probing" | "up" | "down";

const HEALTH_TIMEOUT_MS = 4000;

/**
 * A host that has been idle takes far longer than one timeout to answer, and the
 * request itself is what wakes it. Probing once meant a visitor arriving after a
 * quiet spell got a single four-second attempt against a waking service, and
 * then a dead prompt box until they thought to reload, on a product whose whole
 * point is the prompt box.
 *
 * So keep asking. The first few attempts are close together for the ordinary
 * case of a brief hiccup, then it settles into a slow poll that costs nothing
 * and repairs itself whenever the service comes back.
 */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
const SETTLED_MS = 15000;

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

/**
 * The orchestrator reports the prompt in flight, but falls back to a run id when
 * a run was started without one, and an id quoted as if it were a prompt reads
 * as a bug. Matched on the id's own shape rather than on "has a space", because
 * a one word prompt is perfectly ordinary.
 */
const CONVEX_ID = /^[a-z0-9]{25,}$/;

const asPrompt = (running: string | null | undefined): string | undefined => {
  if (typeof running !== "string") return undefined;
  const text = running.trim();
  if (text.length === 0 || CONVEX_ID.test(text)) return undefined;
  return text;
};

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
  readonly submit: (prompt: string) => Promise<string | undefined>;
  /** One more round on an existing run. Rounds are asked for, not assumed. */
  readonly continueRun: (runId: string) => Promise<void>;
  /** Takes effect before the next candidate renders, so within seconds. */
  readonly stop: (runId: string) => Promise<void>;
} => {
  const base = configured();
  const [state, setState] = useState<OrchestratorState>(
    base === undefined ? "absent" : "probing",
  );
  const [running, setRunning] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (base === undefined) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;

    const probe = (): void => {
      const abort = new AbortController();
      const bail = window.setTimeout(() => abort.abort(), HEALTH_TIMEOUT_MS);
      const started = Date.now();

      fetch(`${base}/health`, { signal: abort.signal })
        .then((res) => {
          console.info(`[orchestrator] /health ${res.status} in ${Date.now() - started}ms`);
          if (cancelled) return;
          if (res.ok) {
            setState("up");
            return;
          }
          retry();
        })
        .catch(() => {
          console.info(`[orchestrator] /health unreachable after ${Date.now() - started}ms`);
          if (!cancelled) retry();
        })
        .finally(() => window.clearTimeout(bail));
    };

    const retry = (): void => {
      const wait = BACKOFF_MS[attempt] ?? SETTLED_MS;
      // `down` only once the quick attempts are spent, so a brief hiccup never
      // shows the visitor a dead control.
      setState(attempt >= BACKOFF_MS.length ? "down" : "probing");
      attempt += 1;
      timer = window.setTimeout(probe, wait);
    };

    probe();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [base]);

  /**
   * Resolves with the run's id so the page can follow its own run and no other.
   * Without it every visitor saw whichever run was newest, and one person's
   * prompt took over everyone's screen.
   */
  const submit = useCallback(
    async (prompt: string): Promise<string | undefined> => {
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
        runId?: string | null;
      };

      if (res.status === 429 || detail.busy === true) {
        const other = asPrompt(detail.running);
        setRunning(other);
        throw new BusyError(other);
      }
      if (!res.ok) throw new Error(detail.error ?? `Orchestrator returned ${res.status}`);
      setRunning(prompt);
      return detail.runId ?? undefined;
    },
    [base],
  );

  const post = useCallback(
    async (path: string, payload: Record<string, unknown>): Promise<Response> => {
      if (base === undefined) throw new Error("No orchestrator configured");
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.info(`[orchestrator] POST ${path} ${res.status}`);
      return res;
    },
    [base],
  );

  const continueRun = useCallback(
    async (runId: string): Promise<void> => {
      const res = await post("/continue", { runId });
      if (res.status === 429) throw new BusyError(undefined);
      if (!res.ok) throw new Error(`Could not continue: ${res.status}`);
    },
    [post],
  );

  const stop = useCallback(
    async (runId: string): Promise<void> => {
      const res = await post("/stop", { runId });
      if (!res.ok) throw new Error(`Could not stop: ${res.status}`);
    },
    [post],
  );

  return { state, running, submit, continueRun, stop };
};
