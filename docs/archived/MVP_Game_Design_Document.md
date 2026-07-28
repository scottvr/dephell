# Dependency Hell MVP Game Design Document

## 1. Product Identity

Dependency Hell is an action roguelite about trying to ship one more release from inside a living software architecture.

The player clears real-time combat rooms, selects packages and patches, and watches those choices mutate a dependency graph. The graph is both map and antagonist. Every useful upgrade can introduce coupling, conflict, debt, hidden requirements, or future incidents.

Visual framing:

The MVP should use side-view room combat, as shown in the gameplay mockups. "Room-based" refers to the roguelite structure: discrete encounter spaces, branching route choices, room rewards, and boss gates. It does not require a top-down camera. The side-view spaces can read as service chambers, catacombs, build stages, terminal panes, or arcade-cabinet anterooms, while the dependency graph provides the true topology underneath.

This gives the game two maps at once:

- The visible room layout: where the avatar fights, jumps, dodges, and clears encounters.
- The dependency graph: why rooms relate, what packages connect, and where systemic failure spreads.

The design should exploit the visual rhyme between dungeon maps, terminal minimaps, and dependency graphs, but the player should always understand which layer they are acting on.

The default MVP camera is side-view, but the game should not be conceptually locked to one camera forever. The dependency graph can become the primary full-screen play space in special rooms, pauses, boss phases, postmortems, or later levels. Treat this as a "graph-scale view": the analog to a bird's-eye dungeon map, except the map is the software architecture itself. In graph-scale view, the player may inspect, route, patch, isolate, or fight failures at the system layer instead of controlling the avatar inside a side-view chamber.

The FTL comparison is especially relevant here. Graph-scale view should be allowed to become the game's subsystem-triage layer: pausable or slowed panic, cascading failures, limited attention, and choices about which failing node, edge, service, or package to save first. It is not merely a larger decorative minimap.

For MVP, graph-scale view can begin as pause/between-room interaction. Designers should preserve the option to promote it into active gameplay once the graph rules are proven.

MVP target experience:

- A 20 to 30 minute run.
- One playable character.
- One floor themed around a release candidate moving from Local Development into CI/Staging.
- A compact but expressive dependency graph.
- Combat that is readable without software knowledge.
- Consequences that feel authentic to technical players.
- Generated postmortem or release report that summarizes the run from actual state.

## 2. Design Pillars

1. Every power has a shadow.
No upgrade should be universally correct. Even the strongest item should add complexity, coupling, time cost, risk, or hidden state.

2. The graph is the monster.
Enemies create pressure, but the dependency graph is the persistent source of run identity and long-term danger.

3. Failure is funny and informative.
Losing should produce a postmortem that makes the player laugh and understand which earlier choices mattered.

4. The player builds their own doom.
The strongest stories come from reasonable decisions that later interact badly.

5. Real enough to sting, abstract enough to play.
The game evokes package management, incident response, and architecture entropy through arcade rules, not literal simulation.

6. Competence is the reward.
The best feeling is understanding the system well enough to save it just in time.

## 3. Influence Translation

The cited genre influences are not cloning targets. They are design promises to preserve while finding the right shape for Dependency Hell.

### Cogmind-Inspired Requirements

Cogmind is a reference point for deep systems interactions, readable machine logic, procedural complexity, and emergent build identity. These are required outcomes for the MVP.

Deep systems interactions:

- Packages, enemies, incidents, resources, and graph edges must interact through shared rules rather than isolated one-off scripts.
- A package should matter in more than one context: combat, graph state, incident likelihood, boss behavior, or postmortem.
- The most interesting outcomes should come from combinations the player can learn, not from opaque random events.

Readable machine logic:

- System behavior should feel mechanical, inspectable, and fair.
- When a conflict spreads, an enemy mutates, or a boss targets an edge, the player should be able to trace the cause through visible or discoverable graph state.
- Hidden information is allowed, but once revealed it should make the system more understandable, not less.

Procedural complexity:

- Runs should vary through graph shape, package offers, hidden relations, incidents, room order, and boss mutations.
- Procedural output should create different problems to reason about, not just different layouts.
- The generator should produce legible architectures with recognizable pressure points.

