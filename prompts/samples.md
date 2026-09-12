# Samples

Owner: Pavle.

**Samples are the side of the product, not the middle of it.** The main flow is a
visitor typing their own prompt and watching a run happen. Samples are four
finished runs kept in Convex so that something real is on screen before anyone
types anything, and so the page still shows the product when no orchestrator is
reachable.

## The four

| Prompt | One-shot | Full run |
|---|---|---|
| a candle flame flickering in the dark | 1 of 6 | round 1 best 20 / mean 9.3, round 3 best 25 / mean 18.5 |
| a black hole with a glowing accretion disk | not tested | running |
| a single eye slowly blinking | not tested | running |
| a flower blooming, petals opening | not tested | running |

The three new ones skip the one-shot count. That test exists to decide whether a
prompt discriminates, which mattered when we were choosing what to demo. These
were chosen for the gallery, so what matters is whether the finished run looks
good, and the run itself answers that.

All four obey the rule below, and all three new ones are from its riskiest tier:
they may come back with round 1 already decent, or stuck near zero. Either is
usable in a gallery; neither would have been usable as the single demo prompt.

## The rule

**Pick prompts whose subject the model must invent the shape of.**

Ten prompts were tested one-shot across `001` and `002`. Everything assembled
from primitives passed first try: a ball is a signed-distance circle, a pendulum
a circle on a line, a clock lines rotating about a point, snow dots falling. The
model has those and combines them correctly without help.

The candle is the only tested prompt with no primitive behind it. There is no
`flame()`, so the silhouette has to be invented, and one-shot invents it badly.

Two properties predicted to make a prompt hard did not: snow accumulates and
passes, the clock keeps three rates and passes. **Statelessness and timing are
not the difficulty. The invented shape is.**

A sample also has to be verifiable in a second by someone who knows nothing about
graphics, or the improvement is unreadable on video, and it has to be reachable
in three to five rounds. A prompt stuck at zero of six is as bad a demo as one
that starts correct.

## Untested candidates, by the rule

**Safest, same family as the candle:** a campfire with burning logs · smoke
rising from a cigarette · a match striking and igniting.

**Dramatic, moderate risk:** a lightning bolt striking a dark landscape · a wave
breaking on a beach · lava flowing down a dark slope · frost crystals spreading
across a window.

**Biggest reaction, may come back at zero of six:** a black hole with a glowing
accretion disk · a single eye slowly blinking · a flower blooming, petals opening
· a jellyfish pulsing in deep water.

**Avoid:** butterfly wings, a spider spinning a web, a school of fish. They obey
the rule but are likely to sit at zero with nothing to climb from.

## Rejected, and why

| Prompt | One-shot | Reason |
|---|---|---|
| a red ball bouncing on a white floor | 5 of 6 | Signed-distance circle on a line |
| an analog clock with a sweeping second hand | most | Lines rotating about a point |
| snow falling and settling into a pile | most | Dots falling; accumulation faked convincingly |
| a pendulum swinging back and forth | most | Circle on a line |
| lava lamp, plasma, plain gradients | not run | Classic beginner exercises, thousands on Shadertoy |
| ink in water, rain on a window, molten metal, jellyfish | rendered in `001`, never judged | Obey the rule, but atmospheric subjects are a judgment call even for a person, which is slow to score and unconvincing on video |

`demo-candidates.md` predicted the ball would hover, drift or fall through the
floor. It did none of those, and demoing it would have shown a round 1 that
already looked correct. Recorded so the guess is not repeated.
