# Dependency Hell — design

The central joke of the original treatment: *the player is building the maze while trying to
escape it.* This design makes that literal.

## The loop

1. **Install.** The registry terminal in `app` offers three packages. Take one. Its power is
   yours immediately.
2. **The graph grows.** The package and its whole dependency tree are added to the map as rooms.
   Edges are doors: east goes deeper into the tree, west goes back toward `app`.
3. **Integrate.** Clear the package's own room. That ships a feature.
4. **Vet, or don't.** Each dependency room you clear is vetted and safe. A package whose entire
   tree is vetted is **hardened**: a stronger version of its power.
5. **Deploy.** With three features shipped you may walk into the deploy door. At T-0 you must.

## Pressure

- **The release train.** Every cleared room is one tick. There are 14. The registry restocks
  every 3 ticks, so there is never time to install much *and* vet all of it.
- **The pager.** Every 3 ticks (2 once debt is 50+) an unvetted node goes **down**, weighted by
  its risk. Every package that requires it — directly or transitively — is switched off until
  the node's room is cleared (an incident room: tougher) or hotfixed from the map (costs debt,
  and the node stays unvetted). The target is rolled one room ahead; with observability 2+ you
  are told which node it is and can vet it first.
- **Version conflicts.** Two packages that pull different majors of one library conflict. In
  each fight one side fails to load. Vetting both versions resolves it; a shim hides it.
- **Technical debt.** From shortcuts: shims, hotfixes, pins, flags, some packages. Every 25
  points adds enemies and elites; 50+ speeds up the pager; all of it adds boss health.
- **Observability.** 0–4. Gates enemy health bars, risk markers, how much of a tree the registry
  shows, conflict warnings, pager forecasts, and whether you can even see the boss's health.

## Production

The boss is built from the run. Its identity comes from what dominates the architecture (debt →
The Rewrite, shipped CVEs → The Breach, pins/legacy → The Major Version Upgrade, sprawl → The
Distributed Monolith, blindness → The Unknown Unknown, otherwise The Friday Deploy). Its health
scales to the player's damage output at deploy time. As its health drops it strikes every
unvetted node, breaks every shim and force-upgrades every pin — so each shortcut is called in
mid-fight, as powers going dark. Vetted nodes visibly hold.

## Why these choices

- The old prototype tracked consequences in ledgers the player could not feel. Here the only
  consequence that matters is immediate and in the hands: *your triple shot just stopped
  working, and the sidebar says which node did it.*
- The graph is the map, so reading the map is reading the risk. Shared nodes are visible single
  points of failure. Deep trees are visibly more rooms.
- Reports are assembled from typed log entries, so the postmortem can always name the chain:
  killing blow → what was offline → which node → when it arrived → that it was never vetted.

## Tuning

All numbers are in `js/content.js` (`TUNE`, `BASE_STATS`, `ENEMIES`, `ECO`, package `apply`
functions). Room budgets and scaling are in `planWaves` / `spawnEnemy` in `js/sim.js`.
`tools/bot-run.js` is the balance gauge: the autoplayer aims perfectly and plans badly, so its
win rate is a rough ceiling for difficulty, not a prediction of human results.
