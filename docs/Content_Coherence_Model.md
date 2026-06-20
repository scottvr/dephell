# Content Coherence Model

Dependency Hell should produce surprising but explainable outcomes. The goal is not to prevent all weirdness; it is to make sure weirdness either follows authored rules, degrades into known generic interactions, is flagged by tooling, or becomes funny in a controlled way.

Good emergence:

> I did not expect that, but after seeing it, I understand why it happened.

Bad nonsense:

> I do not know why that happened, and I could not have predicted or prevented it.

## Content Shape

Content should eventually move toward structured data with constrained verbs. Freeform prose can describe flavor, but mechanics should use parseable operations.

Allowed effect verbs should stay intentionally small and reusable. Candidate verbs:

- `add_node`
- `add_edge`
- `modify_edge`
- `reveal_node`
- `reveal_edge`
- `block_route`
- `unlock_room_family`
- `spawn_incident`
- `raise_resource`
- `lower_resource`
- `add_player_modifier`
- `add_enemy_modifier`
- `register_risk`
- `resolve_conflict`
- `add_tool`
- `add_process_decision`
- `add_boss_score`

## Tag Ontology

Tags should be curated, not invented casually. If a new tag is needed, add it to the ontology and define at least one interaction expectation.

Candidate tag families:

- Domain: `auth`, `crypto`, `storage`, `network`, `logging`, `runtime`, `build`, `deploy`, `test`, `observability`, `orchestration`, `cache`
- Era: `legacy`, `modern`, `experimental`, `abandoned`, `enterprise`, `handmade`
- Risk: `insecure`, `unstable`, `opaque`, `slow`, `brittle`, `unmaintained`, `overpowered`, `noisy`
- Graph role: `gateway`, `leaf`, `hub`, `adapter`, `isolator`, `amplifier`, `bridge`, `sink`, `source`
- Failure family: `conflict`, `leak`, `race`, `drift`, `outage`, `audit`, `regression`, `breach`, `cascade`

## Interaction Resolution

Use this priority order when multiple interactions could apply:

1. Specific pair rule.
2. Specific tag rule.
3. Generic domain rule.
4. Generic risk rule.
5. No special interaction.

Examples:

- `LegacyAuth + ModernCrypto` -> specific conflict: token serialization mismatch.
- Any `legacy + modern` pair in the same domain -> generic version conflict.
- Any `insecure` package under audit pressure -> compliance incident.
- Any `brittle hub` with high TDR -> cascade risk.
- Otherwise -> no special interaction.

The player should be able to learn these principles:

- Legacy plus modern in the same subsystem is risky.
- Opaque tools are dangerous when Observability is low.
- Hubs amplify failures.
- Isolators reduce blast radius.
- Adapters buy time but increase debt.

## Orthogonal Design Axes

Use these axes to reduce combinatorial explosion. Content should usually act strongly on one axis and expose hooks on at least one other axis. Orthogonal axes combine more naturally than piles of bespoke pair rules.

- Graph topology: hubs, leaves, bridges, cycles, isolated subgraphs.
- Information: visible, hidden, suspected, misreported.
- Risk: security, stability, debt, morale, velocity.
- Combat: enemy type, room hazard, player weapon behavior.
- Time: immediate, delayed, escalating, triggered.

Examples:

- A package that changes graph topology combines naturally with a package that changes visibility.
- A package that increases velocity combines naturally with one that increases risk.
- A tool that isolates graph edges combines naturally with incidents that propagate through topology.
- A room hazard that escalates over time combines naturally with packages that trade burst power for debt.

When adding content, define its primary axis and secondary interaction axis. Avoid content that only adds a number without touching at least one axis in a way the player can perceive.

## Content Scoring Rubric

Score each proposed package, tool, enemy, room, incident, route, or boss mechanic before implementation. Use 0, 1, or 2 points per category, for a maximum of 10.

- Agency: can the player use it, avoid it, route around it, time it, inspect it, or otherwise act intentionally around it?
- Traceability: can consequences be explained later through run state, event log, graph state, or report text?
- Graph relevance: does it alter, expose, depend on, or travel through the dependency dungeon?
- Interaction surface: does it combine with multiple systems, tags, resources, enemies, rooms, or tools?
- Counterplay: can the player respond intelligently before or after the consequence appears?

Suggested threshold:

- 0-4: reject or redesign.
- 5-6: prototype only if it solves a specific missing need.
- 7-8: acceptable MVP content.
- 9-10: strong content candidate.

Example: Memory Leak enemy

- Agency: 2. Player can choose burst damage, containment, or avoidance.
- Traceability: 2. It grows over time or under pressure; reports can cite prolonged encounter or failed cleanup.
- Graph relevance: 1. It may appear only in rooms with certain package/resource states.
- Interaction surface: 2. It combines with low damage, long rooms, Observability, cleanup tools, and time pressure.
- Counterplay: 2. Burst, isolate, reset, or avoid prolonged combat.
- Score: 9/10.

## Causal Trace Requirement

If a content object can kill the player, block a route, alter a major resource, trigger an incident, modify boss selection, or materially affect the report, it must leave a causal trace.

Minimum acceptable traces:

- Structured run-state field.
- Event-log entry with relevant ids.
- Graph node or edge mutation.
- Registered risk or mitigation.
- Postmortem/release-report hook.

No major gameplay outcome should depend on invisible state that cannot be inspected, logged, or explained.
