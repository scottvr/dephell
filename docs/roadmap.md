# Dependency Hell — Roadmap

This is the single canonical planning document for Dependency Hell: what we are building and what is next. It merges and supersedes four earlier docs (`MVP_Product_Plan.md`, `MVP_Sprint_Plan.md`, `MVP_Starter_Backlog.md`, `Open_Questions_And_Risks.md`), which remain in `docs/archived/` for history. Where those docs restated the same scope numbers, this roadmap states each target once (see [Section 2](#2-mvp-scope-targets)); other sections cross-link here rather than repeat them.

> **Branch note:** The original plan referenced the MVP branch `mvp`. The current active working branch is **`phase-2`** (off `main`). Treat `phase-2` as the live branch; historical references to `mvp`/`mvp-uiux-overhaul` below are preserved verbatim as authored.
>
> **Audit note (2026-07-28):** Checkbox states below were re-synced against the actual code (`scripts/`, `tools/`). Sprints 4–5 are effectively complete, Sprint 6 audio/effects landed, and Sprint 7 tooling (linter + simulator) exists. The main remaining gaps are: seeded/procedural run generation, distinct room layouts, an on-screen debug + active-tool HUD, report fields (`what went well`/`action items`/shipped-version/customer-impact), richer simulator balance metrics, and actual playtests. See the [Recommended next slice](#recommended-next-slice) callout under the Sprint Plan.
>
> **Companion specs (2026-07-28):** Two "feel" specs now sit alongside this roadmap and feed the presentation/engagement work in [Sprint 6](#sprint-6-art-ui-and-audio-first-pass) and [Sprint 7](#sprint-7-playtest-balance-and-mvp-cut):
> - [`fun-tuneup-protocol.md`](fun-tuneup-protocol.md) — the repeatable post-slice process that catches "reads great, feels flat": 3-tier cadence (headless checks → Playwright feel-telemetry → one-run human self-test), an 8-dimension feel rubric, and an AI proxy-tester angle.
> - [`console-feel-ux.md`](console-feel-ux.md) — a 23-rule, screenshot-/grep-testable rubric for AAA console-native UI (focus, motion tokens, verb contract, audio, CRT curation), plus the controller-first package-carousel build plan. **Carousel implementation is in progress on `phase-2`.**

---

## Top-Down Overhaul (branch `topdown-remaake`, 2026-07-30)

**The camera changed: combat is now top-down / overhead (Binding of Isaac style), replacing the side-view
side-scroller.** Why: the dependency graph is already an overhead node map, so side-view chambers forced the
player to translate between two perspectives. Overhead arenas share the graph's mental model — a room *is* a
node seen from above, its edges are the doors — making "rooms are services, corridors are dependencies"
literal. Combat stays melee (WASD move + mouse-aimed 360° sword + aim-dash).

Shipped in five verified phases (see git history on this branch):

1. **Movement/physics** — `ARENA` play rect in `constants.js` replaces the `FLOOR_Y` gravity model; WASD drives
   both axes (normalized diagonals); `facing ±1` → live `p.aim` angle; dash lunges along aim.
2. **Enemy AI, boss, hazards → 2-D** — all updaters pursue in 2-D (character preserved: cycle orbits a radial
   stand-off band, conflict-halves repel, etc.); contact/ranged gate on true distance; 2-D knockback; boss
   aims its break-arc at the player; hazards are 2-D footprints.
3. **Rendering** — top-down floor (tile grid + center node motif), arena walls, ground shadows, aim-rotated
   player/blade (no L/R flip), top-down enemy/boss sprites. Side-view cityscape/floor-slab removed.
4. **Hybrid doors + 2-D content** — on clear, one glowing labelled door per route on the walls; walk in →
   route detail → confirm travels; single route auto-advances. Enemy spawns placed in 2-D at load
   (`placeSpawn`; legacy `FLOOR_Y`-only content scattered, explicit `{x,y}` honored).
5. **Tooling/docs** — `feel-probe` steers in 2-D (uses new `enemy.y` in `debug.state()`); coupling-audit seed
   synced; visual-smoke re-baselined; `simulate` unchanged (no balance regression).

Verification per phase is headless (movement asserts, 2-D pursuit assert, feel-probe, doors flow assert) plus
screenshots. Legacy `FLOOR_Y`/`GROUND_TOP` remain in `constants.js` but are no longer used by gameplay.

### Slice 1 — graph-as-dungeon geography + room fill (2026-07-30)

Follow-on to the camera change, targeting the core innovation (the dependency graph as the dungeon) and the
"it feels like a plain melee fighter" note. Shipped in sub-phases 1A–1E:

- **1A room-fill** — removed the CRT "safe_mode" error rail (shelved, guarded) and widened `ARENA` ~37%; HUD
  panels became frosted translucent corner frames.
- **1B orthogonal layout** — `GRAPH_POSITIONS` re-laid as a hierarchical grid (release at top, deps below);
  `graph.js` routes edges as Manhattan/circuit elbows, styling walkable `requires` corridors vs coupling
  wires. User approved the hierarchy orientation; a **pipeline/journey orientation** (Local Dev → Release,
  L→R) is a noted future experiment.
- **1C doors by geography** — door walls derive from each neighbour's compass direction on the layout
  (`routeSide`/`routeTargetNode`), so exiting a door matches the map. Map = world.
- **1D graph mutates the dungeon** — package installs fire an "ARCHITECTURE SHIFTED" cue; doors carry live
  graph state (`NEW PATH` / `⚠ CONFLICT` / `△ RISKY`).
- **1E** — gates green (lint/simulate/feel-probe, feel-probe window widened for the bigger arena),
  visual-smoke re-baselined, docs updated.

**Slice 2 (next) — card/economy rework.** The motivation gap is that packages are *free* (pick 1-of-4, no
cost), so the player doesn't weigh the cards. Plan: a spend currency + **buy-on-credit** (take cheap/free,
pay in Tech Debt / Security Risk) + refactor-to-remove, plus more verb-changing (not stat-only) packages and
a visible loadout. This is the "every power has a shadow" pillar finally biting.

**Follow-ups worth considering:** richer per-type top-down enemy silhouettes; door art polish; the pipeline
orientation experiment; a brief top-down onboarding beat; controller support for 360° aim.

---

## 1. MVP Goal & Product Questions

Prove that a real-time room-based roguelite can use a live dependency graph as its central source of power, risk, humor, and run identity.

The MVP should answer these product questions:

1. Do players understand that packages change both combat and graph state?
2. Do graph mutations create funny, legible, non-arbitrary consequences?
3. Does generated postmortem/release reporting make players want another run?
4. Do runs produce Cogmind-inspired system depth: readable machine logic, procedural complexity, and emergent build identity?
5. Do route, upgrade, and event choices create Slay the Spire-inspired risk evaluation and build-shaping pressure where appropriate?
6. Do players feel the Papers, Please-inspired pressure of absurd process and earlier approvals compounding over time?

### MVP North Star

Build one complete Release Candidate Pipeline run where combat, package choices, graph traversal, graph mutations, incidents, boss behavior, postmortem, and release report all read from shared run state.

The prototype already proved the core bet: the dependency graph can be both map and consequence engine. MVP work should now expand breadth, readability, presentation, and replayability without losing that cause/effect spine.

---

## 2. MVP Scope Targets

This is the canonical scope list. It is stated once here; the Sprint Plan and Starter Backlog reference these numbers rather than redefining them.

The MVP is **one playable character (The Resolver)** on **one floor (the Release Candidate Pipeline)**, top-down room combat (see [Top-Down Overhaul](#top-down-overhaul-branch-topdown-remaake-2026-07-30)) with roguelite room progression and graph-driven route/state decisions.

**"First Slice"** below refers to what is already implemented in the current zero-build canvas prototype (see [Ground Truth](#current-ground-truth--what-is-implemented)).

| Target | MVP goal | Current status |
|---|---|---|
| Rooms per run | 10 to 14 | **Met (hand-authored)** — 11-room branching pool, ~9 rooms/run, two branch points + a package-gated shortcut. Not yet procedurally generated. |
| Room types | 8 | **Met** — combat, observability audit, test gate, package gate, verification fork, integration, refactor, dependency injection, incident, boss (~10 types) |
| Packages/items/tools | 24 | Partially met — **12 implemented** (4 active tools); remaining 12 drafted in `package-roster.md` |
| Enemy types | 10 | **Met** — 8 enemy behaviors + 2 adaptive bosses |
| Run events/incidents | 4 | **Met** — 5 incidents with two-path resolution (Build Failure, Audit Pressure, Minor Regression, Critical CVE, Dependency Unpublish) |
| Adaptive bosses | 2 | **Met** — The Major Version Upgrade + The Distributed Monolith, selected by accumulated run pressure |
| Core resources | Stability, Observability, Technical Debt | **Met** — all 3 implemented |
| Graph edge types | 7 (requires, conflicts, patches, isolates, observes, pins, infects) | **Mostly met** — 6 of 7 as edges (requires, conflicts, patches, isolates, observes, flags); `pins` is the `pinNode` op rather than an edge, and `infects` is drafted (Cache Layer) but not yet in content. Extra relations in use: `reverts`, `breaks`, `scans`, `explains`. |
| Dependency graph as map/consequence engine | Graph traversal + mutation + preview | **Met** — graph-as-map traversal, package choice overlay with live mutation preview, graph inspector, boss attacks along edges |
| Package choice overlay | With live graph preview | **Met** — pooled 3–4 card offer with graph preview |
| Graph minimap and pause graph view | Required | **Met** — combat minimap + paused clickable inspector with cause tracing |
| Generated failure postmortem | Required | **Met** — Mini Postmortem on loss, sourced from run state |
| Generated victory release report | Required | **Met** — Release Report on win, incl. boss/risks/pins/resolved-incident lines |
| CRT/terminal visual identity | Represented in playable form | **Met** — CRT visuals in place |
| Basic adaptive audio and state-driven sound cues | Required | **Met** — procedural Web Audio SFX + adaptive ambience (stability/debt/incident/boss), HUD mute |

### Current Ground Truth — What Is Implemented

_Updated 2026-07-28 from a code audit. Supersedes the original first-slice description._

Implemented in the current build:

- Hand-authored one-floor pipeline: 11-room branching pool, ~9 rooms/run, 3 branch points (`local_dev`, `verification_fork` with a package-gated shortcut, `integration_bay`), all reconverging on the boss. **Not procedurally generated; not seeded.**
- 12 packages (4 active tools: Feature Flag, Rollback Plan, Circuit Breaker, Rubber Duck); 12 more drafted in `package-roster.md`.
- 8 enemy behaviors (6 base + a fork variant + `dependency_cycle`) plus 2 three-phase adaptive bosses (Major Version Upgrade, Distributed Monolith).
- 3 resources: Stability, Observability, Technical Debt.
- Graph-as-map traversal, live combat minimap, and paused clickable graph inspector with cause tracing.
- Package choice overlay with live graph-mutation preview + graph-diff text.
- Observability-gated visibility (known/suspected/hidden) affecting preview specificity.
- 5 incidents (Build Failure, Audit Pressure, Minor Regression, Critical CVE, Dependency Unpublish), each with 2 resolution paths.
- Process decisions / approvals (security exception, audit exception, accepted CVE risk) recorded and queried by later consequences (blocked rollback, boss score, reports).
- Boss risk-score selection, a boss attack that travels a real graph edge, Feature Flag as counterplay, boss intro naming the architectural cause.
- Event log with ordered, id-tagged facts feeding reports.
- Win Release Report / lose Mini Postmortem, both sourced from run state; build-identity classification.
- CRT visuals, graph/combat effects, procedural Web Audio SFX + adaptive ambience with HUD mute.
- Tooling: content linter (`tools/lint-content.js`), seeded balance simulator (`tools/simulate.js`), and a screenshot smoke harness (`scripts/visual-smoke.js`), all sharing the live content via `tools/lib/load-dephell.js`.

**Not built yet:** seeded/procedural run generation; distinct per-room graybox layouts (all rooms share one flat arena); on-screen debug overlay; active-tool cooldown/readiness HUD; per-enemy telegraphs (currently boss-only); real art (sprites/icons/backdrops are graybox/procedural); the remaining 12 packages; report `what-went-well`/`action-items`/shipped-version/customer-impact fields; richer simulator metrics (per-act TDR, deaths, conflicts) and any actual playtests.

### Deferred (out of MVP scope)

- Multiple floors/biomes.
- Multiple player classes.
- Meta-progression.
- Daily challenges.
- Custom package editor.
- Mod support.
- Terminal-only mode.
- Complex morale/security/build-confidence resource systems.
- Online sharing.
- Fully simulated package ecosystem.

### Scope Guardrails

**Protect:** graph-driven consequences; readable real-time combat; funny, specific postmortems; CRT/terminal presentation.

**Cut first if behind:** extra room types beyond 8; extra package count beyond 24; second art variant per enemy; optional side room rewards; advanced adaptive music; complex generated prose variation.

**Do not cut for MVP:**

- Observability affecting hidden information.
- Technical Debt affecting events or boss behavior.
- At least one adaptive boss.
- Failure postmortem tied to real run state.
- Package choices with graph preview.
- Emergent build identity from package, graph, incident, and resource interactions.
- Readable machine logic for major consequences.
- At least basic strategic route or event choices with visible tradeoffs.
- At least one process/bureaucracy consequence chain from approval or accepted risk to later incident, blocker, or postmortem line.

### Platform Assumptions

- Desktop first. 16:9 base layout, matching 1408x768 mockup framing. Keyboard/mouse and controller.
- Side-view encounter rooms are the MVP direction. "Room-based" means discrete combat chambers and route choices, not a mandatory top-down presentation.
- The dependency graph is the structural map underneath the visible room layout.
- Full-screen graph-scale views are permitted for pauses, special rooms, boss phases, postmortems, or later levels. The side-view camera is the MVP default, not a permanent constraint. The graph-scale view is where the FTL-style promise can live: subsystem triage, pausable panic, cascading failures, and deciding which failure to address first.
- Engine: any engine with strong 2D support, data-driven content, and fast UI iteration is acceptable. The current implementation is a zero-build vanilla-JS canvas prototype launched from `index.html`.

### Success Metrics

**Playtest comprehension:**

- 80% of testers can explain what Stability, Observability, and Technical Debt do after one run.
- 70% can identify at least one earlier choice that caused a later problem.
- 70% understand why the selected boss appeared.

**Engagement:**

- Median first run length: 12 to 25 minutes.
- At least 60% start a second run after a failure.
- At least 50% voluntarily read the postmortem details.

**Design quality:**

- At least 3 distinct build archetypes emerge from playtests.
- At least 70% can describe their run's build identity without simply listing item names.
- At least 60% can explain one system consequence using visible graph logic, event history, or postmortem details.
- At least 60% can describe why they chose one route, package, or event resolution over a plausible alternative.
- At least 2 route or event choices per run present distinct risk/reward profiles.
- At least 2 accepted risks, waivers, approvals, skipped validations, or similar process decisions can return as later consequences.
- At least 50% notice and understand one bureaucratic/process consequence in the postmortem or release report.
- No single package is picked over 80% of the time when offered.
- At least 6 package interactions produce recognizable stories.

**Readability:**

- Combat deaths should usually be attributed to enemy/projectile/hazard readability, not hidden graph math.
- Graph UI should support a decision within 10 to 20 seconds during package selection.

### Definition of Done

MVP is done when:

- Runs can be completed or failed without developer intervention.
- Core resources and graph state persist through the run.
- Package, enemy, event, and boss content is loaded from data or easily tunable definitions.
- The game can generate a postmortem and release report from recorded run events.
- The mockup-inspired visual identity is represented in-game.
- Playtest results answer the MVP product questions.

---

## 3. Non-Negotiable Design Gates

These gates apply to all new content and systems. (Checklist preserved from the Sprint Plan.)

- [ ] Every package/tool changes what the player can do or reason about.
- [ ] Every major graph mutation can create, reveal, block, or reinterpret a later consequence.
- [ ] Every major consequence is traceable through graph state, event logs, report text, or inspection UI.
- [ ] Combat remains readable before extra UI spectacle is added.
- [ ] Route choices and package choices present visible tradeoffs rather than flat upgrades.
- [ ] Process/bureaucracy choices can return later as incident pressure, blocked rollback, boss modifier, or report detail.
- [ ] Absurdity is allowed only when its cause is traceable.
- [ ] Content follows the coherence model in `docs/content-authoring.md`.
- [ ] New content scores at least 7/10 on the coherence rubric unless explicitly marked as a prototype exception.

---

## 4. Sprint Plan (Live Task Tracker)

This is the working delivery plan for moving from validated first slice to MVP. Keep this section current as the source of "what are we doing next?" Checkbox states were re-synced to code on 2026-07-28 (the original verbatim states from `MVP_Sprint_Plan.md` are in git history).

### Recommended next slice

The content-and-consequence spine (Sprints 3–5) is largely done and the reporting/audio/tooling around it (Sprints 4, 6, 7-tooling) is in place. The biggest gaps are now in **run structure, presentation legibility, and playtest evidence** — the earlier sprints that were leapfrogged. Highest-leverage next slice, in order:

1. **Seeded runs (Sprint 1).** Add a seed + deterministic PRNG to run state and route all `Math.random()` through it. This is a prerequisite for reproducible playtests, meaningful simulator output, and any future procedural generation — and it's currently blocking the simulator from rolling/resolving incidents faithfully.
2. **On-screen debug overlay + active-tool HUD (Sprints 1–2).** Surface seed, room id, graph locus, installed packages, active incident, boss scores, and tool cooldown/readiness. Cheap, and unblocks everything else by making run state legible during play.
3. **Room layout data (Sprint 2).** At least 3–5 distinct graybox arenas so a ~9-room run doesn't feel like one repeated fight — the single largest "mildly fun" risk.
4. **Report field completion (Sprint 4).** Add `what went well` / `action items` to the postmortem and shipped-version / customer-impact to the release report — small edits in `reports.js` that close named MVP scope items.
5. **Then: first internal playtests (Sprint 7).** With seeds + debug overlay + report completeness in place, the 5 internal playtests become worth running and can start answering the MVP product questions.

Deferred within these: per-enemy telegraphs, the remaining 12 packages, richer simulator metrics (per-act TDR, deaths, conflicts), and real art — none block the loop.

### Branch And Cadence

- MVP branch: `mvp` (see branch note at top of this doc — the live working branch is now `mvp-uiux-overhaul`).
- Default sprint length: 1 week while solo/small-team prototyping; switch to 2 weeks if coordination overhead rises.
- Sprint review artifact: a playable build plus this file updated with checked boxes and carryover notes.
- Sprint planning rule: pull from the next sprint only after current sprint exit criteria are true or explicitly deferred.

### Sprint 0: MVP Kickoff And Prototype Lock

Goal: declare the MVP track, preserve the prototype learnings, and make the current slice a stable base.

- [x] Create `mvp` branch.
- [x] Add repo-level contributor/design gate guidance.
- [x] Save package/tool idea backlog for later reference.
- [x] Consolidate redundant UAT docs.
- [x] Implement graph-route traversal proof.
- [x] Implement first active tool package, Feature Flag.
- [x] Commit current prototype baseline on `mvp`. _(Baseline committed; work has since moved to `main`/`phase-2`.)_
- [ ] Tag the last prototype baseline if needed. _(Optional — no tag created.)_
- [x] Add a short "how to run/playtest" section to README or docs index. _(README "Run it" + AGENTS.md "How to run & verify".)_
- [ ] Decide whether the zero-build canvas prototype remains the MVP implementation or becomes a design prototype for an engine move. _(Still open — see §6.2.)_

Exit criteria:

- [x] Branch exists and current working state is committed.
- [x] Docs clearly identify MVP scope, sprints, and current prototype status.
- [x] First-slice playtest prompts cover graph routes, package choice, Feature Flag, and reports. _(`docs/UAT/First_Slice_Playtest_Prompts.md`.)_

### Sprint 1: Run Structure And Data Spine

Goal: replace hand-authored linear progression with a reusable one-floor run structure while preserving the current playable slice.

- [ ] Define room schema for type, graph locus, exits, reward, incident hooks, layout id, enemy budget, and tags. _(Partial — rooms carry type, graph locus, routes, reward, incident hooks, and inline enemy spawns; **missing** layout id, explicit enemy-budget field, and room-level tags.)_
- [x] Define route schema for target, graph edge, known risk, suspected risk, reward preview, and lock state. _(Routes have `to`, `edge`, `tradeoff`, `description`, and `requiresPackage` lock state.)_
- [ ] Add seeded run creation. _(Not started — all randomness is bare `Math.random()`; no seed in run state.)_
- [ ] Generate a one-floor graph with 10 to 14 visitable loci. _(Floor exists as an 11-room hand-authored pool, but it is not generated/seeded.)_
- [x] Support at least 2 route choices per run with distinct risk/reward profiles. _(3 branch points with tradeoff previews + a package-gated shortcut.)_
- [ ] Add debug display for current seed, room id, graph locus, installed packages, active incident, and boss scores. _(Only a read-only `namespace.debug.state()` snapshot exists; no on-screen overlay and no seed.)_
- [x] Make package offers data-driven by pool, tags, and room/event context.
- [x] Preserve direct static-file launch from `index.html` unless an engine/tooling decision changes.

Exit criteria:

- [x] A full generated route can be played from start to provisional end. _(Full run is playable start → boss → win/lose; route is authored, not generated.)_
- [x] At least one route choice affects package pool, debt, observability, incident likelihood, or boss risk.
- [x] Run state can be inspected well enough to debug any room transition. _(`debug.state()` + live graph inspector.)_

### Sprint 2: Combat And Room Variety

Goal: make the longer run mechanically tolerable before adding lots of systems pressure.

- [ ] Add room layout data and at least 5 distinct graybox layouts. _(Not started — all rooms render one flat arena; differ only by enemy composition and graph locus.)_
- [x] Add room hazards tied to graph/process concepts. _(Hazard zones drain Technical Debt + Stability, reduced by test coverage, suppressed by an active Feature Flag.)_
- [x] Expand enemies from 3 to 6 types. _(8 enemy behaviors implemented.)_
- [ ] Give each enemy a distinct silhouette, movement rule, and telegraph. _(Partial — distinct movement/ranged rules and graybox silhouettes exist, but telegraph windows are boss-only, not per regular enemy.)_
- [x] Add one elite or modifier variant driven by graph state. _(`enemyModifier` applies run-wide buffs from graph state, e.g. Dependency Injection room; plus incident buffs.)_
- [ ] Add active-tool HUD state and cooldown/readiness display. _(Cooldowns are tracked internally but never surfaced in a HUD.)_
- [ ] Tune Stability damage and recovery for 12 to 25 minute runs. _(Ongoing balance work — belongs with Sprint 7 playtests; no run-length evidence yet.)_
- [ ] Add keyboard/controller input mapping plan. _(Keyboard/mouse implemented; no controller support or documented mapping plan.)_

Exit criteria:

- [ ] A 10-room run is readable and mildly fun with placeholder art. _(Needs playtest.)_
- [ ] Testers can identify what hit them most of the time. _(Needs playtest.)_
- [ ] At least 3 room layouts create different combat movement decisions. _(Blocked on room-layout work above.)_

### Sprint 3: Graph And Package Expansion

Goal: turn package selection into the MVP's main build-shaping system.

- [x] Expand reusable effect operations: pin, isolate, disable, reveal node, reveal edge, add event weight, add boss score, add approval, add active tool. _(14 authorable ops in use; `disable` and `add event weight` are computed in game logic rather than authorable ops, but the reusable-op spine is in place.)_
- [ ] Support 7 MVP edge relations: requires, conflicts, patches, isolates, observes, pins, infects. _(Partial — 6 of 7 as edges; `pins` is the `pinNode` op and `infects` is not yet in content. See Section 2 note.)_
- [x] Expand packages/items/tools to 12.
- [x] Draft full 24-package MVP list with design-gate notes. _(`docs/package-roster.md`: 12 implemented + 12 drafted with rubric scores.)_
- [x] Draft initial tag ontology and compatibility rules from `docs/content-authoring.md`. _(`docs/tag-ontology.md`: 6 tag families + 5 risk kinds.)_
- [ ] Add primary-axis and secondary-axis fields to package/tool/room/enemy drafts where useful. _(Tag families exist, but explicit primary/secondary-axis fields are not on the content objects.)_
- [x] Add at least 3 active tools or packages that create new verbs. _(4 active tools: Feature Flag, Rollback, Circuit Breaker, Rubber Duck.)_
- [x] Add at least 6 package interactions that produce recognizable stories. _(Cross-package edges: patches, conflicts, isolates, reverts, scans, breaks between real packages.)_
- [ ] Define fallback interaction hierarchy: specific pair rule, specific tag rule, generic domain rule, generic risk rule, no interaction. _(Not implemented; linter does not check interaction fallbacks.)_
- [x] Add graph diff text to Graph Trace/package preview. _(`packagePreviewText` + "Graph mutation preview" badges.)_
- [x] Make Observability affect route/package/incident preview specificity.

Exit criteria:

- [ ] A tester can explain at least one package -> graph -> later consequence chain. _(System supports it; needs playtest evidence.)_
- [x] No package is merely a positive stat increase. _(Enforced by the linter's trace-verb gate.)_
- [ ] Package previews support a decision within 10 to 20 seconds. _(Needs playtest.)_

### Sprint 4: Incidents, Process Pressure, And Reports

Goal: make failures and successes feel authored by the run state rather than generic.

- [x] Implement 4 run events/incidents: Build Failure, Audit Pressure, Critical CVE, Dependency Unpublish. _(5 incidents including all four.)_
- [x] Give each incident at least 2 resolution paths or mitigations.
- [ ] Add process decisions: security exception, skipped validation, accepted risk, change-freeze waiver, or vendor approval. _(Partial — 3 approvals implemented: security exception, audit exception, accepted CVE risk. Skipped-validation / change-freeze / vendor approval not yet formal approvals.)_
- [x] Make at least 2 later consequences query process decisions. _(Blocked rollback, boss score, and report lines all query approvals/risks.)_
- [ ] Expand postmortem templates with primary cause, contributing factors, what went well, action items, and timeline. _(Partial — primary cause, contributing factors, and timeline present; **no** "what went well" or "action items" sections.)_
- [ ] Expand release report with shipped version, customer impact, known issues, final architecture, and cleanup notes. _(Partial — known issues, final architecture, and cleanup notes present; **no** concrete shipped-version number or customer-impact line.)_
- [x] Improve build identity calculation from package tags, graph topology, resources, incidents, and decisions. _(`buildIdentity` classifies isolation/security/observability/legacy/velocity/pinned/flag/minimal.)_
- [x] Add report details for active tools such as Feature Flag and future Circuit Breaker/Canary. _(Feature Flag / Rollback / Circuit Breaker surfaced in reports; Canary not yet implemented.)_
- [x] Enforce causal trace policy for fatal damage, route blocking, major resource changes, incidents, boss selection, and report material. _(Event log records run-end reason, incidents, boss selection, tool use; linter enforces trace verbs on content.)_

Exit criteria:

- [x] Failure reports name actual run facts and feel specific.
- [x] Victory reports use release language, not failure/postmortem language.
- [x] At least 3 major consequence types are traceable.
- [x] Every player-killing or run-ending outcome has an event-log or run-state explanation path. _(`run_failed` logs its reason with a traceable consequence.)_

### Sprint 5: Bosses And Full Run Completion

Goal: deliver the MVP arc from first room through adaptive boss and report.

- [x] Implement boss risk score model.
- [x] Add The Major Version Upgrade boss. _(3 phases with telegraph windows.)_
- [x] Add The Distributed Monolith boss. _(3 phases.)_
- [x] Make boss selection respond to accumulated graph state. _(`selectBoss` weighs boss scores + pins + risks + created-by edges.)_
- [x] Add at least one boss attack that travels through graph edges. _(`def.edges` arc attack.)_
- [x] Allow at least one player tool/package to counter or reduce a graph attack. _(Active Feature Flag suppresses the arc launch.)_
- [x] Add boss intro copy that names the relevant architectural cause. _(`BOSS_INTROS`.)_
- [x] Wire victory release report from boss defeat. _(`boss_defeated` → Release Report.)_

Exit criteria:

- [x] Full run can end in failure or victory without developer intervention.
- [x] Boss feels connected to the architecture the player built. _(Selection + intro name the architectural cause; validate emphasis in playtest.)_
- [x] Release report reflects final architecture and meaningful decisions.

### Sprint 6: Art, UI, And Audio First Pass

Goal: lift the MVP from readable graybox to mockup-aligned presentation while protecting combat clarity.

- [x] Prototype current-slice graph readability pass: edge/state legend, package-choice graph previews, graph-scale inspection hierarchy, and restrained CRT/arcade treatment. _(Legends, live previews, clickable inspector, CRT glass/scan all landed.)_
- [ ] Define visual style guide for CRT glow, node/edge states, package categories, hazard states, and report screens. _(No consolidated style-guide doc yet; treatment lives in code + concept-art mocks.)_
- [ ] Add first-pass player sprite/animation. _(Graybox player with animated sword; no sprite art asset.)_
- [ ] Add first-pass enemy sprites for 10 enemy types. _(Graybox colored shapes, not sprites.)_
- [ ] Add first-pass boss visuals for 2 bosses. _(Graybox with phase changes, not art.)_
- [ ] Add package icons for 24 packages. _(Card talismans/category badges exist for the 12 shipped; no full icon set.)_
- [ ] Add room backdrop set for 8 room types. _(Shared architecture-block backdrop; not per-type.)_
- [x] Add graph failure effects: conflict arcs, infection spread, build failure pulse, install pulse, rollback/flag/circuit effects. _(`effects.js` + boss arcs + install pulse.)_
- [x] Add core SFX: install, conflict, reveal, hit, death, build fail, route select, graph inspect, boss intro. _(Procedural Web Audio SFX.)_
- [x] Add incident and boss music/ambience states. _(Adaptive ambience reacts to stability/debt/incident/boss/combat.)_
- [ ] Run accessibility pass for color plus shape/icon redundancy. _(Partial redundancy via badges/edge styles; no formal pass.)_

Exit criteria:

- [x] Mockup-inspired identity is visible in-game. _(CRT/arcade treatment present.)_
- [ ] UI and effects do not obscure combat. _(Needs playtest confirmation.)_
- [x] Critical gameplay cues are visible and audible. _(SFX + visual effects on key events; verify under load in playtest.)_

### Sprint 7: Playtest, Balance, And MVP Cut

Goal: answer the MVP product questions with evidence and cut scope aggressively where needed.

- [x] Add a content linter for unknown tags, unknown effect verbs, missing graph effects, missing risks, missing counterplay, and missing explanation paths. _(`tools/lint-content.js` covers unknown tags/verbs and the stat-only/trace-verb gate; **missing counterplay, interaction-fallback, and rubric-score checks are not yet implemented**.)_
- [x] Add a pre-commit hook or documented check command for the content linter once content is mostly data-driven. _(Documented command in README/AGENTS.md; **no git hook** installed.)_
- [x] Add a seeded run simulation benchmark that repeatedly chooses routes/packages, applies effects, rolls incidents, applies mitigations, and records outcomes. _(`tools/simulate.js`, deterministic seed, 4000 runs; **caveat**: it computes the single most-likely incident rather than stochastically rolling + resolving, and does not simulate combat/mitigations.)_
- [ ] Generate balance reports: package pick rate, average TDR by act, most common deaths, unmitigated conflicts, no-counterplay incidents, and dominant packages. _(Partial — pick rate, dominant-package (>80%) detection, boss spread, and incident distribution exist; **no** per-act TDR, deaths, unmitigated conflicts, or no-counterplay metrics.)_
- [ ] Add run telemetry or structured playtest notes for duration, packages selected, route choices, failure/victory cause, and second-run intent. _(Not captured; only manual playtest prompts exist.)_
- [ ] Run 5 internal playtests.
- [ ] Run 10 technical-player external playtests.
- [ ] Run 10 general roguelite-player external playtests.
- [ ] Balance package offer rates so no single package dominates. _(Simulator flags dominance; tuning ongoing, not validated by playtest.)_
- [ ] Balance enemy damage, room length, recovery, and incident pressure. _(Combat-feel/winnable tuning passes done; not playtest-validated for 12–25 min.)_
- [ ] Perform text/humor pass on packages, incidents, bosses, reports, and logs.
- [ ] Fix major bugs and confusing UI states. _(Ongoing; review-fix passes committed.)_
- [ ] Produce MVP findings report against success metrics.
- [ ] Cut or defer anything not needed to answer MVP questions.

Exit criteria:

- [ ] Runs last roughly 12 to 25 minutes.
- [ ] At least 70 percent of testers can identify one earlier choice that caused a later problem.
- [ ] At least 60 percent can explain one system consequence using visible graph logic, event history, or report details.
- [ ] At least 60 percent start or say they want to start a second run after failure.

---

## 5. Starter Backlog (Reference Appendix)

Epics, stories, and acceptance criteria that give implementation detail behind the sprints. This is a starting point for estimation and ownership, not a second sprint plan. Where a story overlaps a sprint task, the story is the detail for that sprint. Scope numbers referenced below (e.g. 24 packages, 10 enemies, 7 edge types) are the canonical targets in [Section 2](#2-mvp-scope-targets).

### Epic 1: Combat Graybox

**Story: Player Can Move And Fight** — As a player, I can move, aim, fire Patch projectiles, and evade so combat feels readable before graph systems are added.

- Player can move, jump/drop where supported, and navigate side-view encounter rooms.
- Player can aim and fire continuously.
- Player has one evade/dash action with cooldown.
- Player takes Stability damage from enemies.
- Player death ends the run and records a failure event.

**Story: Combat Room Can Be Cleared** — As a player, I can enter a combat room, defeat enemies, and receive a reward choice.

- Room locks while enemies are alive; unlocks after they are defeated.
- Clear event is recorded.
- Reward flow can open after clear.
- At least 3 graybox room layouts exist.

**Story: Enemy Families Work In Graybox** — As a designer, I can spawn early enemy families to test combat readability.

- Regression, Breaking Change, and Memory Leak exist in graybox form.
- Each has a distinct movement or attack rule.
- Each has a visible telegraph before damaging the player.

### Epic 2: Run State And Event Log

**Story: Run State Tracks Core Values** — As a developer, I need a central run-state object so combat, graph, UI, and postmortem share the same truth.

- Run state stores Stability, Observability, Technical Debt, installed packages, current room, dependency graph, active incidents, and seed.
- Run state can be dumped for debugging and reset to start a new run.

**Story: Event Log Records Meaningful Facts** — As a designer, I need run events recorded so postmortems can be specific.

- Package installs, graph changes, incidents, boss selection, rollback events, and run end events are logged.
- Events include timestamp/order and relevant ids.
- Logs are accessible to postmortem generation and debug UI.

### Epic 3: Dependency Graph

**Story: Route Choices Have Strategic Tradeoffs** — As a player, I can choose between routes that imply different risks and rewards.

- A run includes at least 2 route or event-path choices with distinct risk/reward profiles.
- Route preview communicates room type, likely reward, and at least one visible or suspected risk.
- Observability improves route preview detail.
- At least one route choice can affect package pool, Technical Debt, Observability, incident weights, or boss risk score.

**Story: Graph Stores Nodes And Edges** — As a developer, I can add packages and relations to a dependency graph.

- Nodes support id, name, category, tags, visible properties, hidden properties.
- Edges support source, target, relation, strength, visibility, active state.
- Supported MVP relations: requires, conflicts, patches, isolates, observes, pins, infects.

**Story: Observability Controls Visibility** — As a player, I see more accurate graph information when Observability is higher.

- Known, suspected, and hidden states render differently.
- Raising Observability reveals at least one hidden or suspected property.
- Package selection preview respects current Observability.

**Story: Graph Minimap Shows Risk** — As a player, I can glance at the minimap to understand graph health.

- Minimap displays node/edge structure at low detail.
- Active hazards pulse or highlight.
- Current package preview highlights affected nodes.
- Minimap does not block combat readability.

**Story: Major Consequences Are Traceable** — As a player, I can understand why a major conflict, incident, or boss attack happened.

- At least 3 major consequence types expose their cause through graph state, logs, or postmortem text.
- Hidden causes become explainable after observability reveal, incident resolution, or failure.
- Debug output can trace each major consequence to source nodes, edges, packages, or debt tags.

### Epic 4: Packages And Upgrades

**Story: Package Choice Presents Tradeoffs** — As a player, I choose one of three packages and understand the immediate benefit plus visible risk.

- Package overlay shows name, icon, benefit, risk tags, and graph preview.
- Player can confirm or cancel before installing.
- Installed package mutates player stats and graph state.
- At least 8 MVP packages have a clear build-shaping tradeoff rather than a purely positive stat increase.
- At least 4 package offers create a plausible choice between short-term power and long-term system risk.

**Story: Packages Are Data-Driven** — As a designer, I can tune package content without engineering every item separately.

- At least 12 initial packages use reusable effect operations.
- Package data can modify stats, add nodes, add edges, change debt, reveal graph state, and add event weights.
- At least 3 package interactions produce visible consequences.

### Epic 5: Technical Debt And Incidents

**Story: Technical Debt Changes Run Pressure** — As a player, shortcuts make the system riskier over time.

- Technical Debt increases from at least 5 package/effect sources.
- Threshold bands change event weights or room hazards.
- UI communicates current debt state without lengthy explanation.

**Story: Process Approvals Can Return Later** — As a player, I can accept a waiver, approval, skipped validation, or process exception that helps now but may complicate the run later.

- At least 3 process decision types exist: accepted risk, skipped validation, security exception, change freeze waiver, vendor approval, or documentation signoff.
- Process decisions are recorded in the event log with target, reason, and relevant tags.
- At least 2 later consequences can query process decisions: audit pressure, blocked rollback, forced patch, boss modifier, incident weight, or postmortem contributing factor.
- UI text presents these choices with dry bureaucratic tone without requiring long reading during combat.

**Story: Incidents Trigger From Graph State** — As a player, incidents feel connected to earlier decisions.

- Critical CVE, Build Failure, and Dependency Unpublish exist.
- Incident trigger weights read graph tags and debt.
- Each incident offers at least 2 resolution paths.
- Incident outcome is recorded in event log.

### Epic 6: Boss And Run Completion

**Story: Boss Selection Responds To Architecture** — As a player, the boss reflects the system I built.

- Boss risk scores update during the run.
- Boss room selects The Major Version Upgrade or The Distributed Monolith based on risk scores.
- Boss intro names the relevant architectural cause.

**Story: Boss Fight Uses Graph Attacks** — As a player, I fight a boss that attacks through dependency graph concepts.

- At least one boss attacks along graph edges.
- Graph attack has clear telegraph.
- Player tools can counter or reduce at least one graph attack.
- Defeating boss ends in release report.

### Epic 7: Postmortem And Release Report

**Story: Failure Generates Postmortem** — As a player, losing produces a funny, specific summary of what went wrong.

- Postmortem includes incident title, primary cause, contributing factors, what went well, action items, and timeline.
- At least 80% of nouns in the postmortem come from actual run state.
- Timeline includes 3 to 5 logged events.

**Story: Victory Generates Release Report** — As a player, winning produces a release report that reflects the final architecture.

- Report includes shipped version, customer impact, known issues, risk/debt summary, and final architecture line.
- Report names at least 3 installed packages or decisions.
- Victory event is recorded.

**Story: Run Produces Build Identity** — As a player, I can describe my run as a recognizable system build, not just a bag of items.

- Run state can classify or summarize at least 4 build identities: observability, isolation, high velocity shortcut, legacy compatibility, or security.
- Postmortem or release report includes a final architecture/build identity line based on actual state.
- Build identity calculation uses package tags, graph topology, resources, and incident history.

### Epic 8: Art, UI, And Audio

**Story: CRT Action HUD Matches Direction** — As a player, I see a haunted arcade/build-server interface that supports combat.

- HUD includes Stability, active tool, log strip, and graph minimap.
- Visual treatment includes scanline/glow style without hurting readability.
- Warning states use color plus shape/icon language.

**Story: Package Icons Communicate Category** — As a player, I can distinguish tool, security, observability, legacy, shortcut, and risk packages.

- 24 package icons exist in MVP style.
- Icons remain readable at HUD and selection sizes.
- Risky packages include visual risk marker.

**Story: State Audio Reinforces System Health** — As a player, I hear when packages install, conflicts activate, tests pass/fail, and incidents begin.

- Core SFX set exists for install, conflict, reveal, hit, death, build fail, and boss intro.
- Music or ambience changes for incident and boss states.
- Critical gameplay cues remain audible under music.

### Epic 9: Debug And Playtest Support

**Story: Designers Can Force Test States** — As a designer, I can start runs with known packages, debt, observability, incidents, and bosses.

- Debug controls can set Stability, Observability, Technical Debt.
- Debug controls can install package by id.
- Debug controls can force incident and boss selection.
- Debug output shows current graph and active effects.

**Story: Content Can Be Audited For Coherence** — As a designer, I need tooling that catches incoherent content before it enters the game.

- Content linter reports unknown tags, unknown effect verbs, missing graph roles, missing risk models, missing counterplay, and missing explanation paths.
- Content that can kill the player, block routes, alter major resources, trigger incidents, affect boss selection, or materially affect reports must register a causal trace.
- Linter can flag packages that are only stat changes or have no dependency-graph consequence.
- Linter can detect interactions that have no specific rule and no fallback tag/domain/risk rule.
- Linter can report or require content-axis metadata and rubric scores once content is mostly data-driven.
- A seeded simulation benchmark can report package pick rates, average TDR, common deaths, unmitigated conflicts, no-counterplay incidents, and dominant choices.

**Story: Playtest Data Answers MVP Questions** — As a PM, I can evaluate whether the concept is working.

- Run duration is recorded.
- Packages selected are recorded.
- Failure/victory causes are recorded.
- Post-run prompt captures player-understood cause during playtests.

---

## 6. Open Questions & Risks

Merged and deduped from `Open_Questions_And_Risks.md` and the Sprint Plan's "Current Risks" and "Parking Lot."

### 6.1 Product & Design Questions

1. **MVP platform?** Desktop is assumed. Confirm whether the prototype should target Steam-style PC, web, controller-first console, or internal demo only.
2. **How platform-heavy should side-view combat be?** Direction is side-view room combat. Open question is how much platforming belongs in combat. Conservative MVP: side-view chambers with simple platforms/jumps/drops/lanes, keeping precision platforming secondary to combat and graph decisions. (High priority.)
3. **How literal should rooms-as-services be?** Decide whether every room has a named software-component identity, or whether the graph is more abstract and rooms are mostly arcade spaces.
4. **How much graph interaction happens during combat?** Current assumption: minimap only during standard combat; fuller graph decisions between rooms or in paused overlays. Special rooms/boss phases/later levels may promote the graph to a full-screen graph-scale view (FTL-style subsystem triage). Open question: how much of that graph-scale view is interactive in MVP versus preserved as future design space.
5. **Is there meta-progression?** MVP assumes none; runs stand alone.
6. **How comedic should failure text be?** Treatment asks for dry, specific, systemic humor. Decide how far generated text goes into workplace satire versus clean game fiction.
7. **Is "morale" in MVP?** Kept out except as flavor text. Confirm.
8. **Is "security risk" in MVP?** Treated as tags/event weights, not a top-level meter. Confirm.

### 6.2 Decisions Needed Before Implementation

**High priority:**

- Confirm how platform-heavy side-view combat should be.
- Choose engine/platform (and whether the zero-build canvas prototype remains the MVP implementation or becomes a design prototype for an engine move).
- Approve MVP resource set: Stability, Observability, Technical Debt.
- Decide whether MVP graph-scale view is inspection-only, pause-based interaction, or active gameplay in select encounters.
- Approve one-floor scope and no meta-progression.

**Medium priority:**

- Choose player identity/name.
- Confirm final two MVP bosses.
- Decide package count target (revisit after Sprint 3 playtest).
- Choose postmortem tone boundaries.
- Decide whether generated war stories can be exported later.

**Low priority:**

- Naming convention for rooms and packages.
- Exact CRT intensity.
- Whether victory report includes morale/security as flavor.
- Whether external references to real ecosystems are generic or parodic.

### 6.3 Technical Risks

- **Graph complexity becomes unreadable** — players ignore the graph because it is too dense/abstract. *Mitigation:* keep MVP graph small, use stable visual hierarchy, reveal only decision-relevant edges.
- **Consequences feel arbitrary** — hidden interactions create frustration instead of "I should have known." *Mitigation:* suspected edge states, warning tags, postmortem explanations, observability upgrades.
- **Package effects become bespoke code** — every item needs custom engineering. *Mitigation:* build packages from reusable operations; reserve custom hooks for a few signature items.
- **Combat readability suffers under overlays** — logs, scanlines, graph pulses, warning banners obscure bullets/enemies. *Mitigation:* define combat-safe UI zones; reserve full-screen warnings for noninteractive or boss-phase moments.
- **Postmortem generation feels random** — generated postmortems become disconnected joke text. *Mitigation:* base every line on structured event-log facts; humor comes from phrasing and true combinations.

### 6.4 Production Risks

- **MVP tries to simulate real package management** — team spends time on correctness rather than play. *Mitigation:* use a toy dependency model tuned for stories.
- **Content load is underestimated** — packages, enemies, incidents, postmortems, icons, graph states all need content. *Mitigation:* start with the content matrix; build only the interactions needed to prove the loop.
- **Visual polish arrives before system proof** — mockups tempt a heavy art pass too early. *Mitigation:* graybox combat and graph interactions first, then CRT/arcade treatment once UI needs are known.
- **Humor becomes dated** — meme-specific jokes age quickly. *Mitigation:* systemic jokes, fake changelogs, generated postmortems, item behavior, precise technical absurdity.

### 6.5 Art & UX Risks

- **Text density** — the concept wants logs, warnings, graphs, and descriptions, which can overload the player. *Mitigation:* icons and short labels in combat; reserve longer prose for package inspection and postmortems.
- **Color-only communication** — graph states/hazards may rely too much on red/yellow/green. *Mitigation:* pair color with edge style, node shape, iconography, animation, and audio.
- **CRT effect hurts readability** — scanlines/bloom/curvature may make small UI text hard to read. *Mitigation:* make CRT treatment adjustable; keep gameplay-critical text large and high contrast.

### 6.6 Current Risks To Watch (from Sprint Plan)

- [ ] Scope expands through content count before systems are stable.
- [ ] Graph becomes readable only to the designers.
- [ ] Combat becomes secondary to overlays and text.
- [ ] Active tools become hidden stat relief instead of visible verbs.
- [ ] Reports become generic flavor instead of run-state evidence.
- [ ] Visual polish arrives before interaction states are settled.

### 6.7 Parking Lot (from Sprint Plan)

- [ ] Decide final package count after Sprint 3 playtest.
- [ ] Decide whether body-scale hallway traversal ever earns implementation.
- [ ] Decide whether graph-scale view becomes active play during boss or remains pause/inspection for MVP.
- [ ] Decide engine/platform before production art dependencies become expensive.
