# Dependency Hell — Game Design

This is the canonical **what-to-build + how-it-looks** specification for *Dependency Hell*, a zero-build vanilla-JS browser action-roguelite. It merges the former MVP Game Design Document, Content Matrix, Package & Tool Ideas, Implementation & Art Brief (art/visual direction), and the Technical Creative Director working notes.

> **Delivery scope note:** This document describes the design surface. It does **not** own sprint plans, delivery milestones, or scope-target checklists. See `docs/roadmap.md` for delivery scope/sprints. Code file architecture lives in `AGENTS.md`, not here.

## Implemented vs. Aspirational — read this first

Much of this design is intentionally larger than what ships today. Every section tags content as **(implemented)** or **(planned)**. When in doubt, the table below is the ground truth of what the code actually does right now.

| Area | Implemented today | Aspirational (documented, not built) |
| --- | --- | --- |
| Build | Zero-build; open `index.html` directly | — |
| Rooms | Single fixed 5-room pipeline: "First Slice / Release Candidate Pipeline". No procedural generation. | Procedural generation; 10–14 rooms; 8 room types |
| Packages | 4: LegacyAuth, Test Suite, Compatibility Shim, Feature Flag | 24 packages across risk/role bands |
| Enemies | 3: Regression, Breaking Change (ranged projectiles), Memory Leak (grows/speeds when damaged) | 10 enemies |
| Bosses | None | 2 adaptive bosses (Major Version Upgrade, Distributed Monolith) |
| Resources | Stability, Observability (0–5), Technical Debt Ratio — all live | — |
| Traversal | Graph-as-map: auto-advance on single exit, route-select overlay on multiple exits | Full weighted-template route generation |
| Graph | Initial graph 6 nodes / 5 edges incl. a hidden Modern Crypto conflict seed | 7 formal edge types |
| Package flow | Choice overlay with live SVG graph "mutation preview" | Full 3-of-3 pools per package room |
| Branch room | Verification Fork (reshapes next enemy by installed package) | — |
| Incidents | Build Failure, Audit Pressure, Minor Regression (trigger in Staging from conflict edges/debt) | Full incident set (CVE, Unpublish, Circular Coupling, etc.) |
| Active tools | Feature Flag active tool (key `F`); Graph inspector (key `G`/INSPECT) | Additional active tools |
| End states | Win = Release Report; Lose (0 Stability) = Mini Postmortem; both generate a traceable timeline | — |
| Presentation | CRT: procedural canvas backdrop, scanlines, animated glitch side-rail | Audio (all) |

Effect verbs the engine supports today (`scripts/effects.js`): `addNode`, `addEdge`, `modifyStat`, `modifyResource`, `increaseDebt`, `addApproval`, `addTag`, `addTool`, `revealEdges`.

---

## 1. Product Identity & Pillars

*Dependency Hell* is an action roguelite about trying to ship one more release from inside a living software architecture.

The player clears real-time combat rooms, selects packages and patches, and watches those choices mutate a dependency graph. The graph is both map and antagonist. Every useful upgrade can introduce coupling, conflict, debt, hidden requirements, or future incidents.

### MVP target experience

- A 20–30 minute run.
- One playable character (**The Resolver**).
- One floor themed around a release candidate moving from Local Development into CI/Staging.
- A compact but expressive dependency graph.
- Combat that is readable without software knowledge.
- Consequences that feel authentic to technical players.
- A generated postmortem or release report that summarizes the run from actual state.

### Design pillars

1. **Every power has a shadow.** No upgrade is universally correct. Even the strongest item adds complexity, coupling, time cost, risk, or hidden state.
2. **The graph is the monster.** Enemies create pressure, but the dependency graph is the persistent source of run identity and long-term danger.
3. **Failure is funny and informative.** Losing produces a postmortem that makes the player laugh and understand which earlier choices mattered.
4. **The player builds their own doom.** The strongest stories come from reasonable decisions that later interact badly.
5. **Real enough to sting, abstract enough to play.** The game evokes package management, incident response, and architecture entropy through arcade rules, not literal simulation.
6. **Competence is the reward.** The best feeling is understanding the system well enough to save it just in time.

### Audience

- **Primary:** Roguelite players who enjoy strange builds, synergies, and emergent failure; technical players who recognize dependency graphs, CI failures, CVEs, rollbacks, and deployment pressure.
- **Secondary:** Action players who don't know software systems but understand risk, conflicts, hidden information, and cascading failure through icons, colors, and combat consequences.

**Accessibility requirement:** Software literacy should enrich the joke, not be required to understand game state. Use simple verbs on core UI: *requires, conflicts, patches, isolates, observes, pins, breaks*.

### Influence translation

The genre influences are design promises, not cloning targets.

