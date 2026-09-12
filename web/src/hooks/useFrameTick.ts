import { useEffect, useState } from "react";

const FRAME_MS = 500;
const FRAME_COUNT = 3;
/** t1 — the frame the grid rests on when motion is switched off. */
const STILL_FRAME = 1;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One timer for the whole grid, so every tile flips to its next frame on the
 * same beat. Three frames on a 500 ms loop is what makes a still grid read as
 * motion — it is also the only honest way to show a shader in a screenshot,
 * since a single frame cannot distinguish an animated shader from a static one.
 *
 * Returns the frame index every tile should be showing right now.
 */
export const useFrameTick = (): number => {
  const [frame, setFrame] = useState<number>(STILL_FRAME);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const start = (): (() => void) => {
      if (motion.matches) {
        setFrame(STILL_FRAME);
        return () => {};
      }
      const id = window.setInterval(() => {
        setFrame((f) => (f + 1) % FRAME_COUNT);
      }, FRAME_MS);
      return () => window.clearInterval(id);
    };

    let stop = start();
    const restart = (): void => {
      stop();
      stop = start();
    };

    motion.addEventListener("change", restart);
    return () => {
      stop();
      motion.removeEventListener("change", restart);
    };
  }, []);

  return prefersReducedMotion() ? STILL_FRAME : frame;
};
