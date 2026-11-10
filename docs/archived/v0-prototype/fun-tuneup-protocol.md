# Fun Tune-Up Protocol

_The back-pocket process to run after every slice — the thing that catches "reads great, feels flat" before it ships._

**Created 2026-07-28.** Derived from a code-grounded engagement audit of the current build (7 diagnostic lenses → 40 findings → 39 verified, 34 rated decisive/significant → 3 root causes). Every check below is calibrated to a real failure mode found in this codebase, so the protocol is not generic game-design advice — it is the specific net that *would have caught today's flatness on day one.*

## Why this exists

We already automate two of the three things that make a slice good:

| Quality | Tool | Status |
|---|---|---|
| Content **correctness/coherence** | `tools/lint-content.js` | ✅ automated |
| **Balance** | `tools/simulate.js` | ✅ automated |
| **Felt engagement / fun** | *(this protocol)* | ⬅️ the gap |

A slice can pass the linter and the simulator and still be no fun, because fun lives in game-feel, reward cadence, tension, and whether the strategy layer expresses itself in your hands — none of which those tools measure. This protocol closes that gap, and it is designed to work even for a self-described "poor gameplay tester": most red flags are converted to *measured signals*, leaving only a small, honest set of subjective questions for a single human run.

## The three root causes it guards against

Every check traces to one of these. If a future slice regresses, it will almost always be one of these three re-opening:

1. **The ledger never writes back to the fight.** Player combat power is four scalars (`fireRate, damage, speed, dashCooldown`, `run-state.js:11`); only `damage`/`fireRate` are ever touched, `speed`/`dashCooldown` by nothing. The dependency graph / debt / risk / observability the game is *named after* feed only menu rolls, one-shot boss selection, and the end report. Causal arrow is combat → ledger → menus, essentially never ledger → combat. **Divergent builds pilot identically.**
2. **There is no on-canvas "moment" layer.** Impact, kills, systemic consequences, narrative beats, and rewards are all expressed as text in the off-canvas side log or not at all. The one working hitstop primitive (`hitFreezeTimer`) fires only when the *player is hurt* (`game.js:1333`), never when you land a hit or a kill; there is no screenshake, no particles, no floating text, no camera. Force and consequence have no channel where the player is looking.
3. **The core loop has no tension gradient.** Combat is tradeoff-free hold-to-win (full-speed movement during a 92px/~100° auto-aimed cone at 88% uptime); `+8` auto-heal per room sawtooths stability back to the ceiling; difficulty and incidents are backloaded to the final 1–2 rooms; ~2.5s of frozen dead air sits on every transition.

