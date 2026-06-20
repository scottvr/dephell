# Dependency Hell MVP Starter Backlog

This backlog translates the MVP docs into implementation-ready work. It is not a final sprint plan; it is a starting point for estimation and ownership.

## Epic 1: Combat Graybox

### Story: Player Can Move And Fight

As a player, I can move, aim, fire Patch projectiles, and evade so that combat feels readable before graph systems are added.

Acceptance criteria:

- Player can move, jump/drop where supported, and navigate side-view encounter rooms.
- Player can aim and fire continuously.
- Player has one evade/dash action with cooldown.
- Player takes Stability damage from enemies.
- Player death ends the run and records a failure event.

### Story: Combat Room Can Be Cleared

As a player, I can enter a combat room, defeat enemies, and receive a reward choice.

Acceptance criteria:

- Room locks while enemies are alive.
- Room unlocks after enemies are defeated.
- Clear event is recorded.
- Reward flow can open after clear.
- At least 3 graybox room layouts exist.

### Story: Enemy Families Work In Graybox

As a designer, I can spawn early enemy families to test combat readability.

Acceptance criteria:

- Regression, Breaking Change, and Memory Leak exist in graybox form.
- Each has a distinct movement or attack rule.
- Each has a visible telegraph before damaging the player.

## Epic 2: Run State And Event Log

### Story: Run State Tracks Core Values

As a developer, I need a central run-state object so combat, graph, UI, and postmortem systems share the same truth.

Acceptance criteria:

- Run state stores Stability, Observability, Technical Debt, installed packages, current room, dependency graph, active incidents, and seed.
- Run state can be dumped for debugging.
- Run state can be reset to start a new run.

### Story: Event Log Records Meaningful Facts

As a designer, I need run events recorded so postmortems can be specific.

Acceptance criteria:

- Package installs, graph changes, incidents, boss selection, rollback events, and run end events are logged.
- Events include timestamp/order and relevant ids.
- Logs are accessible to postmortem generation and debug UI.

## Epic 3: Dependency Graph

### Story: Route Choices Have Strategic Tradeoffs

As a player, I can choose between routes that imply different risks and rewards.

Acceptance criteria:

- A run includes at least 2 route or event-path choices with distinct risk/reward profiles.
- Route preview communicates room type, likely reward, and at least one visible or suspected risk.
- Observability improves route preview detail.
- At least one route choice can affect package pool, Technical Debt, Observability, incident weights, or boss risk score.

### Story: Graph Stores Nodes And Edges

As a developer, I can add packages and relations to a dependency graph.

Acceptance criteria:

- Nodes support id, name, category, tags, visible properties, hidden properties.
- Edges support source, target, relation, strength, visibility, active state.
- Supported MVP relations: requires, conflicts, patches, isolates, observes, pins, infects.

### Story: Observability Controls Visibility

As a player, I see more accurate graph information when Observability is higher.

Acceptance criteria:

- Known, suspected, and hidden states render differently.
- Raising Observability reveals at least one hidden or suspected property.
- Package selection preview respects current Observability.

### Story: Graph Minimap Shows Risk

As a player, I can glance at the minimap to understand graph health.

Acceptance criteria:

- Minimap displays node/edge structure at low detail.
- Active hazards pulse or highlight.
- Current package preview highlights affected nodes.
- Minimap does not block combat readability.

### Story: Major Consequences Are Traceable

As a player, I can understand why a major conflict, incident, or boss attack happened.

Acceptance criteria:

- At least 3 major consequence types expose their cause through graph state, logs, or postmortem text.
- Hidden causes become explainable after observability reveal, incident resolution, or failure.
- Debug output can trace each major consequence to source nodes, edges, packages, or debt tags.

## Epic 4: Packages And Upgrades

### Story: Package Choice Presents Tradeoffs

As a player, I choose one of three packages and understand the immediate benefit plus visible risk.

Acceptance criteria:

- Package overlay shows name, icon, benefit, risk tags, and graph preview.
- Player can confirm or cancel before installing.
- Installed package mutates player stats and graph state.
- At least 8 MVP packages have a clear build-shaping tradeoff rather than a purely positive stat increase.
- At least 4 package offers create a plausible choice between short-term power and long-term system risk.

### Story: Packages Are Data-Driven

As a designer, I can tune package content without engineering every item separately.

Acceptance criteria:

- At least 12 initial packages use reusable effect operations.
- Package data can modify stats, add nodes, add edges, change debt, reveal graph state, and add event weights.
- At least 3 package interactions produce visible consequences.

## Epic 5: Technical Debt And Incidents

### Story: Technical Debt Changes Run Pressure

As a player, shortcuts make the system riskier over time.

Acceptance criteria:

- Technical Debt increases from at least 5 package/effect sources.
- Threshold bands change event weights or room hazards.
- UI communicates current debt state without lengthy explanation.

### Story: Process Approvals Can Return Later