**Cogmind** — required outcomes for the MVP:
- *Deep systems interactions:* packages, enemies, incidents, resources, and graph edges interact through shared rules rather than one-off scripts. A package should matter in more than one context (combat, graph state, incident likelihood, boss behavior, postmortem). The most interesting outcomes come from learnable combinations, not opaque random events.
- *Readable machine logic:* behavior feels mechanical, inspectable, and fair. When a conflict spreads, an enemy mutates, or a boss targets an edge, the player can trace the cause through visible or discoverable graph state. Hidden information is allowed, but once revealed it makes the system more understandable, not less.
- *Procedural complexity:* runs vary through graph shape, package offers, hidden relations, incidents, room order, and boss mutations — producing different *problems to reason about*, not just different layouts.
- *Emergent build identity:* by mid-run the player can describe their build in system terms ("high-observability security build," "legacy compatibility mess," "fast but brittle deploy chain," "isolated container stack"). Identity emerges from packages, topology, resources, and incident history together. Accumulated parts/tools should define both capabilities and vulnerabilities.

**Slay the Spire** — design freedoms and quality targets (not a mandate to copy a card map):
- *Strategic route selection:* where the room graph, dependency graph, or graph-scale view presents paths, routes imply different risk/reward profiles. A route can mean physical traversal, dependency routing, upgrade path, deployment path, or incident-resolution path.
- *Tradeoff-heavy upgrades:* package choices rarely reduce to "best stat wins." Upgrades ask what kind of system the player is willing to become. A strong upgrade can be correct for one build and dangerous for another.
- *Risk evaluation:* players evaluate partial information (visible reward, risk tags, suspected hidden edges, current debt, observability, upcoming pressure). Risk stays legible enough for intentional play without becoming fully solved.
- *Build-shaping decisions:* individual choices push the run toward recognizable architecture, not just temporary power.

**Papers, Please** — primarily tonal, structural, and literary:
- *Absurd bureaucracy:* the game occasionally makes the player obey systems that are technically procedural but obviously unreasonable — compliance gates, approval chains, audit blockers, vendor portals, policy exceptions, change freezes, release signoffs. Humor comes from precise institutional absurdity.
- *Earlier approvals accumulate:* small choices leave records (accepted risk, skipped test, pinned version, exception granted, undocumented migration, emergency waiver). They don't always punish immediately; they return later as audit pressure, blocked rollback, boss mutation, vendor lock-in, or postmortem cause. The player feels a process net tightening that they helped create.
- *Human-scale pressure:* decisions sometimes feel like signing off on something imperfect under deadline. The player is surviving a release bureaucracy that converts ambiguity into liability.

---

## 2. Camera & Framing

The MVP uses **side-view room combat**, as shown in the gameplay mockups. "Room-based" refers to the roguelite structure — discrete encounter spaces, branching route choices, room rewards, boss gates — not a top-down camera. Side-view spaces read as service chambers, catacombs, build stages, terminal panes, or arcade-cabinet anterooms, while the dependency graph provides the true topology underneath.

The game therefore holds **two maps at once**:

- **The visible room layout:** where the avatar fights, jumps, dodges, and clears encounters.
- **The dependency graph:** why rooms relate, what packages connect, and where systemic failure spreads.

Exploit the visual rhyme between dungeon maps, terminal minimaps, and dependency graphs — but the player should always understand which layer they are acting on.

### Graph-scale view (framing philosophy)

The default MVP camera is side-view, but the game is not conceptually locked to one camera forever. The dependency graph can become the primary full-screen play space in special rooms, pauses, boss phases, postmortems, or later levels. Treat this as a **graph-scale view**: the analog to a bird's-eye dungeon map, except the map *is* the software architecture.

The **FTL** comparison is central. Graph-scale view is designed to become the game's subsystem-triage layer: pausable or slowed panic, cascading failures, limited attention, and choices about which failing node, edge, service, or package to save first. It is not merely a larger decorative minimap.

- **(implemented)** For MVP, graph-scale interaction is **pause/between-room inspection and package-choice context**. Combat uses the graph as a live minimap and consequence surface, not an active tactical board. Traversal uses the dependency graph as the map: clearing a body-scale room exposes graph exits; a single valid exit auto-advances, multiple exits present a graph-route choice. No literal hallway walking.
- **(planned)** Promote graph-scale view into active gameplay once graph rules are proven: select a node to patch, sever an edge temporarily, isolate a subsystem, trace infection spread, reroute around a conflict, or choose a deployment path. The UI must always signal clearly whether the player is acting on the avatar-scale room or the system-scale graph.

---

## 3. Resources

The MVP uses three resources. All three are **(implemented)**.

### Stability (health)

Health equivalent. Reaches zero on run failure.

- **Damage sources:** enemy hits, failed builds, active conflicts, uncontained incidents, boss attacks through graph edges.
- **Recovery sources:** successful test room, rollback, package effects, rare room rewards.

### Observability (0–5, info budget)

- **High observability reveals:** enemy intent, hidden package tags, conflict likelihood, future room hazards, weak graph edges, postmortem accuracy.
- **Low observability hides:** exact conflict cause, enemy modifiers, whether an item risk is immediate or delayed, some graph edges until they activate.

Observability controls what the player *sees*, not whether the underlying truth exists. Its three visibility states drive the graph (see §4).

### Technical Debt (Technical Debt Ratio)

Accumulated shortcut pressure — a numeric meter plus tags.

- **Increases from:** skipping tests, accepting quick fixes, pinning versions, installing shims, using unreliable mirrors, ignoring warnings.
- **Effects:** raises chance of debt events; adds enemy modifiers; mutates boss choice/attacks; lowers quality of shops and rewards at thresholds.

