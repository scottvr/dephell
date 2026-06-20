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

## UAT Notes

- `docs/UAT/ss1-play.png` showed the dependency graph panel hiding the player/enemies. The prototype now reserves the lower screen band for instrumentation by raising the combat floor and reducing the minimap height.
- Restart copy changed from "Run it back" to "New run". The button was intended to reset the run, not replay it.
- Enemy contact damage now uses update-loop windups instead of delayed timers, so resetting from a report cannot leak old hits into a new run.
- Room transitions now show a short pause banner. Combat room subtitles should describe the immediate threat; package-choice language belongs on the paused upgrade overlay.
- Victory reports should use release language, not postmortem language. "Cause" and "contributing factors" are reserved for failures unless a success is explicitly framed as a barely-contained incident.
- Package claims must match reusable effect operations. Test Suite now reveals suspected graph edges broadly, so the yellow CI relation becomes known instead of staying visually unchanged.

## Next Useful Tasks

1. Improve combat feel: enemy telegraphs, hit feedback, jump/dash tuning.
2. Split package/content data out of `scripts/game.js` once the operation vocabulary stabilizes.
3. Add a pause graph view with selectable nodes and cause tracing.
4. Add a second consequence branch for Observability builds so safe choices still create stories.
5. Add quick playtest prompts that measure whether the choice/consequence loop is legible.
