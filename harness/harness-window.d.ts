// The surface harness.html exposes. render.ts and batch.ts both drive the page
// through this and nothing else.
declare global {
  interface Window {
    harness: {
      ready: boolean;
      compile(source: string): { ok: boolean; log: string; ms: number };
      renderAt(t: number): void;
      captureAt(t: number): { dataUrl: string; ms: number };
      canvas: HTMLCanvasElement;
      gl: WebGL2RenderingContext;
    };
  }
}

export {};
