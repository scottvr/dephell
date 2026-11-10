# Package Roster (24-package MVP target)

The MVP scope target is 24 packages/items/tools ([`roadmap.md` §2](roadmap.md#2-mvp-scope-targets)). **12 are implemented and shipping**; the remaining 12 are drafted here against the coherence rubric so the pool can grow without re-deriving scope.

Every package must pass the design gate: (1) changes what the player can do, (2) mutates/reveals/blocks/reinterprets the graph, (3) creates a traceable later consequence, (4) combines with ≥2 systems, (5) enables a clever prediction. No package is a pure stat bump. Rubric scores are agency / traceability / graph-relevance / interaction-surface / counterplay (need ≥7/10); enforced pre-ship by `tools/lint-content.js` and balance-checked by `tools/simulate.js`.

## Implemented (12)

| Package | Primary axis | Graph role | Signature consequence | Rubric |
| --- | --- | --- | --- | --- |
| LegacyAuth | legacy compatibility | adds legacy node + suspected conflict | wakes crypto conflict → Build Failure; audit pressure | 9 |
| Test Suite | observability / process | promotes suspected → known | banks `test_coverage` (softens next incident); reveals edges | 9 |
| Compatibility Shim | shortcut / debt | adds `patches` edge | +debt; Build Failure blames the shim first | 8 |
| Feature Flag | active control | flags a locus (`flags` edge) | suppresses incident drain; leaves configuration drift; counts as a suppressed upgrade at the boss | 9 |
| Modern Crypto | security / crypto | reveals hidden node + patch seed | flips next incident to Build Failure with LegacyAuth; registers a crypto migration that **locks Rollback** | 9 |
| Logging Framework | observability | adds `observes` hub | reveals enemy HP/telegraphs (`hazard_visibility`); noisy debt feeds Audit Pressure | 9 |
| Containerization | isolation | adds `isolates` edge | blocks cascade; **−2 Distributed Monolith** score; −1 observability | 10 |
| Rollback Plan | active control | adds `reverts` edge | R: restore recent Stability + clear a wave; **disabled by any `upgrade` risk** | 9 |
| Pin Version | build / legacy | pins libglitch | Breaking Change −6 dmg; **+3 Major Version Upgrade**; registers upgrade risk (locks Rollback) | 10 |
| Security Scanner | security / audit | reveals hidden security edges | files CVE + unpublish risks (`risk_registered` softens Audit); +audit-backlog debt | 10 |
| Circuit Breaker | active control / isolation | adds `breaks` edge | C: block projectiles + halt cascade ~4s; fallback-path debt | 9 |
| Rubber Duck | observability (absurd) | adds `explains` edge | stand still ~1.6s to reveal one hidden edge/node; +1 observability | 9 |

## Drafted for the pool (12 more → 24)

Each is authored against implemented or promised effect verbs only; a few flag a verb the engine still needs (noted). Scores are design-target estimates pending implementation + simulation.

| Package | Primary axis | Effect sketch (implemented verbs) | Later consequence | Notes / verb gap |
| --- | --- | --- | --- | --- |
| Left Pad | utility | `addNode` leaf + `modifyStat` fireRate; `registerRisk` unpublish | fuels Dependency Unpublish incident | ready |
| Vendored Dependency | security / stability | `addNode` local + `increaseDebt`; `registerRisk` upgrade | immune to unpublish; no auto security patch | ready |
| Debugger | observability / active | `addTool` + `addEdge observes` | slows an enemy / reveals weak point | needs a `debugger` tool verb in game.js |
| Cache Layer | cache / weird | `addNode` cache + `addEdge` (possible `infects`) | repeats last action; stale-state hazard | ready |
| API Gateway | routing / coupling | `addNode` connector + high-degree `addEdge` | **+Distributed Monolith** (global connector) | ready (addBossScore) |
| Enterprise Service Bus | coupling / enterprise | `addNode` hub + several `addEdge` | biggest Monolith contributor; boss attacks through it | ready |
| Kubernetes | scale / complexity | `addNode` orchestration + `addEnemyModifier` | self-heal chance; YAML hazards; +Monolith | ready |
| Schema Migration | high_reward / risk | `addApproval` + `addEdge` | unlocks rooms; **blocks Rollback** | ready |
| Friday Deploy | high_reward / danger | `increaseDebt` + `addBossScore` both | huge reward now; raises every event weight | ready |
| Canary Deploy | observability / preview | `modifyResource` obs + `registerRisk` | previews one downstream consequence | needs a preview surface |
| Accurate Documentation | legendary / observability | `revealNode` + `revealEdges` | reveals hidden item properties (rare) | ready |
| Dependency Inversion | routing (advanced) | `addEdge` reroute + parry verb | reroutes where risk propagates | needs a `modify_edge` verb |

## Build archetypes the roster supports

- **Observability:** Logging Framework, Test Suite, Rubber Duck, (Debugger, Accurate Documentation) — foresight over damage.
- **Isolation:** Containerization, Circuit Breaker, Feature Flag — controls spread, counters the Monolith.
- **High-velocity shortcut:** Compatibility Shim, (Friday Deploy, Left Pad) — early power, high debt.
- **Legacy compatibility:** LegacyAuth, Pin Version, (Vendored Dependency) — unlocks routes, feeds the Major Version Upgrade.
- **Security:** Modern Crypto, Security Scanner, Test Suite — strong vs CVE/audit, conflicts with legacy.
- **Coupling (the trap):** Dependency Injection branch, (ESB, API Gateway, Kubernetes) — power that summons the Distributed Monolith.