Emergent build identity:

- By mid-run, a player should be able to describe their build in system terms: "high-observability security build," "legacy compatibility mess," "fast but brittle deploy chain," "isolated container stack," or similar.
- Build identity should emerge from installed packages, graph topology, resources, and incident history together.
- Designers are encouraged to draw further inspiration from Cogmind where it suits the game, especially in letting the player's accumulated parts/tools define both capabilities and vulnerabilities.

### Slay The Spire-Inspired Guidance

Slay the Spire is a reference point for strategic route selection, tradeoff-heavy upgrades, risk evaluation, and build-shaping decisions. These are design freedoms and quality targets, not a requirement to copy a card-based map or card-reward structure.

Strategic route selection:

- When the room graph, dependency graph, or graph-scale view presents paths, routes should imply different risk/reward profiles.
- A route can mean physical traversal, dependency routing, upgrade path, deployment path, or incident resolution path.
- Designers should use route choices where they clarify strategy: safer validation path, risky package reward, debt-reduction detour, boss-prep branch, legacy shortcut, or high-risk mirror.

Tradeoff-heavy upgrades:

- Package choices should rarely be "best stat wins."
- Upgrades should ask what kind of system the player is willing to become: faster but brittle, safer but slower, observable but overloaded with alarming truth, compatible but indebted.
- A strong upgrade can be correct for one build and dangerous for another.

Risk evaluation:

- Players should often evaluate partial information: visible reward, visible risk tags, suspected hidden edges, current debt, observability, and upcoming room/boss pressure.
- Risk should be legible enough for intentional play without becoming fully solved.

Build-shaping decisions:

- Individual choices should push the run toward recognizable architecture, not just add temporary power.
- Designers are encouraged to use Slay the Spire-style decision pressure when it serves Dependency Hell's systems: routes, upgrade offers, event choices, shops, test/refactor opportunities, and boss preparation.

### Papers, Please-Inspired Guidance

Papers, Please is a reference point for absurd bureaucracy, contradictory process demands, and the slow accumulation of compounding consequences from earlier approvals. This influence is primarily tonal, structural, and literary; it should be felt in the pressure of the run rather than copied as a document-checking mechanic.

Absurd bureaucracy:

- The game should occasionally make the player obey systems that are technically procedural but obviously unreasonable.
- Compliance gates, approval chains, audit blockers, vendor portals, policy exceptions, change freezes, and release signoffs can become room events, enemy modifiers, package requirements, or graph hazards.
- Humor should come from precise institutional absurdity: the form is valid, the process is followed, and the outcome is still ridiculous.

Earlier approvals accumulate:

- Small choices should leave records: accepted risk, skipped test, pinned version, exception granted, undocumented migration, emergency waiver.
- These records should not always punish immediately. They can return later as audit pressure, blocked rollback, boss mutation, vendor lock-in, morale flavor, or postmortem cause.
- The player should feel the slow tightening of a process net they helped create.

Human-scale pressure:

- Even when the game is abstract and technical, decisions should sometimes feel like signing off on something imperfect under deadline.
- The player is not only optimizing a system; they are surviving a release bureaucracy that converts ambiguity into liability.
- Designers are encouraged to use this influence where it suits the tone: fake forms, dry approvals, passive-aggressive documentation, impossible compliance requests, and release notes that are funny because they are almost plausible.

## 4. Audience

Primary audience:

- Roguelite players who enjoy strange builds, synergies, and emergent failure.
- Technical players who recognize dependency graphs, CI failures, CVEs, rollbacks, and deployment pressure.

Secondary audience:

- Action game players who do not know software systems but understand risk, conflicts, hidden information, and cascading failure through icons, colors, and combat consequences.

Accessibility requirement:

Software literacy should enrich the joke, not be required to understand the game state. Use simple verbs on core UI: requires, conflicts, patches, isolates, observes, pins, breaks.

## 5. Core Loop

Moment-to-moment loop:

