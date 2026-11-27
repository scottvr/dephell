# Playtest notes

What players reported, what it turned out to be, and what was done. Newest first. Append freely;
anything without a **Status** has not been looked at yet.

Players so far: Mary (not a gamer; criminal defense attorney; 27" iMac, Safari, a minimum font size
set; won her first run, an S, on run 33).

## 2026-11-26

### Feature flag (Q) "does nothing" (Mary)
**Status:** confirmed bug, not fixed yet. launch-dorkly's FEATURE FLAG sets a 2.5s room freeze
(`game.freezeT`) and the screen shows "FLAG OFF 2.5", but nothing in the sim reads the timer:
enemies keep moving and firing. All Q does is erase the bullets on screen and add debt.

### Esc closes a screen, then also exits browser full screen (Mary)
**Status:** not fixed yet. Safari treats Esc as "leave full screen" even after the page handled it.
Plan: no screen should need Esc. The key that opened it closes it (E registry, Tab map, H help),
and so does a click outside.

### Tool descriptions cut off in the registry (Mary)
7 of 8 tools ended mid-sentence ("Observability +1, permanently. See more,").
**Status:** fixed in dbafe47. Her Safari minimum font size enlarged the 10px text before the stage
scaling. The stage is now laid out at 2x so no text is under 20 CSS px; tools have short plain
descriptions plus a how-to line on hover. `tools/shots.js --minfont=16` checks it.

### Change freeze comes too soon, especially in the Starter Template (Mary)
"What was enjoyable about Standard version is that you could get all your rooms vetted and have all
of your packages built by the time the change freeze came ... I'm pretty sure doing the same in Hard
version is impossible."
**Status:** confirmed. The Template starts with 20 rooms to vet on a 14-room clock: 0 of 40 bot runs
ever finished. In progress: a clock that can be finished if you play well, and the sidebar showing
rooms left against rooms unvetted. Also planned: incident response (fighting a down node's room)
allowed during a freeze, and the pager silent through it.

### Template: weak starting weapon, and "let me buy better weapons with my commits" (Mary)
"I didn't know what the container or the pin do anyway."
**Status:** planned. Give create-whatever-app a real attack; an `npm install --force` tool to take a
second package for commits (its tree still lands on the map); Pin/Container how-tos are now on hover.

### Move/aim keys swapped (Mary)
**Status:** done in 993390b. K on the title or help screen.

### Debrief after her first win
Had to get good at fighting first; what clicked: hiding behind server racks, re-doom + lowdash,
the Rollback Plan (R) as a boss heal, saving commits for Refresh Registry. Hates the "fox" (Breaking
Change) and the "lightning" (Race Condition: it phases through cover); likes the "slow circles"
(Memory Leak). Owner: disliking enemies is fine.
**Status:** done in 69196cc: cover / rollback / refresh are taught by hints and the postmortem's
"NEXT SPRINT, TRY". Enemies left as they are.

### Grades: "where is S explained?" (owner)
**Status:** done in c96405a: rubric in docs/design.md, breakdown on the release report.
