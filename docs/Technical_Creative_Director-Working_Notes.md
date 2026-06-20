# Technical Creative Director Working Notes

## First Slice Decision

The current first slice is a zero-build browser prototype. That keeps the earliest playable loop easy to run, inspect, and throw away if a stronger engine choice emerges.

## Implemented Prototype Target

- Four side-view rooms: two combat rooms, one package-reactive verification room, and one staging incident.
- One package choice with three tradeoffs.
- Runtime dependency graph with nodes, edges, visibility, relation types, and event log entries.
- Data-driven package effects using reusable operations.
- One later consequence caused by graph state or Technical Debt.
- Generated mini-postmortem/release report that names actual run facts.

## Current Design Bet

Graph-scale interaction begins as pause/between-room inspection and package choice context. Combat uses the graph as a live minimap and consequence surface, not as an active tactical board yet.

The dependency graph is also the run's location topology. Side-view combat rooms are body-scale chamber views of graph loci; the minimap and paused graph show the system-scale map. This should be expressed through consistent current-location highlights, route pressure, and consequence spread rather than a lore explanation.

## Prototype Architecture

The prototype stays zero-build and directly openable from `index.html`. Browser scripts load in order and share a small `window.DepHell` namespace.

- `scripts/constants.js`: shared layout/timing/graph-position constants.
- `scripts/content.js`: tunable packages, room definitions, and enemy definitions.
- `scripts/run-state.js`: initial serializable run-state shape.
- `scripts/utils.js`: generic helpers with no game-state ownership.
- `scripts/reports.js`: release report, postmortem, package-name, and build-identity text helpers.
- `scripts/effects.js`: package effect execution and package-preview text.
- `scripts/graph.js`: visible graph filtering, graph SVG markup, captions, and cause-trace details.
- `scripts/game.js`: runtime orchestration, combat update, canvas drawing, input, UI wiring, package effects, incidents, and room flow.

New package/content tuning should start in `content.js`. New reusable graph operations should be added to `effects.js`, with preview language kept beside the operation behavior.

## UAT Notes

- `docs/UAT/ss1-play.png` showed the dependency graph panel hiding the player/enemies. The prototype now reserves the lower screen band for instrumentation by raising the combat floor and reducing the minimap height.
- Restart copy changed from "Run it back" to "New run". The button was intended to reset the run, not replay it.
- Enemy contact damage now uses update-loop windups instead of delayed timers, so resetting from a report cannot leak old hits into a new run.
- Room transitions now show a short pause banner. Combat room subtitles should describe the immediate threat; package-choice language belongs on the paused upgrade overlay.
- Victory reports should use release language, not postmortem language. "Cause" and "contributing factors" are reserved for failures unless a success is explicitly framed as a barely-contained incident.
- Package claims must match reusable effect operations. Test Suite now reveals suspected graph edges broadly, so the yellow CI relation becomes known instead of staying visually unchanged.
- The minimap can stay compact if the player has a paused graph view. `G`, the minimap, or `INSPECT` opens a larger clickable graph with node/edge cause tracing from run-state and event-log facts.
- The Resolver starts with a close-range glowing patch blade, matching the mockups. Ranged weapons can arrive later as package/tool upgrades rather than the default verb.
- Hovering or focusing package choices previews graph mutations as ghost nodes/edges before install.
- Verification Fork is a post-package branch room. It changes enemy pressure and event-log consequences based on the installed package before Staging Incident.
- Current rooms now have graph anchors, so the minimap and paused graph can show where the player is in the dependency topology without introducing a separate dungeon map.

## Next Useful Tasks

Completed in this pass:

1. Combat feel now has clearer enemy telegraph rings, hit sparks, brief hit stop, player invulnerability flash, dash afterimages, and close-range patch blade combat.
2. Package/content/effect/report/graph/run-state helpers are split out of `scripts/game.js`.
3. Package choices show effect-preview diffs before install, generated from the same effect data that applies the package.
4. Test Suite adds `test_coverage`, reveals suspected graph edges, and softens the staging incident so an Observability build has a distinct consequence branch.
5. Quick playtest prompts live in `docs/UAT/First_Slice_Playtest_Prompts.md`.

Next candidates:

1. Add a visible dash cooldown indicator.
2. Add package-preview graph diff text to the Graph Trace panel.
3. Add one more package or tool that introduces a genuinely new combat verb.