1. Enter a room.
2. Read immediate threat through enemies, hazards, logs, and graph pulse.
3. Fight, dodge, patch, rollback, or isolate.
4. Clear the room and receive a choice, resource, or path decision.
5. Inspect the dependency graph enough to make a risky choice.
6. Install, patch, skip, pin, test, or refactor.
7. Watch the system mutate.
8. Carry consequences into the next room.

Run loop:

1. Start with a small graph: app -> runtime -> standard-lib.
2. Gain packages and tools that improve combat.
3. Choose routes and upgrades that shape graph edges, hidden risks, and technical debt.
4. Face events that expose earlier decisions.
5. Reach an adaptive boss based on graph state.
6. Receive postmortem on failure or release report on success.

## 6. Player Character

MVP character: The Resolver.

Presentation:

- Tiny readable humanoid/process avatar, matching the mockups' glowing vector/pixel silhouette.
- Simple facing and attack animations.
- Color state shifts based on stability and active debuffs.

Base stats:

- Stability: 100.
- Observability: 2 of 5.
- Technical Debt: 0.
- Move speed: medium.
- Fire rate: medium.
- Base weapon: Patch projectile.
- Utility: Rollback, limited charges.

Base controls:

- Move.
- Aim.
- Fire Patch.
- Dash or short Evade.
- Use active tool.
- Open graph view.
- Confirm/cancel package choice.

Control scheme should support keyboard/mouse and controller from the start.

## 7. Core Resources

MVP uses three main resources, as recommended by the treatment.

### Stability

Health equivalent. Reaches zero on run failure.

Sources of damage:

- Enemy hits.
- Failed builds.
- Active conflicts.
- Uncontained incidents.
- Boss attacks through graph edges.

Recovery sources:

- Successful test room.
- Rollback.
- Package effects.
- Rare room rewards.

### Observability

Information budget.

High observability reveals:

- Enemy intent.
- Hidden package tags.
- Conflict likelihood.
- Future room hazards.
- Weak graph edges.
- Postmortem accuracy.

Low observability hides:

- Exact conflict cause.
- Enemy modifiers.
- Whether an item risk is immediate or delayed.
- Some graph edges until they activate.

### Technical Debt

Accumulated shortcut pressure.

Increases from:

- Skipping tests.
- Accepting quick fixes.
- Pinning versions.
- Installing shims.
- Using unreliable mirrors.
- Ignoring warnings.

Effects:

- Raises chance of debt events.
- Adds modifiers to enemies.
- Mutates boss choice or boss attacks.
- Lowers quality of shops and rewards at thresholds.

MVP threshold bands:

- 0 to 24: clean enough.
- 25 to 49: warnings and minor hazards.
- 50 to 74: debt events, stronger conflicts.
- 75 to 100: forced incident before boss; boss receives debt mutation.

## 8. Dependency Graph System

The graph is a node-and-edge model attached to the run.

Node categories:

- Core: app, runtime, standard-lib, core-lib.
- Package: installable item or upgrade.
- Tool: test suite, debugger, rollback, feature flag.
- Service: room/floor component.
- Hazard: active bug, CVE, circular dependency, unpublish event.

Edge categories for MVP:

- requires
- conflicts
- patches
- isolates
- observes
- pins
- infects

Each node has:

- id
- display name
- category
- tags
- visible properties
- hidden properties
- stability modifier
- observability modifier
- debt modifier
- combat modifiers
- incident hooks

Each edge has:

- source node
- target node
- relation type
- strength from 1 to 3
- visibility state: known, suspected, hidden
- active state: dormant, active, broken

Legibility rule:

Players should see enough to make a reasoned choice, but not enough to eliminate risk. A bad outcome should feel like "I knew this might happen" rather than "that was arbitrary."

## 9. Room Structure

MVP floor: Release Candidate Pipeline.

Suggested room count per run:

- 10 to 14 total rooms visited.
- 3 to 5 combat rooms.
- 2 package rooms.
- 1 test room.
- 1 incident room.
- 1 observability or refactor room.
- 1 shop/vendor room.
- 1 boss room.
- Optional archive/mirror side room.

Room types:

