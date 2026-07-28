# Dependency Hell — Roadmap

This is the single canonical planning document for Dependency Hell: what we are building and what is next. It merges and supersedes four earlier docs (`MVP_Product_Plan.md`, `MVP_Sprint_Plan.md`, `MVP_Starter_Backlog.md`, `Open_Questions_And_Risks.md`), which remain in `docs/archived/` for history. Where those docs restated the same scope numbers, this roadmap states each target once (see [Section 2](#2-mvp-scope-targets)); other sections cross-link here rather than repeat them.

> **Branch note:** The original plan referenced the MVP branch `mvp`. The current active working branch is **`mvp-uiux-overhaul`**. Treat `mvp-uiux-overhaul` as the live branch; historical references to `mvp` below (e.g. Sprint 0 tasks) are preserved verbatim as authored.

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

The MVP is **one playable character (The Resolver)** on **one floor (the Release Candidate Pipeline)**, side-view room combat with roguelite room progression and graph-driven route/state decisions.

**"First Slice"** below refers to what is already implemented in the current zero-build canvas prototype (see [Ground Truth](#current-ground-truth--what-is-implemented)).

| Target | MVP goal | Current First Slice status |
|---|---|---|
| Rooms per run | 10 to 14 | Not met — single fixed 5-room pipeline, no procedural gen |
| Room types | 8 | Not met — no distinct room-type breadth yet |
| Packages/items/tools | 24 | Partially met — 4 packages implemented; Feature Flag active tool present |
| Enemy types | 10 | Partially met — 3 enemies implemented |
| Run events/incidents | 4 | Partially met — 3 incidents (Build Failure, Audit Pressure, Minor Regression) |
| Adaptive bosses | 2 | Not met — no bosses yet |
| Core resources | Stability, Observability, Technical Debt | **Met** — all 3 implemented |
| Graph edge types | 7 (requires, conflicts, patches, isolates, observes, pins, infects) | Partially met — graph-as-map traversal exists; full 7-relation set not implemented |
| Dependency graph as map/consequence engine | Graph traversal + mutation + preview | **Met** — graph-as-map traversal, package choice overlay with live mutation preview, graph inspector, Verification Fork branch |
| Package choice overlay | With live graph preview | **Met** |
| Graph minimap and pause graph view | Required | Partially met — graph inspector / graph-as-map present |
| Generated failure postmortem | Required | **Met** — Mini Postmortem on loss |
| Generated victory release report | Required | **Met** — Release Report on win |
| CRT/terminal visual identity | Represented in playable form | **Met** — CRT visuals in place |
| Basic adaptive audio and state-driven sound cues | Required | Not met — no audio yet |

### Current Ground Truth — What Is Implemented

Implemented in the current prototype:

- Single fixed 5-room pipeline (no procedural generation).
- 4 packages.
- 3 enemies.
- 3 resources: Stability, Observability, Technical Debt.
- Graph-as-map traversal.
- Package choice overlay with live mutation preview.
- Verification Fork branch.
- 3 incidents: Build Failure, Audit Pressure, Minor Regression.
- Feature Flag active tool.
- Graph inspector.
- Win Release Report / lose Mini Postmortem.
- CRT visuals.

**Not built yet:** procedural generation, bosses, audio, and most of the 24-package / 10-enemy / 8-room-type breadth.

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

This is the working delivery plan for moving from validated first slice to MVP. Keep this section current as the source of "what are we doing next?" Checkbox states are preserved verbatim from `MVP_Sprint_Plan.md`.

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
- [ ] Commit current prototype baseline on `mvp`.
- [ ] Tag the last prototype baseline if needed.
- [ ] Add a short "how to run/playtest" section to README or docs index.
- [ ] Decide whether the zero-build canvas prototype remains the MVP implementation or becomes a design prototype for an engine move.

Exit criteria:

- [ ] Branch exists and current working state is committed.
- [ ] Docs clearly identify MVP scope, sprints, and current prototype status.
- [ ] First-slice playtest prompts cover graph routes, package choice, Feature Flag, and reports.

### Sprint 1: Run Structure And Data Spine

Goal: replace hand-authored linear progression with a reusable one-floor run structure while preserving the current playable slice.

- [ ] Define room schema for type, graph locus, exits, reward, incident hooks, layout id, enemy budget, and tags.
- [ ] Define route schema for target, graph edge, known risk, suspected risk, reward preview, and lock state.
- [ ] Add seeded run creation.
- [ ] Generate a one-floor graph with 10 to 14 visitable loci.
- [ ] Support at least 2 route choices per run with distinct risk/reward profiles.
- [ ] Add debug display for current seed, room id, graph locus, installed packages, active incident, and boss scores.
- [ ] Make package offers data-driven by pool, tags, and room/event context.
- [ ] Preserve direct static-file launch from `index.html` unless an engine/tooling decision changes.

Exit criteria:

- [ ] A full generated route can be played from start to provisional end.
- [ ] At least one route choice affects package pool, debt, observability, incident likelihood, or boss risk.
- [ ] Run state can be inspected well enough to debug any room transition.

### Sprint 2: Combat And Room Variety

Goal: make the longer run mechanically tolerable before adding lots of systems pressure.

- [ ] Add room layout data and at least 5 distinct graybox layouts.
- [ ] Add room hazards tied to graph/process concepts.
- [ ] Expand enemies from 3 to 6 types.
- [ ] Give each enemy a distinct silhouette, movement rule, and telegraph.
- [ ] Add one elite or modifier variant driven by graph state.
- [ ] Add active-tool HUD state and cooldown/readiness display.
- [ ] Tune Stability damage and recovery for 12 to 25 minute runs.
- [ ] Add keyboard/controller input mapping plan.

Exit criteria:

- [ ] A 10-room run is readable and mildly fun with placeholder art.
- [ ] Testers can identify what hit them most of the time.
- [ ] At least 3 room layouts create different combat movement decisions.

### Sprint 3: Graph And Package Expansion

Goal: turn package selection into the MVP's main build-shaping system.

- [ ] Expand reusable effect operations: pin, isolate, disable, reveal node, reveal edge, add event weight, add boss score, add approval, add active tool.
- [ ] Support 7 MVP edge relations: requires, conflicts, patches, isolates, observes, pins, infects.
- [ ] Expand packages/items/tools to 12.
- [ ] Draft full 24-package MVP list with design-gate notes.
- [ ] Draft initial tag ontology and compatibility rules from `docs/content-authoring.md`.
- [ ] Add primary-axis and secondary-axis fields to package/tool/room/enemy drafts where useful.
- [ ] Add at least 3 active tools or packages that create new verbs.
- [ ] Add at least 6 package interactions that produce recognizable stories.
- [ ] Define fallback interaction hierarchy: specific pair rule, specific tag rule, generic domain rule, generic risk rule, no interaction.
- [ ] Add graph diff text to Graph Trace/package preview.
- [ ] Make Observability affect route/package/incident preview specificity.

Exit criteria:

- [ ] A tester can explain at least one package -> graph -> later consequence chain.
- [ ] No package is merely a positive stat increase.
- [ ] Package previews support a decision within 10 to 20 seconds.

### Sprint 4: Incidents, Process Pressure, And Reports

Goal: make failures and successes feel authored by the run state rather than generic.

- [ ] Implement 4 run events/incidents: Build Failure, Audit Pressure, Critical CVE, Dependency Unpublish.
- [ ] Give each incident at least 2 resolution paths or mitigations.
- [ ] Add process decisions: security exception, skipped validation, accepted risk, change-freeze waiver, or vendor approval.
- [ ] Make at least 2 later consequences query process decisions.
- [ ] Expand postmortem templates with primary cause, contributing factors, what went well, action items, and timeline.
- [ ] Expand release report with shipped version, customer impact, known issues, final architecture, and cleanup notes.
- [ ] Improve build identity calculation from package tags, graph topology, resources, incidents, and decisions.
- [ ] Add report details for active tools such as Feature Flag and future Circuit Breaker/Canary.
- [ ] Enforce causal trace policy for fatal damage, route blocking, major resource changes, incidents, boss selection, and report material.

Exit criteria:

- [ ] Failure reports name actual run facts and feel specific.
- [ ] Victory reports use release language, not failure/postmortem language.
- [ ] At least 3 major consequence types are traceable.
- [ ] Every player-killing or run-ending outcome has an event-log or run-state explanation path.

### Sprint 5: Bosses And Full Run Completion

Goal: deliver the MVP arc from first room through adaptive boss and report.

- [ ] Implement boss risk score model.
- [ ] Add The Major Version Upgrade boss.
- [ ] Add The Distributed Monolith boss.
- [ ] Make boss selection respond to accumulated graph state.
- [ ] Add at least one boss attack that travels through graph edges.
- [ ] Allow at least one player tool/package to counter or reduce a graph attack.
- [ ] Add boss intro copy that names the relevant architectural cause.
- [ ] Wire victory release report from boss defeat.

Exit criteria:

- [ ] Full run can end in failure or victory without developer intervention.
- [ ] Boss feels connected to the architecture the player built.
- [ ] Release report reflects final architecture and meaningful decisions.

### Sprint 6: Art, UI, And Audio First Pass

Goal: lift the MVP from readable graybox to mockup-aligned presentation while protecting combat clarity.

- [ ] Prototype current-slice graph readability pass: edge/state legend, package-choice graph previews, graph-scale inspection hierarchy, and restrained CRT/arcade treatment.
- [ ] Define visual style guide for CRT glow, node/edge states, package categories, hazard states, and report screens.
- [ ] Add first-pass player sprite/animation.
- [ ] Add first-pass enemy sprites for 10 enemy types.
- [ ] Add first-pass boss visuals for 2 bosses.
- [ ] Add package icons for 24 packages.
- [ ] Add room backdrop set for 8 room types.
- [ ] Add graph failure effects: conflict arcs, infection spread, build failure pulse, install pulse, rollback/flag/circuit effects.
- [ ] Add core SFX: install, conflict, reveal, hit, death, build fail, route select, graph inspect, boss intro.
- [ ] Add incident and boss music/ambience states.
- [ ] Run accessibility pass for color plus shape/icon redundancy.

Exit criteria:

- [ ] Mockup-inspired identity is visible in-game.
- [ ] UI and effects do not obscure combat.
- [ ] Critical gameplay cues are visible and audible.

### Sprint 7: Playtest, Balance, And MVP Cut

Goal: answer the MVP product questions with evidence and cut scope aggressively where needed.

- [ ] Add a content linter for unknown tags, unknown effect verbs, missing graph effects, missing risks, missing counterplay, and missing explanation paths.
- [ ] Add a pre-commit hook or documented check command for the content linter once content is mostly data-driven.
- [ ] Add a seeded run simulation benchmark that repeatedly chooses routes/packages, applies effects, rolls incidents, applies mitigations, and records outcomes.
- [ ] Generate balance reports: package pick rate, average TDR by act, most common deaths, unmitigated conflicts, no-counterplay incidents, and dominant packages.
- [ ] Add run telemetry or structured playtest notes for duration, packages selected, route choices, failure/victory cause, and second-run intent.
- [ ] Run 5 internal playtests.
- [ ] Run 10 technical-player external playtests.
- [ ] Run 10 general roguelite-player external playtests.
- [ ] Balance package offer rates so no single package dominates.
- [ ] Balance enemy damage, room length, recovery, and incident pressure.
- [ ] Perform text/humor pass on packages, incidents, bosses, reports, and logs.
- [ ] Fix major bugs and confusing UI states.
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
