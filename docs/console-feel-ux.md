# Console-Feel UX Spec

_How to make Dependency Hell feel "PlayStation-y" — touched by Naughty Dog / Square Enix — while keeping the terminal / dev-satire soul. And, more usefully: how to **ask** for that and reliably get it._

**Created 2026-07-28.** Derived from a code-grounded UI study (focus/selection, motion, sensory/restraint/diegesis lenses + a webbish-tell audit + a controller-first carousel design). This is a **rubric**, meant to be run against any new UI the way `tools/lint-content.js` runs against content.

## The core idea: ask for rules, not vibes

"More PlayStation-y" is unfalsifiable — a designer (or an AI) can't tell when it's done, and you can't tell whether they hit it. The fix is to hand over **checkable rules** and **named exemplars** instead of an adjective. Every rule below is written as a **screenshot test** ("a stranger points to the current choice in under a second") or a **grep test** ("every overlay has a `transition:`"), so the request resolves to a diff you can verify.

**The request template that works:**
> "Make the package screen pass **FOCUS-SINGULARITY**, **HERO+PEEK**, and **NO-HARD-CUTS**; use the motion tokens; keep the five-cue audio vocabulary. Reference: the **FF7R cursor-row**, the **PS5 home-rail peek**, the **TLOU2 △-to-examine** verb, the **God of War L1/R1 tab-step**. Express focus as a brighter phosphor card + blinking block caret, not a glossy 3D tile; the tick is a terminal keystroke, not a console bloop."

Name the exemplar every time — "the God of War L1/R1 tab-step" is a spec someone can pull up and match; "Naughty-Dog-ish" is not. Then always append the **translation clause** ("…rendered in terminal ink") so the console *state machine* arrives wearing the indie *skin*.

> **The through-line:** ask for the **STATE MACHINE and MOTION CONTRACT of a console, rendered in terminal ink.** The console-ness lives in the rules; the indie-ness lives in the skin.

## Motion token table

Hand these over instead of "make it juicy." Nothing the player waits on exceeds **350ms**; leaving is always faster than arriving; everything is gated behind `prefers-reduced-motion`.

| Token | Duration | Curve | Use |
|---|---|---|---|
| reveal (enter) | 220–320ms | easeOutQuint `cubic-bezier(.22,1,.36,1)` | overlay/panel appears |
| dismiss (exit) | 140–180ms | ease-in | overlay/panel leaves |
| focus-change | 120–160ms | ease-out | cursor lands on a new item |
| confirm-punch | 90–130ms | easeOutBack, 1.0→1.08→1.0 | commit only |
| idle-breathe | 2.4–3.6s | ease-in-out, ≤3% amp | the one hero element |
| stagger step | 40ms × index | — | list/card reveal cascade |

## The verb contract (never moves between screens)

| Button | Verb | Notes |
|---|---|---|
| ✕ Cross | **INSTALL / KEEP / SELECT** | Sony's global confirm default |
| △ Triangle | **READ / INSPECT** | Naughty Dog examine verb |
| ○ Circle | **SKIP / DISCARD / BACK** | PS cancel convention |
| L1 / R1 · stick · D-pad | **CYCLE** the hero | God of War / Horizon tab-step |
| □ (hold) · L2/R2 (hold) | **COMPARE / PEEK** the graph diff | Destiny/Returnal lean-in |
| Options | **Graph inspector** (system view) | replaces the `G` key |

Keyboard mirror: ←/→ cycle · Enter/Space install · Esc/Backspace discard · I/↑ inspect · G graph.

## The rubric — 23 rules

Run these against any UI screen. Each has a test; the ones the **current build fails today** are marked ⚠️.

