# Dependency Hell — Contributor & Agent Guide

This is the first doc every contributor (human or agent) should read. It holds the rules for
working on this repo, the codebase map, and how to run/verify changes. For the game vision and
design, see the documentation map in [`README.md`](README.md).

## Documentation map

- [`README.md`](README.md) — landing page, current status, how to run.
- [`docs/vision.md`](docs/vision.md) — creative north star (the full game treatment).
- [`docs/game-design.md`](docs/game-design.md) — what to build and how it looks (design + content + art).
- [`docs/content-authoring.md`](docs/content-authoring.md) — how to author new content correctly (coherence model, effect verbs, pipeline).
- [`docs/roadmap.md`](docs/roadmap.md) — the single source of "what's next" (scope, sprints, backlog, risks).
- `docs/archived/` — superseded originals, kept for posterity.

## How to run & verify

The prototype is **zero-build**. There is no `package.json`, bundler, or install step.

- **Run**: open `index.html` directly in a browser.
- **Preview specific states**: append a query string — `?visualSmoke=main|choice|graph|route|report`.
- **Visual smoke test**: `node scripts/visual-smoke.js` launches a temporary headless Chrome, serves
  the repo locally, and writes desktop screenshots for the main view, package choice, graph view,
  route choice, and report states to `artifacts/visual-smoke/`. Set `CHROME_PATH` to override the browser.

There is no unit-test framework. The visual smoke harness is the automated check; changes should be
verified by running it and by opening `index.html` in a browser.

- **Content gate**: `node tools/lint-content.js` validates `scripts/content.js` (effect verbs, tag ontology,
  graph references, coherence-trace rule). `node tools/simulate.js` reports balance (package pick rates,
  boss spread, incident mix, debt). See [`tools/README.md`](tools/README.md). Run the linter after editing content.

## Prototype architecture

Browser scripts load in order (see `index.html`) and share a small `window.DepHell` namespace. Keep
the prototype zero-build and directly openable.

- `scripts/constants.js` — shared layout/timing constants and fixed graph node positions.
- `scripts/content.js` — tunable data: packages, room definitions (with routes/branching), enemy definitions.
- `scripts/run-state.js` — `makeInitialRunState()`: resources and the initial dependency graph.
- `scripts/utils.js` — generic helpers (rect overlap, clamp, HTML escape, short-name) with no game-state ownership.
- `scripts/reports.js` — release report, postmortem, package-name, and build-identity text helpers.
- `scripts/effects.js` — package effect execution and package-preview text. Reusable graph operations live here.
- `scripts/graph.js` — visible-graph filtering, graph SVG markup, captions, node/edge inspector, cause tracing.
- `scripts/game.js` — runtime orchestrator: game loop, combat, enemy AI, canvas drawing, input, UI wiring,
  incidents, and room flow.

New package/content tuning starts in `content.js`. New reusable graph operations go in `effects.js`, with
preview language kept beside the operation behavior.

## Design gate for new content

Every new package, tool, enemy, room, route, incident, or resource rule should pass this test before
implementation:

1. Does it change what the player can do?
2. Does it mutate, reveal, block, or reinterpret the dependency graph?
3. Does it create a later consequence that can be traced?
4. Does it combine differently with at least two existing or planned systems?
5. Can a player make a clever prediction from it?

Avoid additions that are only stat stacks, filler rewards, or isolated jokes. The game works when each
object behaves like a small rules engine: immediate power, graph consequence, readable risk, and future
story pressure.

## Coherence gate for new content

A new object must define:

1. Its primary domain: what subsystem, resource, or failure family does it belong to?
2. Its graph role: does it create, remove, reveal, block, bridge, isolate, amplify, or weaken relationships?
3. Its risk model: what condition makes it dangerous, and what makes it safe?
4. Its counterplay: what can the player do before or after the consequence appears?
5. Its explanation path: could the postmortem explain its contribution in one sentence?
6. Its interaction surface: which tags does it care about, and which tags care about it?

Reject content whose effects cannot be explained through the dependency graph, player resources, enemy
behavior, or room topology. Before implementation, score the object using the rubric in
[`docs/content-authoring.md`](docs/content-authoring.md). Content below 7/10 should be rejected, redesigned,
or explicitly marked as a narrow prototype exception.

## Absurdity rule

Absurdity is allowed when the cause is traceable. The theme may be ludicrous; the mechanics must be accountable.

Good absurdity:

- The Rubber Duck reveals one hidden dependency if the player stands still, because forced explanation increases Observability.
- The Ancient Perl Script fires a cron effect every 60 seconds, but the effect is deterministic once discovered and appears in the postmortem.
- Friday Deploy gives a huge reward and adds incident pressure to future rooms.

Bad absurdity:

- The Rubber Duck randomly transforms enemies with no graph, resource, room, or enemy-behavior explanation.
- The Ancient Perl Script randomly changes stats with no readable trigger.
- Friday Deploy randomly kills the player.

If it can kill the player, block a route, alter a major resource, trigger an incident, or materially
affect a report, it must leave a causal trace in run state or the event log.

## Current prototype shape

- The dependency graph is the location map and the systemic cause/effect surface.
- Combat rooms are **top-down / overhead arenas** (Binding of Isaac style): the player moves on both axes,
  aims 360°, and fights enemies that pursue in 2-D. This shares the overhead mental model with the graph, so
  "a room is a graph node seen from above" reads literally. (Combat is melee — WASD move, mouse-aimed sword.)
- Graph-route choices are level/location choices, surfaced as **hybrid doors**: clearing a room lights up one
  door per available route on the arena walls; walking into a door opens that route's detail, and confirming
  travels. A single onward route auto-advances (no dead walking).
- **The graph IS the dungeon geography.** The minimap/INSPECT graph is a hierarchical orthogonal layout
  (release goal at top, deps below; edges elbow-routed as walkable `requires` corridors vs thin coupling
  wires — see `graph.js` `orthPoints` and `GRAPH_POSITIONS`). Each door is placed on the wall matching its
  neighbour's compass direction on that layout (`routeSide` in `game.js`), so the map and the walkable world
  share one geography. Altering the graph alters the world: installing a package fires an on-canvas
  "ARCHITECTURE SHIFTED" cue, package-unlocked routes appear as `NEW PATH` doors, and doors glow red/amber
  for conflicted/risky neighbour nodes.
- Spatial constants live in `scripts/constants.js` as `ARENA` (the play rect); actors clamp to it on both axes.
  `FLOOR_Y`/`GROUND_TOP` are legacy side-view constants, no longer used by gameplay.
- Keep the zero-build static browser prototype easy to open from `index.html`.

## Work intake

- Use [`docs/roadmap.md`](docs/roadmap.md) as the active task plan and source of "what's next."
- Add new work to the roadmap before implementing it unless it is an urgent bug fix.
- Prefer finishing the current sprint's exit criteria before pulling from later sprints.


## git usage

You may commit files as you wish, but do not ever push to the remote.
