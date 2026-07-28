# Dependency Hell MVP Product Plan

## 1. MVP Goal

Prove that a real-time room-based roguelite can use a live dependency graph as its central source of power, risk, humor, and run identity.

The MVP should answer these product questions:

1. Do players understand that packages change both combat and graph state?
2. Do graph mutations create funny, legible, non-arbitrary consequences?
3. Does generated postmortem/release reporting make players want another run?
4. Do runs produce Cogmind-inspired system depth: readable machine logic, procedural complexity, and emergent build identity?
5. Do route, upgrade, and event choices create Slay the Spire-inspired risk evaluation and build-shaping pressure where appropriate?
6. Do players feel the Papers, Please-inspired pressure of absurd process and earlier approvals compounding over time?

## 2. Target MVP Scope

Included:

- One playable character: The Resolver.
- One floor: Release Candidate Pipeline.
- Side-view room combat, with roguelite room progression and graph-driven route/state decisions.
- 10 to 14 rooms per run.
- 8 room types implemented at MVP quality.
- 24 packages/items.
- 10 enemy types.
- 2 adaptive bosses.
- 3 core resources: Stability, Observability, Technical Debt.
- Simple dependency graph with 7 edge types.
- Package choice overlay.
- Graph minimap and pause graph view.
- Generated postmortem on failure.
- Generated release report on victory.
- CRT/terminal-inspired visual style matching the mockups.
- Basic adaptive music and state-driven sound cues.

Deferred:

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

## 3. MVP Success Metrics

Playtest comprehension:

- 80 percent of testers can explain what Stability, Observability, and Technical Debt do after one run.
- 70 percent of testers can identify at least one earlier choice that caused a later problem.
- 70 percent of testers understand why the selected boss appeared.

Engagement:

- Median first run length: 12 to 25 minutes.
- At least 60 percent of testers start a second run after a failure.
- At least 50 percent of testers voluntarily read the postmortem details.

Design quality:

- At least 3 distinct build archetypes emerge from playtests.
- At least 70 percent of testers can describe their run's build identity without simply listing item names.
- At least 60 percent of testers can explain one system consequence using visible graph logic, event history, or postmortem details.
- At least 60 percent of testers can describe why they chose one route, package, or event resolution over a plausible alternative.
- At least 2 route or event choices per run present distinct risk/reward profiles.
- At least 2 accepted risks, waivers, approvals, skipped validations, or similar process decisions can return as later consequences.
- At least 50 percent of testers notice and understand one bureaucratic/process consequence in the postmortem or release report.
- No single package is picked over 80 percent of the time when offered.
- At least 6 package interactions produce recognizable stories.

Readability:

- Combat deaths should usually be attributed to enemy/projectile/hazard readability, not hidden graph math.
- Graph UI should support a decision within 10 to 20 seconds during package selection.

## 4. Recommended Milestones

### Milestone 0: Alignment

Duration: 1 week.

Deliverables:

- Approved MVP docs.
- Initial backlog.
- Engine/platform choice.
- Input scheme target.
- Art pipeline decision.
- Prototype risk list.

Exit criteria:

- Team agrees on the one-floor MVP and deferred scope.
- Package/graph system is accepted as the main prototype risk.

### Milestone 1: Combat Graybox

Duration: 2 to 3 weeks.

Deliverables:

- Player movement, aiming, firing, dash/evade.
- 3 enemy types.
- 5 room layouts.
- Stability damage/death.
- Basic room clear rewards.

Exit criteria:

- Combat is readable and mildly fun before graph complexity is added.

### First Playable Slice

Before building the full MVP, target a very small playable slice that proves the heart of the game without requiring full content.

Slice contents:

- 3 connected side-view rooms.
- 1 package choice with 3 options.
- 1 visible dependency graph with 5 to 7 nodes.
- 1 hidden or suspected conflict revealed by Observability.
- 1 Technical Debt increase.
- 1 incident or consequence caused by the package choice.
- 1 generated mini-postmortem if the player fails.

Slice success criteria:

- A tester can explain how their package choice changed the graph.
- A tester can identify one later consequence caused by that choice.
- The graph feels like gameplay information, not only decoration.
- Combat remains readable with the HUD and minimap active.

### Milestone 2: Graph Prototype

Duration: 3 to 4 weeks.

Deliverables:

- Runtime dependency graph model.
- Package selection with graph preview.
- 12 packages.
- 5 edge types.
- Observability visibility states.
- Technical Debt thresholds.
- Graph minimap and pause graph.

Exit criteria:

- Package choices create consequences in later rooms.
- Players can predict at least some risk from graph state.

### Milestone 3: Run Structure

Duration: 3 to 4 weeks.

Deliverables:

- Procedural one-floor room graph.
- 8 room types.
- 10 enemy types.
- 24 packages.
- 4 run events.
- One boss.
- Failure postmortem v1.

Exit criteria:

- Full run from start to failure is possible.
- Postmortem uses real run events.

### Milestone 4: MVP Content Complete

Duration: 3 to 4 weeks.

Deliverables:

- Second boss.
- Release report.
- Final package list.
- Final room/event list.
- First-pass art for all required assets.
- First-pass audio and music layers.
- Balance pass.

Exit criteria:

- Full run from start to victory or failure is possible.
- Boss selection responds to graph state.

### Milestone 5: MVP Polish And Playtest

Duration: 2 to 3 weeks.

Deliverables:

- UI readability pass.
- Combat telegraph pass.
- Text/humor pass.
- Accessibility pass for color/icon redundancy.
- Bug fixing.
- 10 to 20 external playtests.
- MVP findings report.

Exit criteria:

- Product questions can be answered with playtest evidence.

## 5. Team Needs

Minimum team:

- 1 game designer/systems designer.
- 1 gameplay engineer.
- 1 UI/technical gameplay engineer.
- 1 artist/animator with UI comfort.
- 1 audio designer/composer part-time.
- 1 producer/PM.
- 1 writer/narrative designer part-time for postmortem and item text.

Nice to have:

- Technical advisor with SRE/package ecosystem experience.
- QA/playtest coordinator.

## 6. Backlog Epics

Design:

- Core combat.
- Dependency graph rules.
- Package content.
- Enemy and boss behavior.
- Run events.
- Postmortem/release report templates.
- Balance and tuning.

Engineering:

- Player controller.
- Room generation and traversal.
- Combat entities.
- Graph simulation.
- Package effect framework.
- Visibility/observability system.
- UI overlays.
- Save/run state.
- Postmortem generation.
- Telemetry hooks for playtest.

Art:

- Visual style guide.
- Player/enemy/boss sprites.
- Package icons.
- Room backdrops.
- Graph visual language.
- HUD and postmortem screens.
- Effects: conflict arcs, infection spread, build failure, install, rollback.

Audio:

- Core SFX.
- UI/terminal feedback.
- Incident/boss warning cues.
- Adaptive music layers.

Production:

- Backlog ownership.
- Milestone tracking.
- Playtest recruiting.
- Scope control.
- Risk review.

## 7. Scope Guardrails

Protect:

- Graph-driven consequences.
- Readable real-time combat.
- Funny, specific postmortems.
- CRT/terminal presentation.

Cut first if behind:

- Extra room types beyond 8.
- Extra package count beyond 24.
- Second art variant per enemy.
- Optional side room rewards.
- Advanced adaptive music.
- Complex generated prose variation.

Do not cut for MVP:

- Observability affecting hidden information.
- Technical Debt affecting events or boss behavior.
- At least one adaptive boss.
- Failure postmortem tied to real run state.
- Package choices with graph preview.
- Emergent build identity from package, graph, incident, and resource interactions.
- Readable machine logic for major consequences.
- At least basic strategic route or event choices with visible tradeoffs.
- At least one process/bureaucracy consequence chain from approval or accepted risk to later incident, blocker, or postmortem line.

## 8. Platform Assumptions

MVP target:

- Desktop first.
- 16:9 base layout, matching 1408x768 mockup framing.
- Keyboard/mouse and controller.

Camera assumption:

- Side-view encounter rooms are the MVP direction.
- "Room-based" means discrete combat chambers and route choices, not a mandatory top-down presentation.
- The dependency graph is the structural map underneath the visible room layout.
- Full-screen graph-scale views are permitted for pauses, special rooms, boss phases, postmortems, or later levels. The side-view camera is the MVP default, not a permanent creative constraint.
- The graph-scale view is also where the FTL-style promise can live: subsystem triage, pausable panic, cascading failures, and deciding which failure to address first.

Engine assumption:

- Any engine with strong 2D support, data-driven content, and fast UI iteration is acceptable.
- Unity, Godot, or a custom web/canvas prototype could all work, but the final choice should prioritize graph UI iteration and real-time combat feel.

## 9. Playtest Plan

Internal weekly playtest:

- Can players read combat?
- Do package choices feel interesting?
- Did any failure feel arbitrary?
- Did postmortem explain the run?

External MVP playtest:

- 10 technical players.
- 10 general roguelite players.
- Capture first-run comprehension, second-run intent, and confusion points.

Suggested playtest prompts:

- "What do you think caused your failure?"
- "Which package choice felt most dangerous?"
- "What did Observability change for you?"
- "Did the graph help you make a decision?"
- "What part felt funny because it was true?"

## 10. Definition Of Done

MVP is done when:

- Runs can be completed or failed without developer intervention.
- Core resources and graph state persist through the run.
- Package, enemy, event, and boss content is loaded from data or easily tunable definitions.
- The game can generate a postmortem and release report from recorded run events.
- The mockup-inspired visual identity is represented in-game.
- Playtest results answer the MVP product questions.