### Focus & selection (the biggest web-vs-console tell)
1. **FOCUS-SINGULARITY** — exactly one element carries the strongest emphasis at any frozen frame. _Test: a stranger points to the current choice in <1s._ ⚠️ (`.package-card` hover/focus/previewing collapse to one identical amber rule, `game.css:960-965`)
2. **RESTING-SELECTION** — with all input idle, one option is unambiguously selected; moving/removing the mouse never changes which. ⚠️ (selection teleports to last `mouseenter`, `game.js:520`)
3. **DISCRETE-NAVIGATION** — arrows/stick/D-pad each move focus exactly one sibling, re-render the preview, and emit one tick. _Test: unplug the mouse — can you reach every option and commit?_ ⚠️ (arrows are `preventDefault`'d then leak into movement)
4. **UNIFORM-VERB-CONTRACT** — commit/cancel/inspect map to the same buttons on package, route, incident, graph. ⚠️ (package click both inspects and commits; route/incident have no cancel)
5. **SINGLE-SELECTION-VARIABLE** — one authoritative `focusedIndex` per screen; pad MOVES it, hover SETS it, commit always acts on `offered[focusedIndex]`. ⚠️ (commit bound to each card's own click closure)
6. **HERO+PEEK, COUNT-LEGIBLE** — at most one card at full size; the rest smaller/dimmer/clipped but their **count** is readable. _Test: a first-timer sees which is selected AND how many total, without hovering._ ⚠️ (2×2 equal grid — the anchor bug)
7. **LIVE-DIRECTIONAL-AFFORDANCES** — every navigable axis shows a glyph at the edge it moves toward; a dead direction shows none. ⚠️ (no chevrons exist)
8. **RESERVED-FOCUS-COLOR** — one color + one motion means "focus" and nothing else; demote hover to a faint non-accent hint. ⚠️ (amber means focus, hover, AND frame glow at once)

### Motion
9. **NO-HARD-CUTS** — no panel appears/disappears via `display` toggle; enter uses reveal token, exit uses dismiss token. _Test: grep the stylesheet — every overlay has a `transition`._ ⚠️ (**zero** `transition:` in the whole stylesheet; five overlays are `display:none` cuts)
10. **TWEENED-CURSOR** — the focus indicator is one shared node moved by transform, never a class re-applied to a new node.
11. **DIRECTIONAL-CONTINUITY** — push Right → next card enters from the right, current exits left; never cross-fade-in-place. Only the card layer travels; the graph-preview panel stays anchored (parallax, not a lurch).
12. **STAGGERED-REVEAL** — children enter with `transition-delay = index × 40ms`, total < 300ms; cap visible count so a 12-item pool isn't a crawl.
13. **CONFIRM-PUNCH, COMMIT-ONLY** — commit scales 1.0→1.08→1.0 easeOutBack synced to the confirm SFX, then dismiss runs; hover/nav do **not** punch. ⚠️ (`applyPackage` just adds `.hidden`)
14. **ONE-BREATHER** — exactly one element (the hero) breathes; nothing else. _This is where the animated side-rail's motion budget moves._
15. **INTERRUPTIBLE** — no input dropped mid-transition; a new nav re-targets the running tween; animate transform/opacity only.

### Audio & haptics
16. **FIVE-CUE-VOCABULARY** — exactly five UI cues (cursorMove, hover, confirm, back, invalid), same cue for the same class of action on every screen; debounce cursorMove.
17. **DUCK-ON-CONSEQUENCE-ONLY** — confirm/invalid briefly duck the ambient bus (~45% for ~140ms via the existing `duck()`, `audio.js:96`); cursorMove/hover never duck.
18. **HAPTICS-MIRROR-AUDIO** — gamepad path polled; confirm = one soft pulse, invalid = two sharp, back = faint tap; cursorMove/hover get none; no-ops without a pad. ⚠️ (zero gamepad code today)

### Restraint, diegesis, accessibility
19. **NO-TEXTURE-OVER-LIVE-TEXT** — no animated/scanline/chroma layer between viewer and UI text; chroma-shift is event-driven, not ambient. ⚠️ (`.overlay` carries its own scanline gradient over the stage chroma)
20. **DIEGETIC-CHROME** — menu chrome reads as an in-world build-server pane (title bar, `>` prompt, block caret), not a floating web card. Budget: one title bar + one prompt + one cursor — **not** stacked ASCII borders.
21. **GAMEPAD-REACHABLE-CONTENT** — no dialog uses a draggable scrollbar as the only way to reach content; page or auto-scroll to the focused item. ⚠️ (`.choice-frame`/`.graph-details` use `overflow:auto`)
22. **REDUCED-MOTION-GATE** — every animation wrapped in `@media (prefers-reduced-motion: reduce)` → ~1ms + crossfade. ⚠️ (no such query)
23. **SIMPLIFY THE HUD** — only **state changes** glow, not everything at rest; move NEW RUN / SOUND off the combat HUD into an Options/pause menu so the HUD is just the 3 meters.

## CRT verdict — curate, don't preserve or nuke

Treat the CRT as raw material. Keep **one** restrained signature on the stage; remove every texture between the viewer and live UI text.

- **CUT** the vertical `.side-error-rail` (`index.html:10-18`, ~130 lines of CSS). It's `aria-hidden` pure decoration — a fourth perpetually-animated focal point in peripheral vision that conveys zero game state, and its rotated text is unreadable anyway. It's the clearest violation of "fewer focal points." **Delete it and save the effect for another project** (per your steer). Move its motion budget onto the hero card's breathe — the "alive terminal" feeling migrates from the chrome to the focus object. The terminal soul survives entirely in the BUILD LOG panel + the copy; it never depended on this rail.
- **SIMPLIFY (behind text):** delete the `.overlay` scanline gradient (`game.css:615-618`) so hero text is crisp; pause the side-rail + ambient chroma while any overlay is open. Non-negotiable for legibility.
- **SIMPLIFY (stage):** `.scanlines` 0.38 → ~0.13, `.stage::after` chroma 0.68 → ~0.2, or gate both behind a CRT toggle defaulting low. Rule: any CRT effect must survive a legibility test at gameplay scale.
- **REPURPOSE:** make chroma-shift **event-driven** (fire on hit/incident), so it becomes signature juice instead of ambient shader-noise dimming sprites.
- **KEEP:** the vignette (`.stage::before`), the monospace + amber/teal palette, and phosphor glow as the hero-card focus language.

## Indie translation guardrails (so it doesn't drift to generic glossy AAA)

1. **Focus as phosphor, not glass** — brighter ink card + blinking block caret + ASCII bracket corner-ticks `[ ]`; cursor is a sliding `>` gutter marker. If it starts to look like a mobile-game card (gradient sheen, drop shadow, pill buttons), pull back to ink-on-black.
2. **The tick is a keystroke** — cursor-move = dry terminal keystroke; confirm = modem-handshake blip; invalid = descending stack-underflow buzz. Synthesized from the existing `tone()`/`noise()` primitives, not sampled console bloops.
3. **Motion as build-log, not Hollywood** — reveal is a top-to-bottom compile wipe with a cursor blink; the stagger reads as lines printing; discard is a 1-frame chroma-tear. The compile keeps scrolling (blurred, dimmed) behind the decision — that live-behind-glass background *is* the terminal fantasy.
4. **Labels carry the satire, the contract stays fixed** — ✕=`INSTALL`, △=`READ`, ○=`SKIP`; neighbors are "queued stack frames"; the panel is `libglitch-v3 :: upgrade shell`. Dev-satire in the words; console-ness in the fact that the verbs never move.
5. **Diegesis budget = one title bar + one prompt + one cursor.** Don't stack decorative ASCII borders and faux stack traces around the copy. Simplification and soul point the same way.

## Carousel build plan (the anchor case, in this codebase)

Convert the 4-card grid into a controller-first coverflow. Ordered so each step is shippable:

1. **Single source of truth** — add `focusedIndex` + a `setFocus(i)` that everything (keyboard, gamepad, mouse) calls; nothing sets `activePreviewPackage` directly. (`game.js` ~493-541)
2. **Hero + spine markup** — full density only on the hero; neighbors collapse to icon+name+kind; drop the per-card commit closure (click non-hero = promote; click hero = commit). (`game.js` ~502-523)
3. **Coverflow CSS** — delete the `repeat(2, minmax(210px,1fr))` grid; `#packageChoices` position:relative overflow:hidden; cards position:absolute driven by transform; hero gets the reserved `--select` focus look + corner-ticks + lift + caret. (`game.css` 912-965)
4. **Affordances** — count pill `◂ 02 / 04 ▸` + dot-strip + edge chevrons (dimmed at an end — no wrap). (`index.html` 126-146)
5. **Route keyboard through the overlay** before it reaches movement. (`game.js` 2409-2448)
6. **Gamepad poll** — net-new; `navigator.getGamepads()`, edge-detect D-pad/stick/L1/R1/face buttons; no-op without a pad. (`game.js` frame loop)
7. **Five-cue audio + haptics** on setFocus/commit/inspect/discard. (`audio.js` ~152-180)
8. **Motion beats** — `.is-open/.is-closing` transitions, directional slide via `data-dir`, confirm punch + `[INSTALLED]` stamp, hero breathe, 40ms stagger. (`game.css`, `game.js`)
9. **Curate CRT behind the overlay** + add the diegetic title bar. (`game.css`, `index.html`)
10. **Generalize** to route (vertical), incident (vertical, mandatory), graph inspector (cursor), and the HUD (change-driven glow). (`game.js` various)

## Top three moves (highest leverage first)
1. **Collapse the 4-card grid into one hero + peeking neighbors + count pill.** Fixes the anchor bug, the simplification goal, and sets up the controller model at once.
2. **Make focus a real state machine, not the mouse** — one `focusedIndex` the pad moves and hover sets; add the gamepad poll; give the hero the reserved white focus treatment + a per-move tick.
3. **End the hard cuts and add the commit punch** — there isn't one `transition:` in the whole stylesheet today, so even just reveal + focus-change + confirm is the fastest route from "inert web form" to "hand-tuned."

_An interactive mockup of the carousel (keyboard + gamepad) accompanies this spec — see the artifact linked in the working notes._
