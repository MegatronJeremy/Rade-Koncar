# Primer — shaders, WebGL and the stack, from zero

Written for Pavle and Djordje, who do backend and web, and for anyone joining cold. Vuk can skip to "The partner stack". Ten minutes, and everything else in `docs/` assumes it.

---

## 1. What a fragment shader actually is

A **fragment shader** is a small program that computes **the colour of one pixel**.

It runs once per pixel, per frame. For a 256×256 image that is 65,536 runs per frame — all in parallel, which is what GPUs are for.

Each run gets two useful inputs:

- **which pixel it is** — an (x, y) coordinate
- **what time it is** — seconds since the animation started

and produces one output: **a colour**, as red/green/blue/alpha, each a number from 0.0 to 1.0.

That is the whole model. No canvas to draw on, no shapes, no loops over the image, no memory of what any other pixel decided. Just: *given this position and this moment, what colour?*

This makes shaders strange to write and interesting to generate. You cannot say "draw a circle here". You have to say "this pixel is white if its distance from the centre is under 0.3, otherwise black" — and a circle appears, because every pixel independently worked out whether it was inside one.

Animation works the same way. There is no frame loop. You render the same program again with a larger time value, and every pixel recomputes itself.

**The consequence that matters for us:** a shader is a *procedural description* of an image. It is typically 1–3 KB of text that produces an image at any resolution, forever. It is code, not pixels. This is the answer to "isn't this just image generation?" — it isn't, and you can prove it on camera by editing a number and resizing the window.

## 2. GLSL, and the exact dialect we use

Shaders are written in **GLSL** — C-like, with built-in vector types.

```glsl
float x = 0.5;              // one number
vec2  p = vec2(0.5, 0.25);  // two — often a coordinate
vec3  c = vec3(1.0, 0.0, 0.0);  // three — often a colour, here red
vec4  o = vec4(c, 1.0);     // four — colour plus alpha
```

We use **GLSL ES 3.00**, the dialect WebGL2 accepts in a browser. That is why our files start with `#version 300 es` and declare `precision highp float;`.

## 3. The Shadertoy convention, and why we adopted it

