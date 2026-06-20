# Dependency Hell MVP Sprint Plan

This is the working delivery plan for moving from validated first slice to MVP. It turns the existing product/design docs into small, checkable work packets. Keep this file current as the source of "what are we doing next?"

## Branch And Cadence

- MVP branch: `mvp`
- Default sprint length: 1 week while solo/small-team prototyping; switch to 2 weeks if coordination overhead rises.
- Sprint review artifact: a playable build plus this file updated with checked boxes and carryover notes.
- Sprint planning rule: pull from the next sprint only after current sprint exit criteria are true or explicitly deferred.

## MVP North Star

Build one complete Release Candidate Pipeline run where combat, package choices, graph traversal, graph mutations, incidents, boss behavior, postmortem, and release report all read from shared run state.

The prototype already proved the core bet: the dependency graph can be both map and consequence engine. MVP work should now expand breadth, readability, presentation, and replayability without losing that cause/effect spine.

## Scope Targets

- [ ] 10 to 14 rooms per run.
- [ ] 8 room types.
- [ ] 24 packages/items/tools.
- [ ] 10 enemy types.
- [ ] 4 run events/incidents.
- [ ] 2 adaptive bosses.
- [ ] 7 graph edge types.
- [ ] Generated failure postmortem and victory release report.
- [ ] CRT/terminal visual identity represented in playable form.
- [ ] Basic adaptive audio and state-driven sound cues.

## Non-Negotiable Design Gates

- [ ] Every package/tool changes what the player can do or reason about.
- [ ] Every major graph mutation can create, reveal, block, or reinterpret a later consequence.
- [ ] Every major consequence is traceable through graph state, event logs, report text, or inspection UI.
- [ ] Combat remains readable before extra UI spectacle is added.
- [ ] Route choices and package choices present visible tradeoffs rather than flat upgrades.
- [ ] Process/bureaucracy choices can return later as incident pressure, blocked rollback, boss modifier, or report detail.
- [ ] Absurdity is allowed only when its cause is traceable.
- [ ] Content follows the coherence model in `docs/Content_Coherence_Model.md`.

## Sprint 0: MVP Kickoff And Prototype Lock

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

## Sprint 1: Run Structure And Data Spine

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

## Sprint 2: Combat And Room Variety

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

## Sprint 3: Graph And Package Expansion

Goal: turn package selection into the MVP's main build-shaping system.

- [ ] Expand reusable effect operations: pin, isolate, disable, reveal node, reveal edge, add event weight, add boss score, add approval, add active tool.
- [ ] Support 7 MVP edge relations: requires, conflicts, patches, isolates, observes, pins, infects.
- [ ] Expand packages/items/tools to 12.
- [ ] Draft full 24-package MVP list with design-gate notes.
- [ ] Draft initial tag ontology and compatibility rules from `docs/Content_Coherence_Model.md`.
- [ ] Add at least 3 active tools or packages that create new verbs.
- [ ] Add at least 6 package interactions that produce recognizable stories.
- [ ] Define fallback interaction hierarchy: specific pair rule, specific tag rule, generic domain rule, generic risk rule, no interaction.
- [ ] Add graph diff text to Graph Trace/package preview.
- [ ] Make Observability affect route/package/incident preview specificity.

Exit criteria:

- [ ] A tester can explain at least one package -> graph -> later consequence chain.
- [ ] No package is merely a positive stat increase.
- [ ] Package previews support a decision within 10 to 20 seconds.

## Sprint 4: Incidents, Process Pressure, And Reports

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

## Sprint 5: Bosses And Full Run Completion

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

## Sprint 6: Art, UI, And Audio First Pass

Goal: lift the MVP from readable graybox to mockup-aligned presentation while protecting combat clarity.

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

## Sprint 7: Playtest, Balance, And MVP Cut

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

## Current Risks To Watch

- [ ] Scope expands through content count before systems are stable.
- [ ] Graph becomes readable only to the designers.
- [ ] Combat becomes secondary to overlays and text.
- [ ] Active tools become hidden stat relief instead of visible verbs.
- [ ] Reports become generic flavor instead of run-state evidence.
- [ ] Visual polish arrives before interaction states are settled.

## Parking Lot

- [ ] Decide final package count after Sprint 3 playtest.
- [ ] Decide whether body-scale hallway traversal ever earns implementation.
- [ ] Decide whether graph-scale view becomes active play during boss or remains pause/inspection for MVP.
- [ ] Decide engine/platform before production art dependencies become expensive.
