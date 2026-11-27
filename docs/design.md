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

## Projects

A run starts from a project, chosen on the title screen. A project is a starting graph plus a
few numbers (`PROJECTS` in `js/content.js`); every rule after that is the same.

| Project | What you start with | What it asks of you |
| --- | --- | --- |
| Greenfield | Nothing. 14 rooms on the clock. | The standard sprint. |
| The Inherited Monolith | Two packages already shipped, sharing a risk-3 node with a CVE; five unvetted rooms; 35 debt. | You have power on day one and one feature to go. Decide how much of someone else's tree to clean up before prod audits it. |
| The Starter Template | One unshipped package with a seventeen-node tree built from the dependencies other packages use; observability 2 (pager forecasts); a rollback plan and a container. | You cannot vet it all. New packages add few rooms because their tree is already there, and already fragile. Choose which hubs to protect. |
| The Weekend Rewrite | Nothing, 9 rooms, 12 commits, registry restocks every 2 rooms. | Ship fast and buy your way out. |

The Template once had 16 rooms to make up for its tree. It played worse: nobody runs out of
things to vet there, so the two extra rooms were fought at full difficulty with powers dark and
stability worn down. It has the standard 14 and starts with dashboards instead, so the pager's
next target is visible and protecting it is a choice. Balance gauge: the bot wins about 25% there
vetting by risk and about 50% with `--hubs` (vet what most packages lean on first), against about
70% in Greenfield.

Inherited packages are logged as installs at T-0, so the reports can say that a node "came with
the project and was never vetted". Starter packages (`starter: true`) never appear in the
registry. Records are kept per project.

## Pressure

- **The release train.** Every cleared room is one tick. There are 14. The registry restocks
  every 3 ticks, so there is never time to install much *and* vet all of it.
- **The pager.** Every 3 ticks (2 once debt is 50+) an unvetted node goes **down**, weighted by
  its risk. Every package that requires it — directly or transitively — is switched off until
  the node's room is cleared (an incident room: tougher) or hotfixed from the map (costs debt,
  and the node stays unvetted). The target is rolled one room ahead; with observability 2+ you
  are told which node it is and can vet it first.
- **Unpublishable nodes** (`flag: 'unpublish'`, i.e. left-pad). Its author can pull it whatever
  its code looks like, so vetting does not take it off the pager's list. A pin ("vendor a copy")
  does, at the usual pin debt per room. A one-room package would otherwise be hardened, and safe,
  the moment it ships.
- **Growing packages** (`grows`, i.e. do-not-delete.sh). A cron job nobody understands: at each
  registry restock it starts calling one more legacy dependency, unvetted, so it un-hardens until
  you go and read it again. The other tree-less package, rubber-duck, simply has a tree now: the
  duck's wisdom is a 2009 Stack Overflow answer.
- **Version conflicts.** Two packages that pull different majors of one library conflict. In
  each fight one side fails to load. Vetting both versions resolves it; a shim hides it.
- **Technical debt.** From shortcuts: shims, hotfixes, pins, flags, some packages. Every 25
  points adds enemies and elites; 50+ speeds up the pager; all of it adds boss health.
- **Observability.** 1–4 (you start at 1). Gates enemy health bars, risk markers, how much of a tree the registry
  shows, conflict warnings, pager forecasts, and whether you can even see the boss's health.

## Production

The boss is built from the run. Its identity comes from what dominates the architecture (debt →
The Rewrite, shipped CVEs → The Breach, pins/legacy → The Major Version Upgrade, sprawl → The
Distributed Monolith, low observability → The Unknown Unknown, whose health you cannot see, otherwise The Friday Deploy). Its health
scales to the player's damage output at deploy time. As its health drops it strikes every
unvetted node, breaks every shim and force-upgrades every pin — so each shortcut is called in
mid-fight, as powers going dark. Vetted nodes visibly hold.

Its health scales to **your own gun** only: damage, shots, crits, fire rate, echo shots. Separate
shooters (kubernot's replicas, orbitals, the cron ring) and on-hit effects (bounce, split, blast,
redirect) are not counted, so the boss does not cancel them out. Counting replicas used to
double-punish kubernot: the boss was sized for a replica that its strikes then switched off.

The Distributed Monolith summons one linked Circular Dependency pair at a time, only after the last
pair is dead, at half health; and has three quarters of the usual health, because the pairs soak
your fire. Sprawl summons it, so before this it was the real reason big-tree packages
(enterprise-bus, micro-everything, kubernot) lost: it won 58% of its fights against the bot,
against 13–23% for the others. Now about 40%, most of the gap being prod striking more unvetted
nodes in a sprawling graph, which is the point.

## Grades

A run that does not ship is graded **F**. A shipped release scores up to 7 points
(`R.build` in `js/reports.js`):

| Measured at release | 2 points | 1 point | 0 points |
| --- | --- | --- | --- |
| Stability left | 60+ | 30–59 | under 30 |
| Unvetted nodes (including any that are down) | 0 | 1–3 | 4+ |
| Technical debt | under 25 | 25–49 | 50+ |
| Prod strikes that landed on an unvetted node or broke a shim | — | 0 | 1+ |

Points → grade: **S** 7 (a flawless release), **A** 6, **B** 4–5, **C** 2–3, **D** 0–1. The
release report shows the breakdown and, for every row short of full marks, what the next point
needs, so a grade always tells the player what to do differently. Records keep the best grade per
project.

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
