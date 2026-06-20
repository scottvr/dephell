# First Slice Playtest Prompts

Use these after a short run. The goal is not to win; it is to test whether the player can read the route choice -> package choice -> graph mutation -> consequence loop.

## One-Minute Questions

1. Which package did you choose, and what did you think it would do?
2. Which graph route did you choose after Local Development, and why?
3. What changed on the dependency graph after the package installed?
4. Did the Verification Fork room feel connected to the package choice? Why or why not?
5. What did the final report say was important about your run?
6. Was any combat damage surprising or hard to read?

## Observer Checklist

- Player noticed the package preview before choosing.
- Player understood that the post-room route choice was a map choice, not a separate menu.
- Player noticed the current-location marker on the minimap or route graph.
- Player noticed graph ghost highlights while hovering/focusing package choices.
- Player understood at least one graph node or edge added by the package.
- Player used or noticed the enlarged graph view.
- Player could explain one later consequence in their own words.
- Player could distinguish Stability, OBS, and TDR by the end of the run.

## Branches To Exercise

- Direct route: go straight to Package Gate and note whether the faster path feels readable.
- Runtime Detour: take the extra room and confirm the Stability reward is visible in the log/HUD.
- LegacyAuth: watch for conflict and security-exception story.
- Test Suite: watch for revealed edges, a cleaner Verification Fork, and softened staging incident.
- Compatibility Shim: watch for stronger blade damage, fast verification, and TDR/audit pressure.
- Feature Flag: use `F` during Staging Incident and check whether the graph highlight, pressure relief, TDR increase, and report note all feel connected.

## Pass Plan

A single pass only tests one package branch, so it is not enough for this slice. Run three normal passes, one per package, and alternate the Direct route and Runtime Detour across those passes. After that, run one messy pass where you intentionally take hits, ignore the graph, or make a rushed choice; the goal is to check whether failure still explains itself.

- LegacyAuth pass: confirm the graph adds a legacy node and suspected conflict, Verification Fork creates a package-specific checkpoint consequence, Staging Incident becomes a traceable Build Failure, and the final report connects the conflict or approval to the outcome.
- Compatibility Shim pass: confirm combat feels stronger, TDR rises, Verification Fork reads as fast verification with extra debt, and Staging Incident reads as debt/audit pressure rather than arbitrary punishment.
- Test Suite pass: confirm Observability rises, graph information becomes clearer, combat feels slightly slower, Verification Fork is cleaner, and the later consequence is softer and more explainable.
- Feature Flag pass: confirm the package unlocks a new verb rather than a passive stat bump, the player can predict when to use it, and each use reads as both tactical relief and future configuration drift.