[Shadertoy.com](https://shadertoy.com) is where the shader community lives — tens of thousands of published shaders. It has a house convention. You write exactly one function:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord)
```

- `fragCoord` — **in**: the pixel's coordinate, (0,0) at bottom-left, up to the canvas size
- `fragColor` — **out**: the colour you assign, RGBA, each 0.0 to 1.0
- `iTime` — a global: seconds since start, as a float. **This is how anything animates**
- `iResolution` — a global: the canvas size in pixels. You divide `fragCoord` by it to get 0..1 coordinates that work at any size

A minimal working shader:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;      // now 0..1 across the screen
    vec3 col = vec3(uv.x, uv.y, abs(sin(iTime)));
    fragColor = vec4(col, 1.0);
}
```

**Why we force this convention on the model:** it has read tens of thousands of Shadertoy shaders during training. Asking for that exact signature rather than arbitrary GLSL raises the rate of code that compiles and works, for free, with no extra prompting effort. It also means anything we produce pastes straight into Shadertoy, which is a real distribution story.

Our harness supplies everything around `mainImage` — the `#version` line, the uniform declarations, the `main()` entry point. **The model writes only the `mainImage` function and its helpers.** That is contract 1 in `01-contracts.md`.

## 4. Why AI is bad at this — the entire premise

A shader can be **completely wrong and completely valid**. Some ways that happens:

| Failure | What you see | Why the compiler is fine with it |
|---|---|---|
| Division by zero somewhere | Pure black | NaN is a legal float |
| Values scaled wrong | One flat colour | `vec3(50.0)` clamps to white; `vec3(-3.0)` clamps to black |
| Never uses `iTime` | A still image | Nothing requires you to use a variable |
| Maths is right, look is wrong | A grey smear that is not ink in water | Nothing defines "looks like ink" |

**"Renders pure black" is the single most common failure, and in a text-only pipeline it is indistinguishable from success.** The compiler says nothing is wrong. There are no tests to fail. The model gets no signal at all.

Every existing AI shader tool works around this by making a human look at the output. We put a vision model there instead. That is the product.

## 5. What "rendering in a sandbox" means, in plain terms

To find out what a shader draws, you have to actually run it.

1. Put the shader in a **web page** with a `<canvas>` element and a WebGL2 context.
2. Run that page in **headless Chromium** — a real Chrome browser with no visible window, driven from a script by **Playwright**.
3. Set the time to a specific value, draw once, and read the canvas pixels back out as a PNG.
4. Do that three times — at t = 0s, 1s, 2s.

**Why three frames and not one:** a static shader and an animated one look identical in a single screenshot. Comparing t=0 against t=2 tells us whether anything moves. We use that difference to score motion *arithmetically*, without asking the model.

**Why no GPU:** cloud sandboxes don't have graphics cards. So Chromium falls back to **SwiftShader**, a software implementation of the GPU API that runs on the CPU. Slower, same output. This is the only reason those Chromium flags in `02-harness-vuk.md` exist, and getting them wrong produces a blank image that looks exactly like a broken shader.

**Why a sandbox at all, rather than just doing it on a server:** two reasons, and the second is the one we demo.

1. Six candidates render simultaneously in six sandboxes instead of one after another.
2. **A shader with an unbounded loop hangs the machine rendering it.** It is not a catchable exception — the renderer thread simply stops. Model-written code does this regularly. In a disposable sandbox it hits a timeout and dies alone; on your laptop it takes the browser with it.

## 6. Vocabulary used throughout these docs

| Term | Meaning |
|---|---|
| **Run** | One user prompt and everything that follows from it |
| **Generation** | One round of six candidates. We do three per run |
| **Candidate** | One shader the model wrote — a `strategy` label plus GLSL `source` |
| **Strategy** | A short label for the approach, e.g. `"fbm threshold"`, `"raymarched sdf"`. Lets us see whether the six are actually different from each other |
| **Survivor** | The two highest-scoring candidates in a generation. They become the parents of the next |
| **Mutation** | Asking the model for six new candidates given the survivors, their sources, and their critiques |
| **Prefilter** | Cheap arithmetic checks on the pixels before spending a vision call — is it flat, does it move |
| **Flat** | The image is one near-uniform colour. Usually black. Scores zero, skips the vision call entirely |
| **One-shot** | Generation 1 — what you would have got from the model without any of this. Our control group |
| **Steering** | Optional extra text from the user mid-run, folded into the mutation prompt |
| **Reference mode** | Instead of text only, the user supplies (or Fal generates) a target image, and colour similarity to it feeds the score. Stretch feature |

## 7. The partner stack

Hackathon sponsors. Using them well is part of what is being judged, and one of them carries its own prize.

| Tool | What it is | What we use it for |
|---|---|---|
| **x.ai (Grok)** | LLM API, **OpenAI-compatible** — same request shape, different base URL and key | Writing the shaders, and the vision call that scores the screenshots |
| **Daytona** | Cloud sandboxes that boot in milliseconds from a prebuilt image | Running six untrusted, possibly-hanging shaders in parallel isolation. **Has its own prize** |
| **Convex** | Hosted TypeScript backend — database, file storage, and live subscriptions | All state. The UI subscribes and updates itself; no websockets to write |
| **Render** | Deploys from a GitHub repo | The public URL, which is a hard requirement. Two services: the static web app and the orchestrator |
| **Fal.ai** | Image/video/audio model API | Reference mode only — generating a target image. Stretch |

A note on Convex, since Djordje will meet it first: you define a schema and write query and mutation functions in TypeScript. The React client subscribes to a query, and **when the data changes the component re-renders by itself**. There is no polling and no socket code. That is why the evolving grid is nearly free for us.

## 8. How to judge a shader by eye

Needed for the 12:15 thesis test, where someone has to count how many one-shot attempts are "acceptable". Use these three criteria, in order:

1. **Is it not blank?** Not pure black, not one flat colour, not white noise. This eliminates most first attempts.
2. **Does it move?** Compare the first and last frame. A still image fails.
3. **Would you recognise the prompt from the picture?** Not "is it beautiful" — would a stranger shown this image and the words *"rain on a night window"* agree they match?

All three yes = acceptable. Anything else = not. Be strict; a generous count here makes our own product look unnecessary.
