# Technical Creative Director Working Notes

## First Slice Decision

The current first slice is a zero-build browser prototype. That keeps the earliest playable loop easy to run, inspect, and throw away if a stronger engine choice emerges.

## Implemented Prototype Target

- Three side-view rooms.
- One package choice with three tradeoffs.
- Runtime dependency graph with nodes, edges, visibility, relation types, and event log entries.
- Data-driven package effects using reusable operations.
- One later consequence caused by graph state or Technical Debt.
- Generated mini-postmortem/release report that names actual run facts.

## Current Design Bet

Graph-scale interaction begins as pause/between-room inspection and package choice context. Combat uses the graph as a live minimap and consequence surface, not as an active tactical board yet.

## Prototype Architecture

The prototype stays zero-build and directly openable from `index.html`. Browser scripts load in order and share a small `window.DepHell` namespace.

- `scripts/constants.js`: shared layout/timing/graph-position constants.
- `scripts/content.js`: tunable packages, room definitions, and enemy definitions.
- `scripts/run-state.js`: initial serializable run-state shape.
- `scripts/utils.js`: generic helpers with no game-state ownership.
- `scripts/reports.js`: release report, postmortem, package-name, and build-identity text helpers.
- `scripts/graph.js`: visible graph filtering, graph SVG markup, captions, and cause-trace details.
- `scripts/game.js`: runtime orchestration, combat update, canvas drawing, input, UI wiring, package effects, incidents, and room flow.

New package/content tuning should start in `content.js`. New reusable graph operations should be added to package effects in `game.js` only until the operation vocabulary stabilizes, then moved into a dedicated effect-system module.

## UAT Notes

- `docs/UAT/ss1-play.png` showed the dependency graph panel hiding the player/enemies. The prototype now reserves the lower screen band for instrumentation by raising the combat floor and reducing the minimap height.
- Restart copy changed from "Run it back" to "New run". The button was intended to reset the run, not replay it.
- Enemy contact damage now uses update-loop windups instead of delayed timers, so resetting from a report cannot leak old hits into a new run.
- Room transitions now show a short pause banner. Combat room subtitles should describe the immediate threat; package-choice language belongs on the paused upgrade overlay.
- Victory reports should use release language, not postmortem language. "Cause" and "contributing factors" are reserved for failures unless a success is explicitly framed as a barely-contained incident.
- Package claims must match reusable effect operations. Test Suite now reveals suspected graph edges broadly, so the yellow CI relation becomes known instead of staying visually unchanged.
- The minimap can stay compact if the player has a paused graph view. `G`, the minimap, or `INSPECT` opens a larger clickable graph with node/edge cause tracing from run-state and event-log facts.
- The Resolver starts with a close-range glowing patch blade, matching the mockups. Ranged weapons can arrive later as package/tool upgrades rather than the default verb.

## Next Useful Tasks

1. Improve combat feel: enemy telegraphs, hit feedback, jump/dash tuning.
2. Split package/content data out of `scripts/game.js` once the operation vocabulary stabilizes.
3. Expand cause tracing into package-preview diffs before install.
4. Add a second consequence branch for Observability builds so safe choices still create stories.
5. Add quick playtest prompts that measure whether the choice/consequence loop is legible.
