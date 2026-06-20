# Package And Tool Ideas

These candidates are promising because they add verbs, graph effects, later consequences, and puzzleable logic rather than flat stat stacking.

## Feature Flag

Active tool. Temporarily disables a graph node or edge.

Prototype status: implemented as a package that grants `F`. The active tool flags the current graph locus for a few seconds, slows/disarms the active wave, suppresses incident drain, and adds configuration-drift TDR each use.

- Combat verb: place a short-lived toggle field or flag marker that suppresses an enemy modifier, hazard, or spawn source.
- Graph effect: marks one edge/node as flagged off for the next room or incident.
- Synergies: Test Suite identifies the best target; LegacyAuth can suppress an old-system conflict while leaving audit evidence; Compatibility Shim plus flags solves immediate crises while increasing TDR.
- Failure logic: overuse creates configuration drift or stale-flag incidents.

## Circuit Breaker

Active defensive tool. Severs propagation temporarily.

- Combat verb: deploy a barrier or pulse that blocks projectiles or interrupts charging enemies.
- Graph effect: temporarily blocks failure spread across one connected edge.
- Synergies: Test Suite reveals the edge worth breaking; LegacyAuth may make old systems recover slower after the breaker trips.
- Failure logic: prevents cascade but can create timeout or degraded-service enemies.

## Canary Deploy

Risk-preview package or active tool.

- Combat verb: creates a fragile canary process that follows the player or holds a point.
- Graph effect: previews one downstream consequence before committing to a route, package, or incident.
- Synergies: Test Suite makes canary reports more specific; Compatibility Shim makes canary pass faster but less reliable; LegacyAuth can produce false confidence around old-system paths.
- Failure logic: if the canary dies, the incident starts early or becomes partially hidden.

## Lockfile / Pin Version

Strategic package.

- Combat verb: minimal; better as a build-shaping package than an active combat tool.
- Graph effect: pins a node or edge so it cannot mutate unexpectedly.
- Synergies: prevents certain conflict escalations, but blocks some upgrade paths or route options.
- Failure logic: stable but aging; later CVE or deprecation pressure.

## Dependency Inversion

Advanced graph-routing package or tool.

- Combat verb: parry or redirect an enemy attack.
- Graph effect: reverses or reroutes an edge, changing where risk propagates.
- Synergies: can isolate a dangerous dependency behind an adapter path; careless use can create indirect coupling.
- Failure logic: powerful but cognitively heavier, likely better after the player already understands graph-route logic.