- Combat Room: fight bugs, regressions, and incompatibilities.
- Package Room: choose one of three packages/upgrades.
- Test Room: spend time or complete a challenge to reveal hidden graph risks.
- Incident Room: timed triage event with cascading failures.
- Archive Room: find old docs, legacy package, or compatibility clue.
- Mirror Room: retrieve deprecated package at security/debt risk.
- Vendor Room: buy expensive but strange tools.
- Refactor Room: reduce debt or remove/rewire one edge.
- Observability Room: upgrade graph visibility or diagnostics.
- Boss Room: adaptive boss fight.

## 10. Combat Design

Combat should be immediate and readable. Technical meaning should influence behavior, but players should be able to learn enemies visually.

Player weapon types:

- Patch: basic projectile.
- Rollback: undo recent damage or clear one active hazard.
- Feature Flag: temporarily disables a node, enemy modifier, or room hazard.
- Container: creates isolation field that prevents infection/conflict spread.
- Shim: converts damage type or compatibility requirement.
- Debugger: slows enemy or reveals weakness.
- Kill -9: heavy damage with collateral graph risk.

Enemy behavior principles:

- One clean silhouette.
- One memorable rule.
- One readable warning state.
- One graph interaction for advanced play.

MVP enemy list is defined in [MVP Content Matrix](./MVP_Content_Matrix.md).

## 11. Package And Upgrade Choices

Packages are the primary build-shaping rewards.

Package choice format:

- Present 3 options.
- Show name, icon, immediate benefit, visible risk tags, and graph preview.
- Hide some exact interactions based on observability.
- After choice, animate graph node insertion and edge changes.

Package classes:

- Utility packages: small stat benefits, low but nonzero graph risk.
- Infrastructure tools: strong defensive or observability effects, may slow player or add requirements.
- Legacy systems: unlock routes and rewards, create conflicts with modern packages.
- Shortcuts: immediate strong benefit, technical debt or hidden hazard.
- Process improvements: reveal info, lower risk, usually weaker in combat.

Minimum MVP package target:

- 24 packages.
- 8 low-risk/common.
- 8 medium-risk/build-shaping.
- 4 high-risk/high-reward.
- 4 defensive/process tools.

## 12. Events

Events are run-level pressure created by graph state.

MVP events:

- Critical CVE: security-tagged node creates timed pressure.
- Dependency Unpublish: package node becomes unavailable or unstable unless pinned/vendored.
- Maintainer Abandonment: upgrade path closes; future patches cost more.
- Build Failure: active conflicts damage stability until resolved.
- Circular Coupling: two or more nodes begin feeding each other hazard effects.
- Customer Feature Promise: choose speed/reward now or debt/stability later.

Event selection should weigh graph state. Do not fire events with no meaningful relation to prior choices.

## 13. Bosses

MVP includes two bosses.

### The Major Version Upgrade

Triggered by:

- Too many pinned packages.
- High number of old/legacy nodes.
- Multiple suppressed update pressures.

Fight identity:

- Attacks through graph edges.
- Forces compatibility windows.
- Temporarily invalidates old packages.
- Summons Version Conflict enemies.

Counterplay:

- Test Suite reveals safe windows.
- Rollback clears one failed migration.
- Feature Flag disables a risky subsystem.
- Containerization limits blast radius.

### The Distributed Monolith

Triggered by:

- High coupling.
- Too many cross-graph edges.
- Enterprise Service Bus style connectors.
- Low isolation.

Fight identity:

- Large central node with many tentacle-like edges.
- Damaging one subsystem can enrage linked subsystems.
- Spawns Transitive Bug and Circular Dependency enemies.

Counterplay:

- Refactor weakens edge clusters.
- Containerization cuts spread.
- Observability reveals true weak point.
- Kill -9 can burst a segment but risks collateral.

Boss choice rule:

If both conditions are present, choose the boss tied to the highest normalized risk score. If no strong condition exists, default to The Major Version Upgrade for MVP.

## 14. Failure And Victory

Failure screen: Postmortem Summary.

Required sections:

- Incident title.
- Primary cause.
- Contributing factors.
- What went well.
- Action items.
- Timeline of 3 to 5 important run events.
- Graph visualization showing failed node cluster.

Victory screen: Release Report.

Required sections:

