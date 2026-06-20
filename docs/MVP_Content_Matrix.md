# Dependency Hell MVP Content Matrix

This matrix gives designers, engineers, artists, and writers a concrete starting content set. Names and numbers are tunable. The goal is to cover the MVP system space with enough interactions to prove the concept.

## 1. Room Types

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

## 2. Route Profiles

Route profiles are optional tools for Slay the Spire-inspired route selection. They should be used where they make a run more strategic, not as a mandatory map formula.

| Route Profile | Visible Promise | Visible/Suspected Risk | Build Pressure |
| --- | --- | --- | --- |
| Safe Validation Path | Test room, observability reward, lower incident chance | Lower combat/package reward | Pushes toward careful, information-rich builds |
| Risky Package Path | Extra package room or rare package chance | Hidden conflict, mirror, or security risk | Pushes toward high-power unstable builds |
| Debt Relief Detour | Refactor room, debt reduction, edge repair | Costs time/reward; may skip package offer | Supports long-run stability |
| Legacy Shortcut | Skips combat or unlocks archive/vendor access | Adds legacy dependency or upgrade pressure | Supports compatibility builds |
| Incident Shortcut | Faster path to boss or reward | Forced incident or lower stability | Supports high-velocity shortcut builds |
| Boss Prep Branch | Tool, scanner, feature flag, or container reward | Longer path with more enemies | Supports targeted boss counterplay |

## 3. Packages

| Package | Immediate Benefit | Shadow/Risk | Graph Effects | Content Tags |
| --- | --- | --- | --- | --- |
| Logging Framework | Reveals enemy health and hazards | Adds dependency | Adds observes edge from app | observability, common |
| Test Suite | Reveals hidden package risks | Slower room rewards | Adds observes edges; lowers event uncertainty | observability, process |
| Left Pad | Slight fire-rate increase | Unpublish chance | Adds small utility node | utility, unpublish |
| LegacyAuth | Unlocks old rooms; lowers old-system aggro | Conflicts with modern crypto | Adds legacy auth node and old crypto requirement | legacy, auth, risk |
| Modern Crypto | Secure damage type; anti-CVE | Conflicts with LegacyAuth | Adds secure dependency and conflict hooks | security, damage |
| Containerization | Reduces conflict spread | Startup delay | Adds isolates edges | isolation, defense |
| Feature Flags | Disable node/hazard briefly | Adds process complexity | Adds patches/isolates edge | control, active |
| Rollback Plan | Undo recent damage or install | Blocked by migrations | Adds rollback capability tag | defense, active |
| Compatibility Shim | Resolves one conflict | Adds Technical Debt | Adds patches edge between incompatible nodes | debt, fix |
| Pin Version | Prevents surprise upgrades | Upgrade pressure later | Adds pins edge | stability, debt |
| Vendored Dependency | Immune to unpublish | No automatic security patch | Replaces upstream edge with local node | security_risk, stable |
| Debugger | Slows time/reveals enemy weak point | Lower velocity | Adds observes edge | active, observability |
| Cache Layer | Repeats last successful action | Stale-state hazards | Adds cache node, possible infect edge | defense, weird |
| API Gateway | Converts some conflicts into latency | Centralizes coupling | Adds connector node | routing, coupling |
| Message Queue | Delays damage bursts | Backlog hazards | Adds buffer node | defense, latency |
| Schema Migration | Unlocks rewards and rooms | Can block rollback | Adds migration tag and edge | high_reward, risk |
| CI Pipeline | Rewards test rooms; catches regressions | Slower early progress | Adds process node | process, test |
| Shady Mirror | Cheap rare package | Security risk | Adds hidden infect edge chance | mirror, security_risk |
| Accurate Documentation | Reveals hidden properties | Rare, little combat power | Upgrades visibility | legendary, observability |
| Friday Deploy | Huge immediate reward | Raises all event weights | Adds debt and incident tags | high_reward, danger |
| Enterprise Service Bus | Connects distant nodes | Global coupling | Adds high-degree connector | coupling, high_risk |
| Kubernetes | Self-healing chance | Adds config hazards | Adds orchestration node and requirements | scale, complexity |
| Security Scanner | Reveals CVE events early | Can force costly decisions | Adds observes security edges | security, observability |
| Rubber Duck | Reveals one clue after stillness | No direct combat power | Adds clue generation hook | weird, support |

## 4. Enemies

