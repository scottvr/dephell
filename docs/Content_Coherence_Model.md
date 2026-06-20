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

## Causal Trace Requirement

If a content object can kill the player, block a route, alter a major resource, trigger an incident, modify boss selection, or materially affect the report, it must leave a causal trace.

Minimum acceptable traces:

- Structured run-state field.
- Event-log entry with relevant ids.
- Graph node or edge mutation.
- Registered risk or mitigation.
- Postmortem/release-report hook.

No major gameplay outcome should depend on invisible state that cannot be inspected, logged, or explained.