> **The one highest-leverage fix** (do this first, it's nearly free): reroute impact feedback from the defensive path to the offensive path. Reuse the existing `hitFreezeTimer` freeze-frame on every landed hit (longer on a kill), add one trauma/shake scalar wrapped around `draw()`, and on the hit branch (`game.js:822-835`) add a white hit-flash + small knockback + recolor the spark to bright white + a death burst. This touches the most repeated action in the game (~6 swings/sec) and creates the shake/particle/floating-text scaffolding that later carries damage numbers, reward pops, and the systemic/narrative callouts currently trapped in the side log.

## How to run it — three tiers

Run as the **exit gate of every vertical slice, before merge.**

### Tier 1 — every commit (headless, seconds, blocks merge)
Deterministic checks extending the existing tooling. A regression fails the build.
- Extend `tools/simulate.js` with **build-cadence** and **build-invariance** checks (below).
- Add `tools/coupling-audit.js` for the **phantom-coupling** scan.

### Tier 2 — pre-merge (~2 min, Playwright pinned to 1.61.1 per machine memory)
A live feel-telemetry bot drives the real `game.js` and reads a new `namespace.debug.feel()` hook. Decisive-tier metrics (impact-per-kill, dead-air, hold-to-win) **block merge**; the rest warn.

### Tier 3 — once per slice (human, ~3 min)
The owner plays **exactly one honest run**, answers the 10 yes/no questions, and scores the 8-dimension rubric (0–24). Log the score to a running `docs/feel-scoreboard.md`. **A slice that adds content but drops the rubric score is flagged for a feel pass before the next slice starts.**

---

## Tier 1 + 2 — Automatable checks

Each measures a felt-experience proxy. Thresholds are set so the *current* build fails them (proving they bite).

| Check | Measures | Threshold (fail) |
|---|---|---|
| **Impact-events-per-kill** | Tactile crunch at contact | Any kill firing < 2 of {hitstop, shake, particle burst, floater}; any landed hit < 1. `blocked` must read differently from a whiff. |
| **Dead-air fraction** | Momentum lost to frozen lockouts | `suppressed/total > 5%` over a run, OR any single non-overlay transition locks input > 1.0s. |
| **Build-cadence** | Power-affecting rewards per run | Build-affecting choices < 3, OR zero combat-stat changes after room 3. |
| **Build-invariance** | Whether the build reaches your hands | `speed` or `dashCooldown` divergence == 0 across all build pairs, OR effective-DPS swing between opposite builds < 15%. |
| **Phantom-coupling audit** | Whether strategy writes back to combat | Any run-state field / tag / bossMutation with **0 readers in the combat call graph** (reachable from `update()`, excluding report render). |
| **Tension time-series** | The stability gradient | Stability never drops below 60 before the boss, OR > 30% of clear-heals capped (no-op), OR per-room pressure not monotonically rising. |
| **Hold-to-win / face-tank probe** | Skill floor & spacing | A zero-movement "hold attack" bot clears any non-boss room, OR aim-mutation win-rate delta < 5% ("aim is non-load-bearing"). |

**Enabling hook (build once):** add a `game.feelLog=[]` ring buffer and expose `namespace.debug.feel()` beside the existing read-only `debug.state()` (`game.js:2483`). Push `{t, kind, hitFreezeAfter, shakeAfter, knockbackApplied, particles, floater}` at the hit/kill branch (`game.js:822-835`) and in `damagePlayer` (`1327-1339`). This single hook powers most Tier-2 metrics and the AI proxy tester below.

---

## Tier 3 — The one-run self-playtest (yes/no)

Engineered so an honest answer surfaces a feel problem even from someone who can't articulate fun. Play **one** run, answer immediately after.

1. When you killed an enemy, did the **screen** do anything — jolt, flash, throw debris — or did it just blink out? · 🚩 _"just blinked out / couldn't tell a kill from a hit."_
2. Turn **sound off** for one fight: could you still tell the exact frame your blade connected vs swiped air? · 🚩 _"no, they look the same."_
3. Did you **win any room standing still**, holding attack, never repositioning? · 🚩 _"yes, mostly stood and held it."_
4. Without the log: name the package you installed, and one way it changed how the **fight** felt. · 🚩 _names it but "the fighting felt the same."_
5. In the **second half** of the run (after ~room 4), was there any new power/item to chase? · 🚩 _"no, I'd already made my one choice."_
6. Right after clearing a room, was there a stretch where you **couldn't move or attack**? · 🚩 _"yes, every time it locked me out."_
7. The last thing that damaged you — name it and what it did, **without the log.** · 🚩 _"no idea, stability just dropped."_
8. Did the **boss** feel like a different kind of challenge, or the same hold-swing-plus-waiting? · 🚩 _"same thing, just waiting out its armor."_
9. At the postmortem: did you actually **want** to hit restart, with a specific thing to try next? · 🚩 _"not really / nothing new to try."_
10. At **any** single moment, did you lean forward or tense up? · 🚩 _"no, it stayed level the whole time."_ (A body reaction is honest even when words fail.)

## Tier 3 — Feel rubric (score each 0–3, sum = 0–24)

1. **Contact & crunch** — does a landed hit and especially a *kill* produce felt feedback (hitstop, shake, flash, knockback, burst)?
2. **Threat pressure & tension gradient** — does danger visibly rise and force reaction, or stay pinned near the ceiling until a boss cliff?
3. **Decision & reward density** — meaningful build-affecting choices/power rewards per minute; does the back half still offer something to chase?
4. **Build expression in-hand** — does the assembled architecture change how you hit/dodge/move?
5. **Flow continuity** — proportion in active play vs frozen banners/lockouts/modals (target < 5% suppressed).
6. **Feedback at the point of action** — are numbers/rewards/consequences shown *on the canvas*, not exiled to the side log and end report?
7. **Skill ceiling of the core verb** — does swinging reward aim/timing/spacing/priority beyond holding a button?
8. **One-more-run pull** — at the end, is there a concrete forward hook that makes restart feel like progress?

Log `slice · rubric-total · notable red flags` to `docs/feel-scoreboard.md` each slice so the trend is visible. **Adding content while the score drops = ship a feel pass first.**

## The AI as your proxy feel-tester

Because the owner self-identifies as a poor tester, an AI agent driving the real game through Playwright + the `namespace.debug` hooks becomes the *consistent* proxy that runs the identical scripted slice every build and reports **deltas a human playing once would never notice**. It converts most subjective questions into measured signals:

- "did the screen jolt on a kill?" → impact-events-per-kill from `debug.feel()`
- "did you win standing still?" → the zero-movement hold-to-win bot
- "was there dead air?" → the `suppressed/total` ratio
- "did the build reach your hands?" → action-vector divergence

It runs deterministically, never gets bored or acclimates, and catches **feel regressions** (a metric silently dropping after an unrelated change). Its honest limit: it can only tell whether the feel channels *fire, escalate, and diverge* — not whether a fight is *fun*. So it front-loads all the measurable red flags and hands the owner a much smaller, pre-filtered set of genuinely subjective questions for their single human run.

**To make the AI a fuller proxy,** extend `debug` beyond the read-only `state()` snapshot with the `feelLog` ring buffer and a **scripted-input channel** so the agent can commit to attacks, dash, and target-select rather than only observe.

---

### A note not covered by the lenses (worth a future pass)
**Comprehension precedes caring.** The audit assumed a player who already understands the systems and asked whether they *feel* them — but nothing in the game ever *teaches* that debt→incident and graph→boss are causally linked. There's no tutorialization, no first-time callouts, and `buildIdentity()` (which names what kind of build you're becoming) is only ever rendered *post-death*. Surfacing build identity mid-run and teaching the causal links in-world is a precondition for the payoff landing at all. (Related: check whether `audio.js`'s "adaptive ambience" actually escalates with run stakes the way Hades/DOOM do — the audit only looked at one-shot combat SFX.)