As a player, I can accept a waiver, approval, skipped validation, or process exception that helps now but may complicate the run later.

Acceptance criteria:

- At least 3 process decision types exist: accepted risk, skipped validation, security exception, change freeze waiver, vendor approval, or documentation signoff.
- Process decisions are recorded in the event log with target, reason, and relevant tags.
- At least 2 later consequences can query process decisions: audit pressure, blocked rollback, forced patch, boss modifier, incident weight, or postmortem contributing factor.
- UI text presents these choices with dry bureaucratic tone without requiring long reading during combat.

### Story: Incidents Trigger From Graph State

As a player, incidents feel connected to earlier decisions.

Acceptance criteria:

- Critical CVE, Build Failure, and Dependency Unpublish exist.
- Incident trigger weights read graph tags and debt.
- Each incident offers at least 2 resolution paths.
- Incident outcome is recorded in event log.

## Epic 6: Boss And Run Completion

### Story: Boss Selection Responds To Architecture

As a player, the boss reflects the system I built.

Acceptance criteria:

- Boss risk scores update during the run.
- Boss room selects The Major Version Upgrade or The Distributed Monolith based on risk scores.
- Boss intro names the relevant architectural cause.

### Story: Boss Fight Uses Graph Attacks

As a player, I fight a boss that attacks through dependency graph concepts.

Acceptance criteria:

- At least one boss attacks along graph edges.
- Graph attack has clear telegraph.
- Player tools can counter or reduce at least one graph attack.
- Defeating boss ends in release report.

## Epic 7: Postmortem And Release Report

### Story: Failure Generates Postmortem

As a player, losing produces a funny, specific summary of what went wrong.

Acceptance criteria:

- Postmortem includes incident title, primary cause, contributing factors, what went well, action items, and timeline.
- At least 80 percent of nouns in the postmortem come from actual run state.
- Timeline includes 3 to 5 logged events.

### Story: Victory Generates Release Report

As a player, winning produces a release report that reflects the final architecture.

Acceptance criteria:

- Report includes shipped version, customer impact, known issues, risk/debt summary, and final architecture line.
- Report names at least 3 installed packages or decisions.
- Victory event is recorded.

### Story: Run Produces Build Identity

As a player, I can describe my run as a recognizable system build, not just a bag of items.

Acceptance criteria:

- Run state can classify or summarize at least 4 build identities: observability, isolation, high velocity shortcut, legacy compatibility, or security.
- Postmortem or release report includes a final architecture/build identity line based on actual state.
- Build identity calculation uses package tags, graph topology, resources, and incident history.

## Epic 8: Art, UI, And Audio

### Story: CRT Action HUD Matches Direction

As a player, I see a haunted arcade/build-server interface that supports combat.

Acceptance criteria:

- HUD includes Stability, active tool, log strip, and graph minimap.
- Visual treatment includes scanline/glow style without hurting readability.
- Warning states use color plus shape/icon language.

### Story: Package Icons Communicate Category

As a player, I can distinguish tool, security, observability, legacy, shortcut, and risk packages.

Acceptance criteria:

- 24 package icons exist in MVP style.
- Icons remain readable at HUD and selection sizes.
- Risky packages include visual risk marker.

### Story: State Audio Reinforces System Health

As a player, I hear when packages install, conflicts activate, tests pass/fail, and incidents begin.

Acceptance criteria:

- Core SFX set exists for install, conflict, reveal, hit, death, build fail, and boss intro.
- Music or ambience changes for incident and boss states.
- Critical gameplay cues remain audible under music.

## Epic 9: Debug And Playtest Support

### Story: Designers Can Force Test States

As a designer, I can start runs with known packages, debt, observability, incidents, and bosses.

Acceptance criteria:

- Debug controls can set Stability, Observability, Technical Debt.
- Debug controls can install package by id.
- Debug controls can force incident and boss selection.
- Debug output shows current graph and active effects.

### Story: Content Can Be Audited For Coherence

As a designer, I need tooling that catches incoherent content before it enters the game.

Acceptance criteria:

- Content linter reports unknown tags, unknown effect verbs, missing graph roles, missing risk models, missing counterplay, and missing explanation paths.
- Content that can kill the player, block routes, alter major resources, trigger incidents, affect boss selection, or materially affect reports must register a causal trace.
- Linter can flag packages that are only stat changes or have no dependency-graph consequence.
- Linter can detect interactions that have no specific rule and no fallback tag/domain/risk rule.
- Linter can report or require content-axis metadata and rubric scores once content is mostly data-driven.
- A seeded simulation benchmark can report package pick rates, average TDR, common deaths, unmitigated conflicts, no-counterplay incidents, and dominant choices.

### Story: Playtest Data Answers MVP Questions

As a PM, I can evaluate whether the concept is working.

Acceptance criteria:

- Run duration is recorded.
- Packages selected are recorded.
- Failure/victory causes are recorded.
- Post-run prompt captures player-understood cause during playtests.
