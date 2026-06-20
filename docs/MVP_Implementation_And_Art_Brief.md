# Dependency Hell MVP Implementation And Art Brief

## 1. Engineering Objective

Build a one-floor action roguelite prototype where combat, package choices, dependency graph mutations, run events, boss behavior, and postmortem generation all read from a shared run-state model.

The implementation should favor tunable data, composable rules, and clear event logs over literal package-manager simulation. The graph needs to produce good stories and deep interactions from a small rule set, not model a real ecosystem.

Cogmind-inspired implementation goal:

- Systems should combine through reusable mechanics rather than isolated special cases.
- Rule outcomes should be inspectable in debug tools, visible UI, or postmortems.
- Procedural generation should create different system problems, not just different room orders.
- Build identity should be derivable from run state: installed packages, graph topology, resource profile, incidents, and boss risk scores.

Papers, Please-inspired implementation goal:

- Track approvals, waivers, accepted risks, skipped validations, compliance flags, and policy exceptions as first-class run facts.
- Let those facts return later through incidents, locked options, blocked rollback, audit pressure, boss modifiers, or postmortem language.
- Keep the mechanics lightweight: these records can be tags and event-log entries, but they must be queryable and visible enough to make consequences feel earned.

## 2. Core Runtime Systems

### Run State

Owns:

- Current room id.
- Room graph.
- Dependency graph.
- Player stats.
- Resource values.
- Installed packages.
- Active incidents.
- Event log.
- Boss risk scores.
- Random seed.

Run state should be serializable for debugging and playtest bug reports.

### Combat System

Owns:

- Player movement and aiming.
- Weapons/tools.
- Enemies.
- Projectiles.
- Hazards.
- Damage.
- Room clear state.

Combat should query run state for active modifiers, but should not directly mutate graph structure except through defined events.

### Dependency Graph System

Owns:

- Node creation/removal.
- Edge creation/removal.
- Relation activation.
- Visibility states.
- Risk scoring.
- Graph events.

Suggested API:

```text
addNode(nodeDefinitionId)
addEdge(sourceNodeId, targetNodeId, relationType, strength)
setEdgeState(edgeId, state)
setVisibility(entityId, visibilityState)
getVisibleGraph(observabilityLevel)
scoreRisk(riskType)
findActiveConflicts()
findWeakEdges()
```

### Package Effect System

Packages should be content data plus effect hooks.

Effect hook categories:

- onInstall
- onRoomEnter
- onRoomClear
- onEnemySpawn
- onDamageDealt
- onDamageTaken
- onIncidentStart
- onBossStart
- onPostmortem

Avoid bespoke package code unless a package proves central. For MVP, most effects should use reusable operations:

- modify stat
- add node
- add edge
- reveal node/edge
- increase debt
- add weapon modifier
- add event weight
- add tag
- suppress event
- trigger incident

### Observability System

Observability controls what the player sees, not whether the underlying truth exists.

Visibility states:

- known: exact relation/effect shown.
- suspected: relation hinted with risk language.
- hidden: not shown until revealed or activated.

Use observability to reveal:

- item hidden risks.
- graph edge types.
- enemy modifiers.
- event likelihood.
- boss selection clues.

### Technical Debt System

Technical Debt is a meter plus tags.

Examples:

- debt.quick_fix
- debt.pinned_versions
- debt.skipped_tests
- debt.compatibility_shim
- debt.unreliable_mirror

The numeric meter drives thresholds. Tags drive specific postmortem lines and event weights.

### Event Log

Record meaningful facts in a structured log. This is required for generated postmortems.

Event examples:

```text
time=120 type=package_installed package=LegacyAuth node=legacy_auth
time=138 type=edge_added relation=conflicts source=LegacyAuth target=ModernCrypto visibility=suspected
time=211 type=incident_started incident=BuildFailure cause=crypto_conflict
time=243 type=rollback_blocked cause=schema_migration
time=255 type=approval_granted approval=security_exception target=legacy_auth expires=act_end
time=312 type=run_failed cause=core_lib_failure
```

The event log should support:

- postmortem generation.
- timeline UI.
- playtest telemetry.
- debugging.
- tracing readable machine logic from cause to consequence.
- summarizing emergent build identity.
- tracing accepted approvals, waivers, and skipped validations into later consequences.

## 3. Data Model Sketch