- Version shipped.
- Customer impact.
- Known issues.
- Security risk.
- Technical debt state.
- Morale or team state as flavor, if tracked later.
- Final architecture summary.
- 3 notable decisions.

Postmortem text must be generated from actual run facts, not random jokes. Templates can be funny, but the nouns and causes should be true.

## 15. UI Requirements

Action HUD:

- Stability bar.
- Observability or confidence meter.
- Active tool indicator.
- Recent log strip.
- Dependency graph minimap.
- Current room/system name.

Graph view:

- Open during pauses or between rooms.
- Simplified node graph.
- Nodes colored by category and risk.
- Edge types distinguishable by line style or icon.
- Known, suspected, and hidden relations visually distinct.
- Controller and mouse navigable.
- Can expand to full-screen graph-scale view for special rooms, boss phases, postmortems, or later levels.

Graph-scale view:

- Uses the dependency graph as the main spatial field, not as a decorative HUD element.
- Functions as the bird's-eye/system-layer counterpart to side-view combat rooms.
- Carries the FTL-inspired crisis layer: pausable panic, subsystem triage, cascading failures, and choosing which fire to fight first.
- May support inspection only in MVP, but should be designed so future active interactions are possible.
- Possible active interactions: select node to patch, sever an edge temporarily, isolate a subsystem, trace infection spread, reroute around a conflict, or choose a deployment path.
- Must clearly signal when the player is acting on the avatar-scale room versus the system-scale graph.

Package selection overlay:

- Keep action context visible behind the overlay, like mockup 2.
- Show graph preview before confirming.
- Use icons for combat, defense, visibility, risk, conflict, and debt.

Failure state:

- Use large, unmistakable warnings like mockup 4.
- Avoid hiding the player or combat during normal critical states.
- Reserve full-screen chaos for run-ending or boss-phase moments.

## 16. Art Direction For MVP

Visual target:

- Haunted arcade cabinet built by a build server.
- Dark background, phosphor glow, scanlines, warning reds, terminal greens/cyans, conflict yellows/oranges.
- Low-resolution sprites or vector-pixel hybrids.
- Dependency graph as satisfying electric object, not a dry dashboard.

Combat readability comes first. Logs, graph overlays, and terminal text must never obscure bullets, enemies, or player state during normal play.

Required MVP assets:

- Player sprite set.
- 8 to 12 enemy sprite sets.
- 2 boss sprite/effect sets.
- 24 package icons.
- 8 room/hazard tiles or backdrops.
- HUD frame, graph nodes, graph edges, warning states.
- Postmortem graph visualization elements.

## 17. Audio Direction For MVP

Audio target:

- Retro arcade energy plus office panic plus machine-room dread.

Required MVP audio:

- Player fire, hit, dash, death.
- Enemy hit/death for enemy families.
- Package install.
- Conflict activation.
- Graph edge crackle.
- Test pass/fail.
- Build fail warning.
- Boss intro.
- Postmortem ambience.
- Music state layers: stable, incident, low stability, boss.

Music should react to system state in simple layers first. For MVP, do not overbuild adaptive music beyond stability/debt/incident toggles.

## 18. MVP Acceptance Criteria

The MVP is successful if:

- A player can complete or fail a run.
- Package choices visibly mutate the graph.
- At least 6 packages have meaningful interactions with other packages or graph state.
- At least 3 failure modes are traceable to earlier decisions.
- Observability changes what information is visible.
- Technical debt changes event or boss behavior.
- The boss adapts to accumulated graph shape.
- The postmortem uses real run state and feels specific.
- Combat remains readable even with graph/log overlays.
- The run produces emergent build identity that players can describe in terms of system behavior, not only item names.
- Procedural variation changes the problems players reason about, not only the room order.
- Major consequences follow readable machine logic that can be traced through graph state, event logs, or postmortems.
- Route, upgrade, or event choices include meaningful risk evaluation instead of obvious best answers.
- At least one route decision and one package decision visibly shape the player's build direction.
- Earlier approvals or accepted risks can return later as concrete run consequences.
- The game includes at least a small amount of dry bureaucratic absurdity through rooms, incidents, item text, postmortems, or release reports.
