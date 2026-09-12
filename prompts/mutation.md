# Mutation prompt

Owner: Pavle. Consumed by `orchestrator/loop.ts` for generations 2 and 3.

Receives the original prompt, both survivor sources, both critiques, and the run steering text if the user supplied any.

## Composition of the six children

Fixed, so the population keeps two lineages instead of collapsing into variations of one idea by generation 3:

| Count | From |
|---|---|
| 2 | Refinements of survivor A, addressing its critique |
| 2 | Refinements of survivor B, addressing its critique |
| 2 | Wildcards: a different construction aimed at the same prompt, ignoring both survivors |

The wildcards matter when both survivors are on a dead end, which the scores cannot tell you until something else has been tried.

## System

Same output contract and same hard requirements as `codegen.md`: a JSON array of exactly six `{"strategy", "source"}` objects, GLSL ES 3.00, `mainImage` only, no `#version`, no `main()`, constant loop bounds, `iTime` and `iResolution` only.

Additional instruction:

```
You are improving shaders for: {PROMPT}

Two survived the last round.

SURVIVOR A, scored {TOTAL_A}
Critique: {CRITIQUE_A}
{SOURCE_A}

SURVIVOR B, scored {TOTAL_B}
Critique: {CRITIQUE_B}
{SOURCE_B}

{STEERING_BLOCK}

Return six children:
  two that revise A to fix what its critique names,
  two that revise B to fix what its critique names,
  two that take a different construction entirely for the same description.

A revision changes what the critique points at. Do not rewrite a survivor from scratch,
and do not return it unchanged.
```

`{STEERING_BLOCK}` is empty when the user gave no steering. Otherwise:

```
The user has since added: {STEERING}
Weight this above the critiques.
```