### Package Definition

```json
{
  "id": "legacy_auth",
  "name": "LegacyAuth",
  "rarity": "uncommon",
  "tags": ["legacy", "auth", "security_risk"],
  "visibleDescription": "Unlocks old locked rooms and lowers aggro from older systems.",
  "visibleRisks": ["conflicts", "audit_pressure"],
  "hiddenRisks": ["conflicts:modern_crypto"],
  "effects": [
    {"op": "addNode", "node": "legacy_auth"},
    {"op": "addEdge", "source": "app", "target": "legacy_auth", "relation": "requires", "strength": 2},
    {"op": "modifyStat", "stat": "old_system_access", "amount": 1}
  ]
}
```

### Enemy Definition

```json
{
  "id": "race_condition",
  "name": "Race Condition",
  "family": "timing",
  "health": 18,
  "speed": 1.4,
  "behavior": "phase_vulnerable",
  "telegraph": "flicker_then_dash",
  "graphInteraction": {
    "requiresObservabilityToPredict": true,
    "onHit": "randomizeDirection"
  }
}
```

### Incident Definition

```json
{
  "id": "critical_cve",
  "name": "Critical CVE",
  "weightTags": ["security_risk", "legacy", "openssl"],
  "triggerDebtMin": 20,
  "effects": [
    {"op": "startTimer", "seconds": 60},
    {"op": "markNodeHazard", "tag": "vulnerable"},
    {"op": "spawnEnemyFamily", "family": "audit"}
  ],
  "resolutions": ["patch", "isolate", "accept_risk"]
}
```

## 4. Procedural Generation

MVP generation should be constrained and readable.

Generate:

- One room path from start to boss.
- 2 to 4 side branches.
- Required room slots: start, package, combat, test/observability, incident, package, boss.
- Optional slots: vendor, archive, mirror, refactor.

Use weighted templates rather than unconstrained procedural layout.

Slay the Spire-inspired route goal:

- Route branches should have readable strategic meaning where possible, not just different room order.
- Example route profiles: safer test/refactor path, risky package/mirror path, observability prep path, vendor/resource path, incident shortcut, boss-prep path.
- Route preview should expose enough information for risk evaluation, with Observability controlling exactness.

Room graph and dependency graph should be related but not identical:

- The room map is traversal.
- The dependency graph is system structure.
- Some room choices create or reveal dependency graph relations.
- Some route choices should shape build direction by changing package pools, debt, observability, incident weights, or boss risk scores.

## 5. Boss Selection Implementation

Track boss risk scores throughout the run.

Major Version Upgrade score:

- +2 per pinned node.
- +2 per legacy node.
- +3 per suppressed upgrade event.
- +1 per old-runtime edge.

Distributed Monolith score:

- +1 per edge above baseline.
- +2 per node degree above 4.
- +3 per global connector package.
- +2 per active circular dependency.
- -2 per isolation edge.

At boss room entry:

- Select highest score if it passes a minimum threshold.
- Otherwise select default boss.
- Apply mutation tags based on secondary scores.

## 6. UI Implementation Notes

### Combat HUD

Keep elements stable in screen space:

- Top-left: Stability and active tool.
- Left side: log strip, constrained and nonblocking.
- Bottom-right: dependency minimap.
- Center: combat only.

### Graph Minimap

Minimap requirements:

- Shows node count, active hazards, conflict clusters, and current package highlight.
- Not fully interactive during combat.
- Pulses when graph event occurs.

### Full Graph View

Required interactions:

- Pan/zoom.
- Node inspect.
- Edge inspect.
- Toggle relation legend.
- Preview package install.
- Confirm/cancel.

Graph layout can use force-directed placement or curated layout per graph size. For MVP, prioritize stable readable positions over physically accurate graph motion.

### Postmortem UI

Required blocks:

- Title and incident name.
- 3D or pseudo-3D graph failure visualization optional; 2D graph acceptable for MVP.
- Stats summary.
- Timeline.
- Cause/contributing factors/action items.

## 7. Art Brief

### Camera And Spatial Metaphor

MVP art should follow the mockups' side-view room format. Each encounter is a readable combat chamber first and a software-system metaphor second. The dependency graph carries the abstract structure: imports, compatibility, coupling, infection, and failure spread.