| Enemy | Readable Behavior | Graph Interaction | Counterplay | Art Notes |
| --- | --- | --- | --- | --- |
| Regression | Returns after being defeated with changed pattern | Spawns from skipped tests/debt | Test Suite reduces respawn | Familiar enemy with corrupted variant |
| Breaking Change | Charges in straight lines | Damages connected nodes/edges | Dash, Containerization | Angular red warning trail |
| Transitive Bug | Small, spreads to linked enemies | Infects connected nodes if ignored | Kill early, isolate | Pixel swarm through graph edge |
| Version Conflict | Splits into two incompatible forms | Needs matching damage/tool | Shim or Modern Crypto | Two-color mirrored sprite |
| Deprecated API | Slow, leaves poison zones over time | Increases debt if ignored | Burst damage | Faded old terminal glyphs |
| Race Condition | Flickers and attacks unpredictably | Intent hidden at low observability | Debugger/Test Suite | Strobing silhouette |
| Memory Leak | Grows over time | Drains Stability if room takes too long | Focus early | Expanding blob/bar meter |
| Circular Dependency | Linked pair heals when only one is damaged | Creates cycle edge | Break link with Feature Flag | Two enemies with visible arc |
| License Violation | Low combat threat, summons blockers | Raises audit/security event weight | Prioritize before summon | Paperwork/stamp motif |
| Supply Chain Imposter | Disguised pickup/enemy | Adds hidden infect edge | Observability reveal | Friendly icon turns hostile |

## 5. Bosses

| Boss | Trigger | Core Attacks | Required MVP Readability |
| --- | --- | --- | --- |
| The Major Version Upgrade | Pinned/legacy/update pressure | Compatibility waves, forced migration zones, invalidates old package effects briefly | Show old nodes flashing before attacks |
| The Distributed Monolith | Coupling/high-degree graph | Edge tendrils, linked subsystem damage, transitive bug waves | Show central node and edge attacks clearly |

## 6. Incidents

| Incident | Trigger Weight | Player Choice | Consequence |
| --- | --- | --- | --- |
| Critical CVE | security risk, legacy, vendored deps | Patch, isolate, accept risk | Patch may add debt; isolate lowers reward; accept risk raises boss/event danger |
| Dependency Unpublish | Left Pad, unpinned utility deps | Vendor, replace, scramble | Vendor adds debt/security risk; replace creates conflict chance |
| Build Failure | active conflict edges | Debug, rollback, push through | Debug reveals cause; rollback may be blocked; push through damages Stability |
| Circular Coupling | high graph cycles | Refactor, feature flag, ignore | Refactor costs reward; flag temporary; ignore creates boss mutation |
| Maintainer Abandonment | old/unmaintained packages | Fork, replace, pin | Fork creates parallel node; replace risks conflict; pin adds pressure |
| Surprise Demo | high velocity/low confidence | Ship, delay, fake it | Ship raises reward/risk; delay lowers debt/reward; fake it adds hidden incident |

## 7. Bureaucracy And Approval Hooks

These hooks carry the Papers, Please influence: absurd process and earlier approvals that return later as system consequences.

| Hook | Immediate Use | Later Consequence | Tone |
| --- | --- | --- | --- |
| Security Exception | Allows vulnerable package temporarily | Audit pressure, forced patch, postmortem contributing factor | "Approved pending review by nobody available." |
| Change Freeze Waiver | Enables upgrade during restricted phase | Boss mutation, rollback blocked, compliance event | "Emergency exception was correctly misfiled." |
| Skipped Validation | Saves time or unlocks faster route | Hidden conflict, lower build confidence, regression | "Test evidence marked as aspirational." |
| Vendor Approval | Unlocks powerful vendor package/shop | Vendor lock-in, cost spike, impossible portal requirement | "Enterprise tier includes fewer answers." |
| Risk Acceptance | Avoids immediate incident cost | Later breach/audit/build failure weight | "Risk accepted by the person currently on fire." |
| Documentation Signoff | Reveals item info or unlocks archive | Can be contradicted by stale docs later | "Accurate when printed, allegedly." |

## 8. Postmortem Template Inputs

Track these facts during a run:

- First risky package installed.
- Highest-degree node.
- First hidden conflict revealed.
- Highest Technical Debt value.
- Lowest Observability value at incident time.
- Most useful mitigation.
- Rollback success or failure.
- Boss selected and why.
- Final cause of failure or victory.
- Accepted risks, waivers, approvals, or skipped validations that later mattered.

Example template:

```text
Incident: {failure_context} during {room_or_boss}.
Primary Cause: {node_a} {relation} {node_b}, amplified by {risk_tag}.
Contributing Factors: {top_3_state_facts}.
What Went Well: {mitigation_that_helped}.
Action Items: {3_suggestions_from_actual_causes}.
```

## 9. First Build Archetypes To Support

Observability build:

- Logging Framework, Test Suite, Debugger, Accurate Documentation.
- Lower surprise, lower raw damage.

Isolation build:

- Containerization, Feature Flags, API Gateway, Rollback Plan.
- Controls spread but can slow combat.

High velocity shortcut build:

- Friday Deploy, Shady Mirror, Left Pad, Schema Migration.
- Strong early rewards, high debt and incidents.

Legacy compatibility build:

- LegacyAuth, Compatibility Shim, Vendored Dependency, Pin Version.
- Unlocks routes and survives old systems, risks upgrade boss.

Security build:

- Modern Crypto, Security Scanner, Test Suite, Containerization.
- Strong against CVE/audit pressure, may conflict with legacy nodes.
