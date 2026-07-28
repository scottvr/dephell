# Dependency Hell

An action roguelite about surviving the software systems you built while trying to ship one more
release. It looks like a room-based arcade shooter; underneath, the world is a **live dependency
graph**. Every upgrade, library, tool, and "quick fix" mutates the whole system — so the real enemy
is emergent coupling. Darkly comic, technical, and absurd, in the spirit of a haunted arcade cabinet
built by an SRE and a demon who understands semantic versioning.

> Read the full pitch in [`docs/vision.md`](docs/vision.md).

## Current status

A complete, playable **First Slice** vertical prototype — zero-build, vanilla JS, HTML canvas + inline SVG.

**Implemented today:**

- Side-view action combat (move, jump, dash, aim, arc "patch blade" melee) vs. 3 enemy types.
- 3 resources — Stability, Observability, Technical Debt.
- The dependency graph as the level map: clearing a room advances through the graph (auto-advance or a
  route-choice overlay).
- A package-choice overlay with 4 packages and a live SVG preview of the graph mutation before you commit.
- A branch room (Verification Fork), incidents (Build Failure / Audit Pressure / Minor Regression), and the
  Feature Flag active tool.
- A clickable graph inspector with cause tracing, plus generated win (Release Report) and loss (Mini
  Postmortem) screens that trace outcomes back to your choices.
- Full CRT/terminal presentation.

**Not built yet (planned):** procedural generation, the full breadth (10–14 rooms, 8 room types, 24
packages, 10 enemies), adaptive bosses, and audio. See [`docs/roadmap.md`](docs/roadmap.md) for scope and
sprints, and [`docs/game-design.md`](docs/game-design.md) for the full design.

## Run it

The prototype is zero-build — no install, no bundler.

- **Play**: open `index.html` in a browser.
- **Preview a specific screen**: add `?visualSmoke=main|choice|graph|route|report` to the URL.
- **Visual smoke test**: `node scripts/visual-smoke.js` — launches headless Chrome and writes screenshots
  of the key states to `artifacts/visual-smoke/` (set `CHROME_PATH` to override the browser).

## Documentation map

| Doc | What it's for |
|-----|---------------|
| [`AGENTS.md`](AGENTS.md) | Contributor & agent guide: rules, codebase map, how to run/verify. **Start here to work on the repo.** |
| [`docs/vision.md`](docs/vision.md) | The creative north star — full game treatment, tone, pillars. |
| [`docs/game-design.md`](docs/game-design.md) | What to build and how it looks: design, content, and art direction. |
| [`docs/content-authoring.md`](docs/content-authoring.md) | How to author new content correctly: coherence model, effect verbs, pipeline. |
| [`docs/roadmap.md`](docs/roadmap.md) | The single source of "what's next": scope, sprints, backlog, risks. |
| `docs/concept-art/` | Gameplay mockups (visual/HUD/graph language reference). |
| `docs/UAT/` | Playtest prompts and observer checklist. |
| `docs/archived/` | Superseded planning docs, kept for posterity. |
