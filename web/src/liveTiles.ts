/**
 * Runs every tile's shader live, from one WebGL context.
 *
 * A context per tile is not an option: browsers cap a page at roughly 16 and
 * the grid alone wants 12, with the detail dialog on top. So one offscreen
 * context draws each shader in turn and blits the result into that tile's 2D
 * canvas, which is the same trick a shader gallery uses.
 *
 * The wrapper and the uniforms match `harness/harness.html` exactly. A tile is
 * only ever a preview of what the sandbox rendered; the scored frames are still
 * the PNGs, and anything that fails to compile here falls back to them.
 */

const SIZE = 256;
const LOOP_SECONDS = 10;
/** Redraw budget. 12 shaders at 60fps is wasted work on a laptop. */
const FPS = 30;

const WRAPPER_HEAD = `#version 300 es
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
out vec4 outColor;
#line 1
`;
const WRAPPER_TAIL = `
void main() { mainImage(outColor, gl_FragCoord.xy); }
`;
const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

interface Entry {
  readonly target: HTMLCanvasElement;
  readonly program: WebGLProgram;
  readonly uTime: WebGLUniformLocation | null;
  readonly uRes: WebGLUniformLocation | null;
}

let gl: WebGL2RenderingContext | null = null;
let source: HTMLCanvasElement | null = null;
let vao: WebGLVertexArrayObject | null = null;
let vert: WebGLShader | null = null;
let failed = false;

const entries = new Map<number, Entry>();
let nextId = 1;
let raf = 0;
let lastDraw = 0;
const started = performance.now();

function boot(): boolean {
  if (failed) return false;
  if (gl !== null) return true;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  // Without this the buffer may be gone by the time drawImage reads it.
  const ctx = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
  });
  if (ctx === null) {
    failed = true;
    return false;
  }

  const vs = ctx.createShader(ctx.VERTEX_SHADER);
  if (vs === null) {
    failed = true;
    return false;
  }
  ctx.shaderSource(vs, VERT);
  ctx.compileShader(vs);
  if (ctx.getShaderParameter(vs, ctx.COMPILE_STATUS) !== true) {
    failed = true;
    return false;
  }

  source = canvas;
  vao = ctx.createVertexArray();
  vert = vs;
  gl = ctx;
  return true;
}

function draw(now: number): void {
  raf = requestAnimationFrame(draw);
  if (gl === null || source === null) return;
  if (now - lastDraw < 1000 / FPS) return;
  lastDraw = now;

  const t = ((now - started) / 1000) % LOOP_SECONDS;

  for (const entry of entries.values()) {
    // Skip anything scrolled out of view; the grid is taller than a screen.
    const box = entry.target.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) continue;

    gl.bindVertexArray(vao);
    gl.viewport(0, 0, SIZE, SIZE);
    gl.useProgram(entry.program);
    if (entry.uTime !== null) gl.uniform1f(entry.uTime, t);
    if (entry.uRes !== null) gl.uniform3f(entry.uRes, SIZE, SIZE, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const out = entry.target.getContext("2d");
    if (out !== null) out.drawImage(source, 0, 0, SIZE, SIZE);
  }
}

function ensureLoop(): void {
  if (raf === 0 && entries.size > 0) raf = requestAnimationFrame(draw);
  if (raf !== 0 && entries.size === 0) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

/**
 * Compiles `glsl` and starts drawing it into `target`. Returns a release
 * function, or null when the shader will not run, which is the caller's signal
 * to keep showing the captured PNGs.
 */
export function addTile(target: HTMLCanvasElement, glsl: string): (() => void) | null {
  if (!boot() || gl === null || vert === null) return null;

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (fs === null) return null;
  gl.shaderSource(fs, WRAPPER_HEAD + glsl + WRAPPER_TAIL);
  gl.compileShader(fs);
  if (gl.getShaderParameter(fs, gl.COMPILE_STATUS) !== true) {
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(fs);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    gl.deleteProgram(program);
    return null;
  }

  target.width = SIZE;
  target.height = SIZE;

  const id = nextId++;
  entries.set(id, {
    target,
    program,
    uTime: gl.getUniformLocation(program, "iTime"),
    uRes: gl.getUniformLocation(program, "iResolution"),
  });
  ensureLoop();

  return () => {
    const entry = entries.get(id);
    if (entry !== undefined) {
      gl?.deleteProgram(entry.program);
      entries.delete(id);
    }
    ensureLoop();
  };
}
