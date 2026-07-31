# Feel Scoreboard

Running log of the Fun Tune-Up Protocol (`docs/fun-tuneup-protocol.md`). One row per slice.
Tier-1/Tier-2 numbers are measured headlessly; the Tier-3 rubric (0–24) and red flags come
from the owner's one honest run. **Adding content while the rubric drops ⇒ ship a feel pass first.**

## How to fill a row
- **Tier-1/2 (automated, run before merge):**
  - `node tools/simulate.js` — balance + build-reach (build-invariance / build-cadence)
  - `node tools/coupling-audit.js` — phantom-coupling (does the ledger write back to the fight?)
  - `node tools/feel-probe.js` — drives the real game headlessly, measures impact-per-kill
- **Tier-3 (human):** play exactly one honest run, answer the 10 in-game feel-check questions,
  score the 8-dimension rubric, record the share code + rubric total + notable 🚩s.

## Entries

### playtest slice · 2026-07-29 · "feel pass 2" — Tier-3 rubric PENDING owner run
Baseline before this slice: combat-juice pass had already closed the contact layer (hit/kill/
block/armored/player-hit all fire spark+floater+hitstop+shake+knockback+burst+sfx).

Changes shipped (all headlessly verified; balance gate still "No pathologies"):
- **Rewards on the canvas** (root cause #2 remnant): room-clear `+N STABILITY`, boss `WINDOW OPEN`,
  and player-hit `-N` now surface as on-arena floaters, not just the side log.
- **Build reaches the hands** (root cause #1): Containerization `speed −20`, Rollback `dashCooldown −0.10`,
  Compat-Shim `dashCooldown +0.08` — opposite builds now diverge in movement/dodge, not just DPS.
- **Less transition dead-air** (root cause #3): `ROOM_INTRO_SECONDS` 1.35 → 0.9 (was the only >1.0s hard lock).
- **Comprehension:** build identity now shown mid-run in the HUD (was post-mortem only).
- **Tooling built:** `tools/coupling-audit.js`, `tools/feel-probe.js`, simulate.js build-reach checks,
  and the `DepHell.debug.feel()` ring buffer + scripted-input channel that power them.
- **Experimental knobs (default = current behavior, opt-in):** `DepHell.debug.tune({...})` for
  `clearHealTaper`, `swingCommit`, `introSkipOnInput`; `DepHell.audio.tune({...})` for ambience pitch.

Automated readings this slice:
- Build reach: speed divergence 20 px/s, dashCooldown 0.18 s, effective-DPS swing 85%, 6/12 build-affecting picks.
- Phantom couplings remaining (advisory): `approvals`, `debtTags`, `resolvedIncidents`, `bossMutations`,
  `processDecisions`, `revealedClues`. Highest-leverage next fix: give `bossMutations` a combat reader.
- Feel probe: kill fired 4/4 feedback channels; landed hits ≥3 channels.

### PT1 playtest · 2026-07-30 · owner run, died mid-run (rooms 3–5, boss not reached)
Feel-check code: `DHFEEL-PT1-YNNNUNNNNN` → **6 flags, 1 unsure, 3 clean.**
- Clean (wins that landed): Q1 kill reads on screen; Q3 not hold-to-win; **Q6 no post-clear dead-air** (transition work paid off).
- Flags cluster A — legibility at the point of action: Q2 (hit doesn't read without sound), Q4 (can't name how the build changed the fight), Q7 (can't name what hurt you).
- Flags cluster B — no arc/stakes: Q10 (never tensed — the headline), Q9 (no restart pull), Q8 (boss — but not reached, so uninformed). Q5 unsure (room 4 borderline).
- **Read:** the mechanical juice landed; the RUN is flat — it coasts at full Stability then dies to a backloaded spike. Root cause #3 (tension gradient) confirmed by a human.

### feel pass 3 · 2026-07-30 · response to PT1 (owner chose: tension gradient + build expression)
- **Tension gradient (Q10/Q9):** `clearHealTaper` now ON by default — late rooms stop fully refunding combat damage (`max(3, 8−roomIndex)`), so Stability trends down and pressure mounts. New **critical-Stability state** below 30: a red screen-edge vignette that breathes faster/brighter toward zero + a one-shot alarm cue + the ambience tempo races — the missing "lean forward" moment. (Verified in-browser: vignette renders at STB 20, no errors.)
- **Build expression (Q4):** the intro banner now shows a **LOADOUT line** describing how the build changes the fight in felt terms (`hits harder (14) · quicker dash` …), re-read each room right before combat. (Loadout text unit-tested across builds.)
- Deferred (boss not reached this run): `bossMutations` combat reader (Q8), hit-legibility (Q2), damage-source clarity (Q7) — queued for the next flagged run.

| slice | date | rubric /24 | notable 🚩 | feel-check code |
|---|---|---|---|---|
| feel pass 2 | 2026-07-29 | _superseded_ | _pending_ | _pending_ |
| PT1 owner run | 2026-07-30 | 6/10 flagged | Q2,Q4,Q7,Q8,Q9,Q10 | DHFEEL-PT1-YNNNUNNNNN |
| feel pass 3 | 2026-07-30 | _pending next run_ | targets Q4,Q9,Q10 | _pending_ |