The room art can borrow from platformers, dungeon chambers, server racks, CI pipeline stages, terminal panes, and haunted arcade screens. Avoid designing the room map and dependency graph as competing navigational systems. The room is the player's body-scale space; the graph is the system-scale space.

The graph should support three presentation scales:

- Minimap: compact combat HUD, low interaction.
- Full graph view: pause or between-room inspection and package preview.
- Graph-scale play space: full-screen system-layer view for special rooms, boss phases, postmortems, or later levels.

Graph-scale view is the project's bird's-eye equivalent and its FTL-style triage surface. It should feel like zooming out from a single service chamber into the architecture that contains it, then making hard choices about which subsystem failure to contain first. Do not make art or UI assumptions that prevent this mode from becoming interactive later.

### Visual Identity

Reference the mockups:

- CRT frame and scanline feel.
- Cyan/green player and platform readability.
- Red/orange warnings for failure states.
- Dependency graph with glowing square nodes and electric edge arcs.
- Left-side log noise and bottom-right minimap.
- Large failure typography reserved for critical moments.

Avoid:

- Modern SaaS dashboard aesthetics.
- Clean corporate vector UI.
- Overly small terminal text as required gameplay information.
- Effects that obscure player/enemy silhouettes.

### Palette

Functional colors:

- Player/action: cyan/green.
- Stability/health: red.
- Observability/info: cyan.
- Technical debt/warning: amber.
- Conflict/failure: red/orange.
- Hidden/suspected: dim violet or dashed pale line.
- Safe/validated: green.

Color must be backed by icon/shape language for accessibility.

### Sprite Requirements

Player:

- Idle, run, fire, dash, hit, install/use tool, death/failure.

Enemies:

- Each enemy needs idle/move, attack telegraph, hit, death, and graph interaction effect where relevant.

Bosses:

- Boss core sprite.
- Edge/tendril attack effects.
- Phase transition.
- Failure/collapse.

Packages:

- 24 icons at small and large sizes.
- Icon categories should be instantly readable: package, shield, eye, sword/patch, gear/tool, warning, pin, container.

Graph:

- Node states: normal, selected, installed, suspected, hazardous, broken, isolated, pinned.
- Edge states: requires, conflicts, patches, isolates, observes, pins, infects.

### Animation And Effects

Required effects:

- Package install node insertion.
- Conflict edge activation.
- Infection spread along edge.
- Rollback reversal.
- Test reveal pulse.
- Build failed warning.
- Boss graph attack.
- Stability damage flicker.

## 8. Audio Brief

### Sound Identity

Use retro arcade sounds, terminal feedback, alert tones, machine-room drones, and corrupted build-server cues.

Functional audio cues:

- Package installed: satisfying but slightly ominous.
- Conflict activated: sharp electric crackle.
- Observability reveal: clean scan/ping.
- Technical debt threshold: warning tone.
- Test pass: short success chime.
- Test fail/build fail: harsh CI failure cue.
- Boss edge attack: rising voltage/connection snap.

### Music

MVP layers:

- Base exploration/combat loop.
- Incident percussion layer.
- Low stability tension layer.
- High debt detune layer.
- Boss layer.

The mix can become muffled under low observability as a strong thematic touch, but keep important gameplay cues audible.

## 9. QA And Debug Tools

Required debug tools:

- Start run with fixed seed.
- Spawn package by id.
- Set Stability, Observability, Technical Debt.
- Force incident.
- Force boss.
- Toggle graph visibility.
- Dump run state and event log.
- Show active package effects.

Test cases:

- Package install creates correct nodes/edges.
- Hidden edge becomes visible at correct observability.
- Technical Debt threshold triggers event weights.
- Boss selection matches risk scores.
- Postmortem includes true run cause.
- Combat room can clear with each basic weapon state.
- UI remains readable at 16:9 and common desktop resolutions.

## 10. Implementation Priorities

Build in this order:

1. Combat graybox.
2. Run state and event log.
3. Dependency graph data model.
4. Package install flow.
5. First playable slice: 3 rooms, 3 package options, 5 to 7 graph nodes, one visible consequence, one mini-postmortem.
6. Observability and Technical Debt.
7. Incidents.
8. Boss selection and one boss.
9. Postmortem generation.
10. Art/audio pass.
11. Second boss and polish.

The biggest technical risk is the graph-effect framework. Keep it small, inspectable, and content-driven.