**Threshold bands (planned tuning):**

| Band | State |
| --- | --- |
| 0–24 | Clean enough |
| 25–49 | Warnings and minor hazards |
| 50–74 | Debt events, stronger conflicts |
| 75–100 | Forced incident before boss; boss receives a debt mutation |

Debt is a meter plus tags. The numeric meter drives thresholds; tags drive specific postmortem lines and event weights. Example tags: `debt.quick_fix`, `debt.pinned_versions`, `debt.skipped_tests`, `debt.compatibility_shim`, `debt.unreliable_mirror`. (The engine's `increaseDebt` verb feeds this today; Feature Flag adds configuration-drift debt on each use.)

---

## 4. Dependency Graph & Edge/Relation Types

The graph is a node-and-edge model attached to the run. It is also the run's **location topology**: side-view combat rooms are body-scale chamber views of graph loci; the minimap and paused graph show the system-scale map. This is expressed through current-location highlights, route pressure, and consequence spread — not lore.

- **(implemented)** Initial graph seeds at **6 nodes / 5 edges**, including a **hidden Modern Crypto conflict seed** that a LegacyAuth install can later activate. Current rooms have graph anchors so the minimap and paused graph show player location without a separate dungeon map.

### Node categories

- **Core:** app, runtime, standard-lib, core-lib.
- **Package:** installable item or upgrade.
- **Tool:** test suite, debugger, rollback, feature flag.
- **Service:** room/floor component.
- **Hazard:** active bug, CVE, circular dependency, unpublish event.

### Edge / relation types

The full formal model targets **7 edge types (planned):** `requires`, `conflicts`, `patches`, `isolates`, `observes`, `pins`, `infects`. (The engine creates edges today via `addEdge` and reveals suspected edges via `revealEdges`; the full formal typing set is aspirational.)

### Node fields

`id`, display name, category, tags, visible properties, hidden properties, stability modifier, observability modifier, debt modifier, combat modifiers, incident hooks.

### Edge fields

source node, target node, relation type, strength (1–3), **visibility state** (`known`, `suspected`, `hidden`), **active state** (`dormant`, `active`, `broken`).

### Legibility rule

Players should see enough to make a reasoned choice, but not enough to eliminate risk. A bad outcome should feel like "I knew this might happen," never "that was arbitrary."

---

## 5. Room Types & Route Profiles

**MVP floor:** Release Candidate Pipeline (Local Development → CI/Staging).

- **(implemented)** The shipping build is a **fixed 5-room pipeline** ("First Slice"): two combat rooms, one package choice, a **Verification Fork** post-package branch room that reshapes enemy pressure and event-log consequences based on the installed package, and a Staging Incident room. Local Development offers a graph route choice (fast path to Package Gate, or Runtime Detour for an extra fight and a small Stability reward). One-exit rooms auto-follow their graph exit.
- **(planned)** Procedural generation of **10–14 rooms** from weighted templates: 3–5 combat, 2 package, 1 test, 1 incident, 1 observability/refactor, 1 shop/vendor, 1 boss, plus an optional archive/mirror side room. Generate one room path from start to boss with 2–4 side branches. Required slots: start, package, combat, test/observability, incident, package, boss. Optional slots: vendor, archive, mirror, refactor. The room map is traversal; the dependency graph is system structure; some room choices create or reveal graph relations; some route choices shape build direction by changing package pools, debt, observability, incident weights, or boss risk scores.

### Room types (planned catalog)

| Room | Purpose | MVP Mechanics | Art/Audio Notes |
| --- | --- | --- | --- |
| Local Development | Start/tutorial | Basic combat, first graph view | Calm terminal glow |
| Combat Room | Core action | Enemy wave, room reward | Clean silhouettes |
| Package Room | Build shaping | Choose 1 of 3 packages, graph preview | Overlay like mockup 2 |
| Test Room | Risk reveal | Timed objective reveals hidden edges | Test pass/fail cues |
| Incident Room | Crisis triage | Timed hazard tied to graph state | Klaxons, red logs |
| Observability Room | Info upgrade | Increase observability or reveal cluster | Scanline pulse |
| Refactor Room | Debt relief | Remove debt, weaken edge, or isolate node | Calm repair effects |
| Archive Room | Legacy reward | Find old docs, shim, or legacy package | Dusty terminal vibe |
| Mirror Room | Risky reward | Deprecated package with security/debt risk | Unstable flicker |
| Vendor Room | Shop | Buy expensive tools with tradeoffs | Polished but suspicious UI |
| Boss Room | Reckoning | Adaptive boss based on graph state | Large graph effects |
| Postmortem Room | Failure summary | Explain run state after death | Mockup 3 reference |

### Route profiles (planned)

Optional tools for Slay-the-Spire-inspired route selection; use where they make a run more strategic, not as a mandatory map formula.

| Route Profile | Visible Promise | Visible/Suspected Risk | Build Pressure |
| --- | --- | --- | --- |
| Safe Validation Path | Test room, observability reward, lower incident chance | Lower combat/package reward | Careful, information-rich builds |
| Risky Package Path | Extra package room or rare package chance | Hidden conflict, mirror, or security risk | High-power unstable builds |
| Debt Relief Detour | Refactor room, debt reduction, edge repair | Costs time/reward; may skip package offer | Long-run stability |
| Legacy Shortcut | Skips combat or unlocks archive/vendor access | Adds legacy dependency or upgrade pressure | Compatibility builds |
| Incident Shortcut | Faster path to boss or reward | Forced incident or lower stability | High-velocity shortcut builds |
| Boss Prep Branch | Tool, scanner, feature flag, or container reward | Longer path with more enemies | Targeted boss counterplay |

---

## 6. Package / Item / Tool Catalog

Packages are the primary build-shaping rewards.

**Package choice format:** present 3 options; show name, icon, immediate benefit, visible risk tags, and graph preview; hide some exact interactions based on observability; after choice, animate graph node insertion and edge changes.

- **(implemented)** Four packages ship: **LegacyAuth, Test Suite, Compatibility Shim, Feature Flag.** The package choice overlay renders a **live SVG graph "mutation preview"** (ghost nodes/edges shown on hover/focus before install), generated from the same effect data that applies the package. Test Suite adds `test_coverage`, reveals suspected graph edges broadly (turning the yellow CI relation from suspected to known), and softens the Staging Incident so an Observability build gets a distinct consequence branch.
- **(planned)** A minimum of **24 packages**: 8 low-risk/common, 8 medium-risk/build-shaping, 4 high-risk/high-reward, 4 defensive/process tools.

**Package classes:** *Utility* (small stat benefits, low but nonzero graph risk), *Infrastructure tools* (strong defensive/observability effects, may slow player or add requirements), *Legacy systems* (unlock routes/rewards, conflict with modern packages), *Shortcuts* (immediate strong benefit, debt or hidden hazard), *Process improvements* (reveal info, lower risk, weaker in combat).

### Core package roster (planned; implemented ones marked)

| Package | Immediate Benefit | Shadow/Risk | Graph Effects | Tags | Status |
| --- | --- | --- | --- | --- | --- |
| Logging Framework | Reveals enemy health and hazards | Adds dependency | Adds `observes` edge from app | observability, common | planned |
| Test Suite | Reveals hidden package risks | Slower room rewards | Adds `observes` edges; lowers event uncertainty | observability, process | **implemented** |
| Left Pad | Slight fire-rate increase | Unpublish chance | Adds small utility node | utility, unpublish | planned |
| LegacyAuth | Unlocks old rooms; lowers old-system aggro | Conflicts with modern crypto | Adds legacy auth node and old-crypto requirement | legacy, auth, risk | **implemented** |
| Modern Crypto | Secure damage type; anti-CVE | Conflicts with LegacyAuth | Adds secure dependency and conflict hooks | security, damage | planned (conflict seed present) |
| Containerization | Reduces conflict spread | Startup delay | Adds `isolates` edges | isolation, defense | planned |
| Feature Flags | Disable node/hazard briefly | Adds process complexity | Adds `patches`/`isolates` edge | control, active | **implemented** |
| Rollback Plan | Undo recent damage or install | Blocked by migrations | Adds rollback capability tag | defense, active | planned |
| Compatibility Shim | Resolves one conflict | Adds Technical Debt | Adds `patches` edge between incompatible nodes | debt, fix | **implemented** |
| Pin Version | Prevents surprise upgrades | Upgrade pressure later | Adds `pins` edge | stability, debt | planned |
| Vendored Dependency | Immune to unpublish | No automatic security patch | Replaces upstream edge with local node | security_risk, stable | planned |
| Debugger | Slows time / reveals enemy weak point | Lower velocity | Adds `observes` edge | active, observability | planned |
| Cache Layer | Repeats last successful action | Stale-state hazards | Adds cache node, possible `infect` edge | defense, weird | planned |
| API Gateway | Converts some conflicts into latency | Centralizes coupling | Adds connector node | routing, coupling | planned |
| Message Queue | Delays damage bursts | Backlog hazards | Adds buffer node | defense, latency | planned |
| Schema Migration | Unlocks rewards and rooms | Can block rollback | Adds migration tag and edge | high_reward, risk | planned |
| CI Pipeline | Rewards test rooms; catches regressions | Slower early progress | Adds process node | process, test | planned |
| Shady Mirror | Cheap rare package | Security risk | Adds hidden `infect` edge chance | mirror, security_risk | planned |
| Accurate Documentation | Reveals hidden properties | Rare, little combat power | Upgrades visibility | legendary, observability | planned |
| Friday Deploy | Huge immediate reward | Raises all event weights | Adds debt and incident tags | high_reward, danger | planned |
| Enterprise Service Bus | Connects distant nodes | Global coupling | Adds high-degree connector | coupling, high_risk | planned |
| Kubernetes | Self-healing chance | Adds config hazards | Adds orchestration node and requirements | scale, complexity | planned |
| Security Scanner | Reveals CVE events early | Can force costly decisions | Adds `observes` security edges | security, observability | planned |
| Rubber Duck | Reveals one clue after stillness | No direct combat power | Adds clue-generation hook | weird, support | planned |

### Additional candidate packages/tools (planned)

These candidates add verbs, graph effects, later consequences, and puzzleable logic rather than flat stat stacking.

- **Feature Flag** *(implemented as an active tool — see below)*. Active tool that temporarily disables a graph node or edge. Combat verb: place a short-lived toggle/flag field that suppresses an enemy modifier, hazard, or spawn source. Graph effect: marks one edge/node flagged off for the next room or incident. Synergies: Test Suite identifies the best target; LegacyAuth can suppress an old-system conflict while leaving audit evidence; Compatibility Shim + flags solves immediate crises while raising debt. Failure logic: overuse creates configuration drift or stale-flag incidents.
- **Circuit Breaker.** Active defensive tool. Combat verb: deploy a barrier/pulse that blocks projectiles or interrupts charging enemies. Graph effect: temporarily blocks failure spread across one connected edge. Synergies: Test Suite reveals the edge worth breaking; LegacyAuth may make old systems recover slower after a trip. Failure logic: prevents cascade but can create timeout/degraded-service enemies.
- **Canary Deploy.** Risk-preview package or active tool. Combat verb: creates a fragile canary process that follows the player or holds a point. Graph effect: previews one downstream consequence before committing to a route, package, or incident. Synergies: Test Suite makes canary reports more specific; Compatibility Shim makes canary pass faster but less reliable; LegacyAuth can produce false confidence around old-system paths. Failure logic: if the canary dies, the incident starts early or becomes partially hidden.
- **Lockfile / Pin Version.** Strategic package (minimal combat verb; better as build-shaping). Graph effect: pins a node/edge so it cannot mutate unexpectedly. Synergies: prevents certain conflict escalations but blocks some upgrade paths/route options. Failure logic: stable but aging — later CVE or deprecation pressure.
- **Dependency Inversion.** Advanced graph-routing package/tool. Combat verb: parry or redirect an enemy attack. Graph effect: reverses or reroutes an edge, changing where risk propagates. Synergies: can isolate a dangerous dependency behind an adapter path; careless use creates indirect coupling. Failure logic: powerful but cognitively heavier — better after the player understands graph-route logic.

### Player weapon / tool verbs

- **(implemented)** The Resolver starts with a **close-range glowing patch blade** (matching the mockups). The **Feature Flag active tool** (`F`) temporarily flags the current graph locus for a few seconds, slows/disarms the active wave, suppresses incident drain, and adds configuration-drift debt each use.
- **(planned)** Ranged weapons as later package/tool upgrades rather than a default verb; plus: *Patch* (basic projectile), *Rollback* (undo recent damage / clear one hazard), *Container* (isolation field preventing infection/conflict spread), *Shim* (converts damage type or compatibility requirement), *Debugger* (slows enemy / reveals weakness), *Kill -9* (heavy damage with collateral graph risk).

### First build archetypes to support (planned)

- **Observability:** Logging Framework, Test Suite, Debugger, Accurate Documentation. Lower surprise, lower raw damage.
- **Isolation:** Containerization, Feature Flags, API Gateway, Rollback Plan. Controls spread but can slow combat.
- **High-velocity shortcut:** Friday Deploy, Shady Mirror, Left Pad, Schema Migration. Strong early rewards, high debt and incidents.
- **Legacy compatibility:** LegacyAuth, Compatibility Shim, Vendored Dependency, Pin Version. Unlocks routes and survives old systems, risks upgrade boss.
- **Security:** Modern Crypto, Security Scanner, Test Suite, Containerization. Strong against CVE/audit pressure, may conflict with legacy nodes.

---

## 7. Enemies & Bosses

Combat should be immediate and readable. Technical meaning influences behavior, but players learn enemies visually. Enemy design principle: **one clean silhouette, one memorable rule, one readable warning state, one graph interaction for advanced play.**

### Enemies

- **(implemented)** Three enemies ship:
  - **Regression** — returns after being defeated with a changed pattern; spawns from skipped tests/debt; Test Suite reduces respawn.
  - **Breaking Change** — **ranged projectiles**; charges/damages connected nodes and edges; counter with dash and containment.
  - **Memory Leak** — **grows and speeds up when damaged**; drains Stability if the room takes too long; focus early.
- **(planned)** Full roster of **10 enemies**:

| Enemy | Readable Behavior | Graph Interaction | Counterplay | Art Notes | Status |
| --- | --- | --- | --- | --- | --- |
| Regression | Returns after defeat with changed pattern | Spawns from skipped tests/debt | Test Suite reduces respawn | Familiar enemy, corrupted variant | **implemented** |
| Breaking Change | Charges in straight lines (ranged) | Damages connected nodes/edges | Dash, Containerization | Angular red warning trail | **implemented** |
| Memory Leak | Grows over time / when damaged | Drains Stability if room drags | Focus early | Expanding blob/bar meter | **implemented** |
| Transitive Bug | Small, spreads to linked enemies | Infects connected nodes if ignored | Kill early, isolate | Pixel swarm through graph edge | planned |
| Version Conflict | Splits into two incompatible forms | Needs matching damage/tool | Shim or Modern Crypto | Two-color mirrored sprite | planned |
| Deprecated API | Slow, leaves poison zones | Increases debt if ignored | Burst damage | Faded old terminal glyphs | planned |
| Race Condition | Flickers, attacks unpredictably | Intent hidden at low observability | Debugger / Test Suite | Strobing silhouette | planned |
| Circular Dependency | Linked pair heals when only one is damaged | Creates cycle edge | Break link with Feature Flag | Two enemies with visible arc | planned |
| License Violation | Low threat, summons blockers | Raises audit/security event weight | Prioritize before summon | Paperwork/stamp motif | planned |
| Supply Chain Imposter | Disguised pickup/enemy | Adds hidden `infect` edge | Observability reveal | Friendly icon turns hostile | planned |

### Bosses — **(planned; none implemented)**

The MVP design targets two adaptive bosses. Boss risk scores are tracked throughout the run; at boss-room entry, select the highest score if it passes a minimum threshold, otherwise select the default (Major Version Upgrade), then apply mutation tags based on secondary scores.

**The Major Version Upgrade** — triggered by too many pinned packages, many old/legacy nodes, multiple suppressed update pressures.
- *Fight identity:* attacks through graph edges; forces compatibility windows; temporarily invalidates old packages; summons Version Conflict enemies.
- *Counterplay:* Test Suite reveals safe windows; Rollback clears one failed migration; Feature Flag disables a risky subsystem; Containerization limits blast radius.
- *Readability:* show old nodes flashing before attacks.
- *Score:* +2 per pinned node, +2 per legacy node, +3 per suppressed upgrade event, +1 per old-runtime edge.

**The Distributed Monolith** — triggered by high coupling, too many cross-graph edges, ESB-style connectors, low isolation.
- *Fight identity:* large central node with many tentacle-like edges; damaging one subsystem can enrage linked subsystems; spawns Transitive Bug and Circular Dependency enemies.
- *Counterplay:* Refactor weakens edge clusters; Containerization cuts spread; Observability reveals the true weak point; Kill -9 bursts a segment but risks collateral.
- *Readability:* show the central node and edge attacks clearly.
- *Score:* +1 per edge above baseline, +2 per node degree above 4, +3 per global connector package, +2 per active circular dependency, −2 per isolation edge.

### Events / Incidents

- **(implemented)** Three incidents fire in **Staging** from conflict edges and/or debt: **Build Failure, Audit Pressure, Minor Regression.**
- **(planned)** Full incident/event set — run-level pressure created by graph state. Event selection weighs graph state; never fire events unrelated to prior choices.

| Incident | Trigger Weight | Player Choice | Consequence |
| --- | --- | --- | --- |
| Critical CVE | security risk, legacy, vendored deps | Patch, isolate, accept risk | Patch may add debt; isolate lowers reward; accept risk raises boss/event danger |
| Dependency Unpublish | Left Pad, unpinned utility deps | Vendor, replace, scramble | Vendor adds debt/security risk; replace creates conflict chance |
| Build Failure | active conflict edges | Debug, rollback, push through | Debug reveals cause; rollback may be blocked; push through damages Stability |
| Circular Coupling | high graph cycles | Refactor, feature flag, ignore | Refactor costs reward; flag temporary; ignore creates boss mutation |
| Maintainer Abandonment | old/unmaintained packages | Fork, replace, pin | Fork creates parallel node; replace risks conflict; pin adds pressure |
| Surprise Demo / Customer Feature Promise | high velocity/low confidence | Ship, delay, fake it | Ship raises reward/risk; delay lowers debt/reward; fake it adds hidden incident |

Additional documented events: **Maintainer Abandonment** (upgrade path closes; future patches cost more) and **Critical CVE** (security-tagged node creates timed pressure).

### Bureaucracy & approval hooks (planned)

These carry the Papers, Please influence — absurd process and earlier approvals that return later as system consequences. Mechanically lightweight (tags + event-log entries) but queryable and visible. The engine already tracks approvals via the `addApproval` verb.

| Hook | Immediate Use | Later Consequence | Tone |
| --- | --- | --- | --- |
| Security Exception | Allows vulnerable package temporarily | Audit pressure, forced patch, postmortem contributing factor | "Approved pending review by nobody available." |
| Change Freeze Waiver | Enables upgrade during restricted phase | Boss mutation, rollback blocked, compliance event | "Emergency exception was correctly misfiled." |
| Skipped Validation | Saves time or unlocks faster route | Hidden conflict, lower build confidence, regression | "Test evidence marked as aspirational." |
| Vendor Approval | Unlocks powerful vendor package/shop | Vendor lock-in, cost spike, impossible portal requirement | "Enterprise tier includes fewer answers." |
| Risk Acceptance | Avoids immediate incident cost | Later breach/audit/build-failure weight | "Risk accepted by the person currently on fire." |
| Documentation Signoff | Reveals item info or unlocks archive | Can be contradicted by stale docs later | "Accurate when printed, allegedly." |

---

## 8. Failure & Victory (run end states)

Both end states are **(implemented)** and generate a **traceable timeline** from real run facts.

**Victory — Release Report** (win). Uses release language, not postmortem language ("Cause"/"contributing factors" are reserved for failures unless a success is explicitly framed as a barely-contained incident). Required sections: version shipped, customer impact, known issues, security risk, technical-debt state, morale/team state (flavor, if tracked later), final architecture summary, 3 notable decisions.

**Failure — Mini Postmortem** (0 Stability). Required sections: incident title, primary cause, contributing factors, what went well, action items, timeline of 3–5 important run events, graph visualization showing the failed node cluster.

Postmortem/report text is generated from actual run facts, not random jokes — templates can be funny, but the nouns and causes must be true.

**Postmortem template inputs (facts to track during a run):** first risky package installed; highest-degree node; first hidden conflict revealed; highest Technical Debt value; lowest Observability at incident time; most useful mitigation; rollback success/failure; boss selected and why; final cause of failure/victory; accepted risks, waivers, approvals, or skipped validations that later mattered.

Example template:

```text
Incident: {failure_context} during {room_or_boss}.
Primary Cause: {node_a} {relation} {node_b}, amplified by {risk_tag}.
Contributing Factors: {top_3_state_facts}.
What Went Well: {mitigation_that_helped}.
Action Items: {3_suggestions_from_actual_causes}.
```

---

## 9. Visual Identity & Art Direction

> **Staleness note.** The concept-art mockup *text descriptions* in `docs/concept-art/*.txt` describe a **top-down** perspective. The design has since **pivoted to side-view** (see §2). Treat those `.txt` files as **historical**. The `.jpg` mockups (`DependencyHell-gameplay-mockss1–4.jpg`) remain valid **reference only** for visual/HUD/graph language. The CRT reference asset lives in `docs/fracking.css` — reference it, don't inline it.

### Visual target & identity

- Haunted arcade cabinet built by a build server.
- CRT frame and scanline feel; dark background, phosphor glow; warning reds, terminal greens/cyans, conflict yellows/oranges.
- Low-resolution sprites or vector-pixel hybrids.
- Dependency graph as a satisfying electric object (glowing square nodes, electric edge arcs), not a dry dashboard.
- Left-side log noise and bottom-right minimap; large failure typography reserved for critical moments.

**(implemented)** CRT presentation: procedural canvas backdrop, scanlines, and an animated glitch side-rail.

**Combat readability comes first.** Logs, graph overlays, and terminal text must never obscure bullets, enemies, or player state during normal play.

**Avoid:** modern SaaS dashboard aesthetics; clean corporate vector UI; small terminal text as *required* gameplay information; effects that obscure player/enemy silhouettes.

### Palette (functional colors)

| Function | Color |
| --- | --- |
| Player / action | Cyan / green |
| Stability / health | Red |
| Observability / info | Cyan |
| Technical debt / warning | Amber |
| Conflict / failure | Red / orange |
| Hidden / suspected | Dim violet or dashed pale line |
| Safe / validated | Green |

Color must always be backed by icon/shape language for accessibility.

### The player character (The Resolver)

- Tiny readable humanoid/process avatar — glowing vector/pixel silhouette matching the mockups.
- Simple facing and attack animations; color state shifts based on Stability and active debuffs.
- Base stats: Stability 100; Observability 2/5; Technical Debt 0; medium move speed and fire rate; base weapon the close-range patch blade; utility Rollback (limited charges).
- Controls support keyboard/mouse and controller from the start: move, aim, fire/attack, dash/short evade, use active tool, open graph view, confirm/cancel package choice.

### Graph presentation scales

The graph supports three scales (see also §2):

- **Minimap:** compact combat HUD, low interaction; pulses on graph events; not fully interactive during combat.
- **Full graph view:** pause/between-room inspection and package preview; pan/zoom, node/edge inspect, relation legend, install preview, confirm/cancel. Prioritize stable readable positions over physically accurate motion.
- **Graph-scale play space:** full-screen system-layer view (the bird's-eye/FTL-triage surface) for special rooms, boss phases, postmortems, or later levels. Don't make art/UI assumptions that prevent this mode from becoming interactive later.

### Node & edge visual states

- **Node states:** normal, selected, installed, suspected, hazardous, broken, isolated, pinned.
- **Edge states:** requires, conflicts, patches, isolates, observes, pins, infects.

### Sprite requirements (planned asset list)

- **Player:** idle, run, fire, dash, hit, install/use tool, death/failure.
- **Enemies:** each needs idle/move, attack telegraph, hit, death, and a graph-interaction effect where relevant.
- **Bosses:** core sprite, edge/tendril attack effects, phase transition, failure/collapse.
- **Packages:** 24 icons at small and large sizes; icon categories instantly readable (package, shield, eye, sword/patch, gear/tool, warning, pin, container).
- **Room/hazard:** 8 room/hazard tiles or backdrops; HUD frame; postmortem graph-visualization elements.

### Animation & effects

Package-install node insertion; conflict edge activation; infection spread along edge; rollback reversal; test-reveal pulse; build-failed warning; boss graph attack; Stability damage flicker.

### Audio direction — **(planned; no audio implemented)**

Target: retro arcade energy + office panic + machine-room dread. Functional cues: player fire/hit/dash/death; enemy hit/death per family; package install (satisfying but slightly ominous); conflict activation (sharp electric crackle); observability reveal (clean scan/ping); debt threshold (warning tone); test pass (chime) / test-fail-build-fail (harsh CI cue); boss intro/edge attack (rising voltage/connection snap); postmortem ambience.

Music reacts to system state in simple layers first: base exploration/combat, incident percussion, low-stability tension, high-debt detune, boss layer. The mix may become muffled under low observability as a thematic touch, but keep important gameplay cues audible. Don't overbuild adaptive music beyond stability/debt/incident toggles for MVP.

---

## 10. Design Decisions & Rationale Log

Decisions and rationale carried forward from the Technical Creative Director's working notes and UAT.

### First-slice bet & scope

- **Zero-build browser prototype.** The first slice is a zero-build browser prototype, directly openable from `index.html`, keeping the earliest playable loop easy to run, inspect, and throw away if a stronger engine choice emerges. (Runtime-system design favors tunable data, composable rules, and clear event logs over literal package-manager simulation. The biggest technical risk is the graph-effect framework — keep it small, inspectable, and content-driven. Code file architecture is documented in `AGENTS.md`.)
- **Graph as location topology, not a second dungeon map.** The dependency graph *is* the run's location topology; side-view rooms are body-scale chambers of graph loci. Do not design the room map and dependency graph as competing navigational systems.
- **Traversal uses the graph as the map.** Clearing a body-scale room exposes graph exits. One valid exit → auto-advance; multiple exits → player chooses the next locus from a graph-route view. No literal body-scale hallway walking unless it creates meaningful combat, risk, reward, or pacing. Room progression is route-based, not array-index teleportation.
- **Graph-scale interaction starts passive.** For MVP the graph is a live minimap and consequence surface plus a paused inspection/package-context surface — not yet an active tactical board. The design preserves the option to promote it later.

### Combat & feel decisions (UAT)

- **Close-range patch blade is the default verb.** The Resolver starts with a close-range glowing patch blade matching the mockups. Ranged weapons arrive later as package/tool upgrades rather than the default.
- **Combat feel additions:** clearer enemy telegraph rings, hit sparks, brief hit-stop, player invulnerability flash, and dash afterimages.
- **Contact damage uses update-loop windups, not delayed timers,** so resetting from a report cannot leak old hits into a new run.
- **Room transitions show a short pause banner.** Combat-room subtitles describe the immediate threat; package-choice language belongs on the paused upgrade overlay.

### Package, effect & preview decisions (UAT)

- **Package claims must match reusable effect operations.** Effects are content data + reusable operations, not bespoke per-package code. Example: Test Suite now reveals suspected graph edges broadly, so the yellow CI relation becomes *known* instead of staying visually unchanged.
- **Preview from the same data that applies the effect.** Hovering/focusing a package choice previews graph mutations as ghost nodes/edges before install, generated from the same effect data that applies the package.
- **Feature Flag is the first active tool.** It unlocks `F`, temporarily flags the current graph locus, suppresses incident drain and enemy pressure, and leaves configuration-drift debt for reports — the first package/tool with a genuinely active combat verb.
- **Verification Fork branch room.** A post-package branch room that changes enemy pressure and event-log consequences based on the installed package, before the Staging Incident. Test Suite softens the staging incident so an Observability build has a distinct consequence branch.
- **Route choice at Local Development.** Fast path to the Package Gate, or a Runtime Detour for an extra fight and a small Stability reward — an early demonstration of readable route tradeoffs.

### UI & reporting decisions (UAT)

- **Reserve the lower screen band for instrumentation.** UAT (`docs/UAT/ss1-play.png`) showed the dependency-graph panel hiding player/enemies; the combat floor was raised and the minimap height reduced.
- **The minimap can stay compact when a paused graph view exists.** `G`, the minimap, or `INSPECT` opens a larger clickable graph with node/edge cause tracing from run-state and event-log facts.
- **Rooms have graph anchors** so the minimap and paused graph show player location without a separate dungeon map.
- **Victory uses release language, not postmortem language.** "Cause" and "contributing factors" are reserved for failures unless a success is explicitly framed as a barely-contained incident.
- **Restart copy** changed from "Run it back" to "New run" — the button resets the run, it doesn't replay it.

### Acceptance criteria (design targets)

The MVP is successful when: a player can complete or fail a run; package choices visibly mutate the graph; at least 6 packages have meaningful interactions with other packages or graph state; at least 3 failure modes are traceable to earlier decisions; observability changes what information is visible; technical debt changes event or boss behavior; the boss adapts to accumulated graph shape; the postmortem uses real run state and feels specific; combat stays readable even with graph/log overlays; the run produces describable emergent build identity; procedural variation changes the *problems* players reason about; major consequences follow readable machine logic traceable through graph state, event logs, or postmortems; route/upgrade/event choices include meaningful risk evaluation instead of obvious best answers; at least one route decision and one package decision visibly shape build direction; earlier approvals or accepted risks can return as concrete run consequences; and the game includes at least a small amount of dry bureaucratic absurdity.

---

*See `docs/roadmap.md` for delivery scope/sprints. Code file architecture lives in `AGENTS.md`. Visual reference: `docs/fracking.css` (CRT) and `docs/concept-art/*.jpg` (mockups — the `.txt` companions are historical top-down descriptions).*
