# Content Authoring & Coherence

This is the canonical reference for authoring content in Dependency Hell correctly. It merges the coherence model (good-emergence rules, effect-verb vocabulary, scoring rubric) with the intended content-generation pipeline.

Related docs:

- The pass/fail gates (Design Gate and Coherence Gate checklists) live in [`AGENTS.md`](../AGENTS.md). This document does not repeat them.
- The detailed **scoring rubric** lives here (see [The Coherence Scoring Rubric](#the-coherence-scoring-rubric)); `AGENTS.md` only points to it.

---

## 1. Philosophy: Good Emergence vs Bad Nonsense

Dependency Hell should produce surprising but explainable outcomes. The goal is not to prevent all weirdness; it is to make sure weirdness either follows authored rules, degrades into known generic interactions, is flagged by tooling, or becomes funny in a controlled way.

**Good emergence:**

> I did not expect that, but after seeing it, I understand why it happened.

**Bad nonsense:**

> I do not know why that happened, and I could not have predicted or prevented it.

### The Absurdity Rule

Absurdity is allowed when the cause is traceable. The theme may be ludicrous; the mechanics must be accountable. A Rubber Duck that reveals a hidden dependency when the player stands still is good absurdity, because the cause (forced explanation raises Observability) is legible. Content whose effects cannot be explained through the dependency graph, player resources, enemy behavior, or room topology is bad absurdity and should be rejected.

### The Causal Trace Requirement

If a content object can kill the player, block a route, alter a major resource, trigger an incident, modify boss selection, or materially affect the report, it **must** leave a causal trace.

Minimum acceptable traces:

- Structured run-state field.
- Event-log entry with relevant ids.
- Graph node or edge mutation.
- Registered risk or mitigation.
- Postmortem/release-report hook.

No major gameplay outcome should depend on invisible state that cannot be inspected, logged, or explained.

---

## 2. Content Shape: Structured Data with Constrained Verbs

Content should move toward **structured data with constrained verbs**. Freeform prose can describe flavor, but mechanics should use parseable operations. An object works best when it behaves like a small rules engine: immediate power, graph consequence, readable risk, and future story pressure.

The allowed effect verbs stay intentionally small and reusable (see [Section 3](#3-the-effect-verb-vocabulary)). This is deliberate: a small vocabulary is what makes automated validation, deduplication, and simulation possible, and it is what keeps emergence explainable.

### Tag Ontology

Tags should be curated, not invented casually. If a new tag is needed, add it to the ontology and define at least one interaction expectation.

Candidate tag families:

- **Domain:** `auth`, `crypto`, `storage`, `network`, `logging`, `runtime`, `build`, `deploy`, `test`, `observability`, `orchestration`, `cache`
- **Era:** `legacy`, `modern`, `experimental`, `abandoned`, `enterprise`, `handmade`
- **Risk:** `insecure`, `unstable`, `opaque`, `slow`, `brittle`, `unmaintained`, `overpowered`, `noisy`
- **Graph role:** `gateway`, `leaf`, `hub`, `adapter`, `isolator`, `amplifier`, `bridge`, `sink`, `source`
- **Failure family:** `conflict`, `leak`, `race`, `drift`, `outage`, `audit`, `regression`, `breach`, `cascade`

### Interaction Resolution

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

### Orthogonal Design Axes

Use these axes to reduce combinatorial explosion. Content should usually act strongly on one axis and expose hooks on at least one other axis. Orthogonal axes combine more naturally than piles of bespoke pair rules.

- **Graph topology:** hubs, leaves, bridges, cycles, isolated subgraphs.
- **Information:** visible, hidden, suspected, misreported.
- **Risk:** security, stability, debt, morale, velocity.
- **Combat:** enemy type, room hazard, player weapon behavior.
- **Time:** immediate, delayed, escalating, triggered.

Examples:

- A package that changes graph topology combines naturally with a package that changes visibility.
- A package that increases velocity combines naturally with one that increases risk.
- A tool that isolates graph edges combines naturally with incidents that propagate through topology.
- A room hazard that escalates over time combines naturally with packages that trade burst power for debt.

When adding content, define its primary axis and secondary interaction axis. Avoid content that only adds a number without touching at least one axis in a way the player can perceive.

---

## 3. The Effect-Verb Vocabulary

Effect verbs are the constrained operations content uses to express mechanics. There are two categories: the verbs the engine **implements today** (in [`scripts/effects.js`](../scripts/effects.js)) and the broader **aspirational** vocabulary the coherence model proposes for the future.

> **Important:** Author real, shippable content against the *implemented* verbs. The proposed verbs describe intended future capability. Do not ship content that depends on a proposed verb until the engine implements it.

### Implemented verbs (real today)

These are the `op` values `applyEffect` actually handles. Field names are the exact properties the effect object must carry.

| Verb (`op`) | Effect | Key fields |
| --- | --- | --- |
| `addNode` | Adds a node to the dependency graph (deduped by `id`). | `id`, `name`, `tags` |
| `addEdge` | Adds a graph edge between two nodes. | `source`, `target`, `relation`, `strength`, `visibility` |
| `modifyStat` | Adjusts a player stat (floored at 0.08). | `stat`, `amount` |
| `modifyResource` | Adjusts a run resource, clamped to 0-5. | `resource`, `amount` |
| `increaseDebt` | Adds Technical Debt and records a debt tag. | `amount`, `tag` |
| `addApproval` | Records a security exception / approval. | `id`, `target`, `reason` |
| `addTag` | Appends a tag to a named run list (deduped). | `list`, `tag` |
| `addTool` | Unlocks a tool for the run (deduped). | `tool` |
| `revealEdges` | Reveals matching suspected edges (sets visibility to `known`). | `relation` (optional), `visibility` (optional) |

### Proposed / aspirational verbs (not yet implemented)

The coherence model proposes a larger reusable vocabulary. These are design targets, not runtime operations. Some overlap conceptually with implemented verbs (noted below).

| Proposed verb | Intent / relationship to implemented verbs |
| --- | --- |
| `add_node` | Maps to implemented `addNode`. |
| `add_edge` | Maps to implemented `addEdge`. |
| `modify_edge` | Mutate an existing edge (strength/relation/active). No implemented equivalent. |
| `reveal_node` | Reveal a hidden node. No implemented equivalent (`revealEdges` reveals edges only). |
| `reveal_edge` | Reveal a specific hidden edge. Partially covered by `revealEdges` (which reveals by match, not by id). |
| `block_route` | Block a dungeon route. No implemented equivalent. |
| `unlock_room_family` | Unlock a family of rooms. No implemented equivalent. |
| `spawn_incident` | Trigger an incident. No implemented equivalent. |
| `raise_resource` / `lower_resource` | Both map to implemented `modifyResource` (positive/negative `amount`). |
| `add_player_modifier` | Player buff/debuff. Closest today is `modifyStat`. |
| `add_enemy_modifier` | Enemy buff/debuff. No implemented equivalent. |
| `register_risk` | Register a tracked risk. No implemented equivalent (though `increaseDebt` records debt tags). |
| `resolve_conflict` | Resolve a pending conflict. No implemented equivalent. |
| `add_tool` | Maps to implemented `addTool`. |
| `add_process_decision` | Record a process decision. Conceptually near `addApproval`. |
| `add_boss_score` | Contribute to boss selection scoring. No implemented equivalent. |

**Naming discrepancy to know:** the model uses `snake_case` verb names; the engine uses `camelCase` `op` values. When authoring for the engine today, always use the implemented `camelCase` names and fields from the first table.

---

## 4. The Coherence Scoring Rubric

Score each proposed package, tool, enemy, room, incident, route, or boss mechanic **before implementation**. Use 0, 1, or 2 points per category, for a maximum of 10.

- **Agency:** can the player use it, avoid it, route around it, time it, inspect it, or otherwise act intentionally around it?
- **Traceability:** can consequences be explained later through run state, event log, graph state, or report text?
- **Graph relevance:** does it alter, expose, depend on, or travel through the dependency dungeon?
- **Interaction surface:** does it combine with multiple systems, tags, resources, enemies, rooms, or tools?
- **Counterplay:** can the player respond intelligently before or after the consequence appears?

**Thresholds:**

- **0-4:** reject or redesign.
- **5-6:** prototype only if it solves a specific missing need.
- **7-8:** acceptable MVP content.
- **9-10:** strong content candidate.

Content scoring below **7/10** should be rejected, redesigned, or explicitly marked as a narrow prototype exception.

### Worked example: Memory Leak enemy

- **Agency: 2.** Player can choose burst damage, containment, or avoidance.
- **Traceability: 2.** It grows over time or under pressure; reports can cite prolonged encounter or failed cleanup.
- **Graph relevance: 1.** It may appear only in rooms with certain package/resource states.
- **Interaction surface: 2.** It combines with low damage, long rooms, Observability, cleanup tools, and time pressure.
- **Counterplay: 2.** Burst, isolate, reset, or avoid prolonged combat.
- **Score: 9/10.**

---

## 5. The Content-Generation Pipeline

Once the validators above exist and are opinionated, they enable something larger than a quality gate: an **automated, agent-assisted content pipeline**. The insight is that a cheap, unremarkable model does not need to be brilliant if the validators are strict. It can throw ideas at the wall; the schema, rubric, and simulation harness decide what survives. This is not merely content generation, it is **supervised mutation**.

Guiding principle:

> **Generate broadly. Admit narrowly.**

You are not just building a gate to keep bad content out. You are building a **content compiler**.

### The pipeline flow

```
LLM proposes content
  -> schema gate:        validates shape
  -> ontology/tag gate:  validates tags against the ontology
  -> rubric gate:        scores agency / traceability / graph relevance / interaction surface / counterplay
  -> interaction resolver: checks fallback behavior
  -> similarity/dedupe gate: checks for duplicates
  -> simulation gate:    checks balance / pathology
  -> accepted content enters the game
  -> rejected content gets structured feedback and retries
```

### The gates

1. **Schema gate.** Validates the structural shape of the proposed content: required fields, correct effect-verb `op` names, valid field types.
2. **Ontology / tag gate.** Validates that every tag exists in the curated tag ontology. New tags are not invented casually; they must be added to the ontology with at least one interaction expectation.
3. **Rubric gate.** Scores the content on agency, traceability, graph relevance, interaction surface, and counterplay using [the rubric above](#4-the-coherence-scoring-rubric). Content below 7/10 fails.
4. **Interaction-resolver gate.** Checks that the content has sane fallback behavior under the interaction-resolution priority order, so that even unmatched combinations degrade to a known generic interaction rather than nonsense.
5. **Similarity / dedupe gate.** Rejects content that is too close to what already exists. Even before embeddings, cheap heuristic checks work well:
   - same domain + same graph role + same primary risk,
   - overlapping tags above a threshold,
   - same effect verbs in the same order,
   - same combat verb,
   - same postmortem-hook pattern.

   Later, embeddings can catch "different words, same idea."
6. **Simulation gate.** Runs the accepted-so-far content through a simulation harness to check balance and pathological behavior before it enters the game.

### The retry loop

Rejected content is not discarded; it receives structured feedback and is re-submitted, up to `n` times, with templated replacement instructions. The loop is deliberately mechanical.

Example rejection:

```
Rejected:
- Score 5/10
- Missing counterplay
- Too similar to Compatibility Shim
- No causal trace for failure outcome
```

Example revision instruction:

```
Keep domain=deploy and graph_role=bridge.
Add counterplay through Observability or route choice.
Replace direct damage bonus with topology or information effect.
Add a postmortem hook.
```

The motivation is pragmatic: this game should exist without a year of hand-crafting assets or manually ensuring every idea is unique. Strict, opinionated validators make cheap generation viable, because garbage cannot get through.
