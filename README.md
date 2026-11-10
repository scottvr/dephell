# Dependency Hell

An action roguelite about surviving the software you installed.

Every package is a power — and a dungeon. Installing one gives you its ability immediately, and
its dependency tree becomes new rooms on the map. Clear a room to **vet** that node. Leave it
unvetted and the pager will eventually take it down, switching off every package that depends on
it until you go fix it. Ship three features before the release train leaves, then beat
production, which audits whatever architecture you built. Every run ends in a postmortem or a
release report generated from what actually happened.

## Play

Open `index.html` in a browser. No build, no install, no server.

| | |
|---|---|
| Move | `WASD` |
| Aim + fire | mouse (hold), or arrow keys |
| Dash (brief invulnerability) | `Space` |
| Use the registry terminal | `E` |
| Map + fast travel | `Tab` |
| Feature flag / rollback (if owned) | `Q` / `R` |
| Help / sound | `H` / `N` |

URL options: `?seed=HEX` replays a seed, `?bot=1` lets the autoplayer play while you watch.

## Layout

- `index.html`, `css/game.css` — page shell and all DOM styling.
- `js/content.js` — packages, dependencies, enemies, tools, tuning numbers, copy.
- `js/graph.js` — the dependency graph (nodes are rooms, edges are doors).
- `js/sim.js` — run state, pager, rooms and combat. No DOM, so it also runs under node.
- `js/reports.js` — postmortem and release-report generation from the event log.
- `js/render.js`, `js/sprites.js` — pixel renderer, graph drawing, ASCII-authored sprites and font.
- `js/ui.js`, `js/main.js`, `js/audio.js` — HUD and overlays, input and loop, procedural audio.
- `js/bot.js` — the autoplayer used by the tools below.
- `docs/design.md` — the rules and the reasoning. `docs/vision.md` — the original treatment.
- `docs/archived/` — the earlier prototype and its planning documents.

## Checks

```
node tools/bot-run.js 40        # headless playtests: win rate, deaths, pacing
node tools/bot-run.js 1 --report --log
node tools/selftest.js          # drives the real page in headless Chrome
node tools/shots.js             # screenshots of every screen into shots/
```
