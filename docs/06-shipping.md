# Shipping — video, submission, judge answers

Owned by Pavle until 17:00, then everyone.

Judging happens **after** the event, offline. The panel will mostly watch the video and click the link. For judging purposes the video *is* the product — budget real time for it.

## Hard requirements — no prize without these

| # | Requirement | Owner | Done when |
|---|---|---|---|
| 1 | Team of 1–3 | — | We are 3 |
| 2 | **Public repo**, open source | Djordje | Public, README with problem, stack, run steps |
| 3 | **Deployed live URL**, not localhost | Djordje | Opens cold on a phone, in an incognito window |
| 4 | **Video demo**, ~3 min | Pavle | Uploaded, plays without login |
| 5 | Only work built today is judged | all | README says what is new |
| 6 | **Form submitted by 19:00** | Pavle | Confirmation seen. Submit a draft at 18:00 and update it |

## The recording — 17:00, two takes

Screen-record the browser at 1080p. Do not film the room.

| Time | Beat |
|---|---|
| 0:00–0:20 | The problem, concretely. A shader that compiles cleanly and renders pure black is, to every existing tool, a success |
| 0:20–0:35 | What we built, one sentence: we generate programs that draw pictures, and we let the model see what its program drew |
| 0:35–2:20 | **The happy path on the real URL.** Prompt in. Grid evolving. **One-shot column against the final generation.** Click a compile-error tile. **Click the timed-out tile — one shader hung, its sandbox was killed, the other five kept rendering.** Click the winner, change one constant live, resize the window, export |
| 2:20–2:45 | Architecture in one diagram, 15 seconds |
| 2:45–3:00 | What it becomes beyond today |

Non-negotiables, learned the hard way at the FinTech hackathon:

- **Show the actual system.** Statistics are not enough. If we show nothing, it looks like we have no product.
- Lead with the core, never with a side tool built at the end.
- Rehearse the English out loud at least twice before recording.
- If the judges have no question afterwards, we failed. Leave one deliberate hook.

The timed-out tile is the strongest fifteen seconds in the video for the Daytona prize. Do not let it get cut for time.

## Submission checklist — 18:00

- [ ] Repo public, all three as collaborators
- [ ] README: problem, what it does, stack, what was built today, run instructions
- [ ] Live URL loads cold in an incognito window
- [ ] **Pinned run showing** — the grid works with the orchestrator down
- [ ] Video uploaded, link plays without login
- [ ] Form submitted with team names, repo, live URL, video
- [ ] Resubmit after any late change

## Three answers to have ready

**Why Daytona?** Each candidate runs in its own browser process with a hard timeout, so one hung or OOMing shader cannot take down its siblings, and six render in parallel. Then point at the timed-out tile.

**Wouldn't the model do this one-shot?** Point at the left column. That is one-shot. The right column is three generations later. This is why the one-shot column is never cut.

**Isn't this just image generation?** It's code, not pixels. Edit a constant on camera, resize the window, export two kilobytes that run at any resolution forever.

## Prize map

| Prize | Sponsor | Value |
|---|---|---|
| Overall 1st / 2nd / 3rd | Convex | 80k / 50k / 20k RSD |
| **Best app using Daytona** | Daytona | **$3,000 / $2,000 / $1,000 credits** |
| Community vote 1st/2nd/3rd | Kosmonaut | 15 / 10 / 5 coworking entries |
| ABC Silicon Valley 2027 | ABC | 50% / 40% / 30% tuition |
| Participation | Daytona | $100 credits each |

The Daytona bounty is a separate, narrower pool. Most teams will never boot a sandbox. The timed-out tile in the video is how we claim it.

Judging criteria, in scoring order: **Innovation (primary)**, working product, problem and solution clarity, execution, impact potential.
