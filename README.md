# Dependency Hell

An action roguelite about surviving the software systems you built while trying to ship one more
release. It looks like a room-based arcade shooter; underneath, the world is a **live dependency
graph**. Every upgrade, library, tool, and "quick fix" mutates the whole system — so the real enemy
is emergent coupling. Darkly comic, technical, and absurd, in the spirit of a haunted arcade cabinet
built by an SRE and a demon who understands semantic versioning.

> Read the full pitch in [`docs/vision.md`](docs/vision.md).

## Current status

A complete, playable vertical slice with a **full run arc** — zero-build, vanilla JS, HTML canvas + inline SVG.

**Implemented today:**

- Side-view action combat (move, jump, dash, aim, arc "patch blade" melee) vs. **8 enemy behaviors** —
  Regression, Breaking Change, Memory Leak, Transitive Bug (spreads/infects the graph), Version Conflict
  (forks into shielded halves), Deprecated API (paves the floor with hazard zones), Dependency Cycle.
- **2 adaptive bosses** — The Major Version Upgrade and The Distributed Monolith — selected by the pressure
  your build accumulated, with armor/vulnerability windows and attacks that travel along real graph edges.
- 3 resources — Stability, Observability, Technical Debt — and a **12-room floor pool** (~9 rooms per run)
  with two branch points and a Test-Suite-gated shortcut. Room types: combat, observability audit, test
  gate, package gate, verification fork, integration, refactor, dependency injection, incident, boss.
- A package-choice overlay offering **12 packages** with a live SVG preview of the graph mutation.
- **5 incidents** (Build Failure, Audit Pressure, Minor Regression, Critical CVE, Dependency Unpublish),
  each with a two-path resolution overlay whose choices return later.
- **4 active tools** — Feature Flag (`F`), Rollback (`R`, blocked by upgrade risks), Circuit Breaker (`C`),
  Rubber Duck (stand-still reveal).
- Procedural **audio** (Web Audio SFX + adaptive ambience reacting to stability/debt/incident/boss), mute (`M`).
- A clickable graph inspector with cause tracing, plus generated win (Release Report) and loss (Mini
  Postmortem) screens that trace outcomes — boss, risks, pins, resolved incidents — back to your choices.
- Full CRT/terminal presentation.

**Not built yet (planned):** true procedural generation (the floor is a branching hand-authored pool),
the remaining 12 of the 24-package target, and meta-progression. See [`docs/roadmap.md`](docs/roadmap.md)
for scope and sprints, and [`docs/game-design.md`](docs/game-design.md) for the full design.

## Run it

The prototype is zero-build — no install, no bundler.

- **Play**: open `index.html` in a browser.
- **Preview a specific screen**: add `?visualSmoke=main|choice|graph|route|incident|boss|monolith|report|win`
  (or `room:<id>`) to the URL.
- **Visual smoke test**: `node scripts/visual-smoke.js` — launches headless Chrome and writes screenshots
  of the key states to `artifacts/visual-smoke/` (set `CHROME_PATH` to override the browser).
- **Content gate**: `node tools/lint-content.js` validates content; `node tools/simulate.js` reports balance
  (package pick rates, boss spread, incident mix). See [`tools/README.md`](tools/README.md).

## Documentation map

| Doc | What it's for |
|-----|---------------|
| [`AGENTS.md`](AGENTS.md) | Contributor & agent guide: rules, codebase map, how to run/verify. **Start here to work on the repo.** |
| [`docs/vision.md`](docs/vision.md) | The creative north star — full game treatment, tone, pillars. |
| [`docs/game-design.md`](docs/game-design.md) | What to build and how it looks: design, content, and art direction. |
| [`docs/content-authoring.md`](docs/content-authoring.md) | How to author new content correctly: coherence model, effect verbs, pipeline. |
| [`docs/tag-ontology.md`](docs/tag-ontology.md) | The machine-enforced tag vocabulary and risk kinds. |
| [`docs/package-roster.md`](docs/package-roster.md) | The 24-package roster (12 implemented + 12 drafted) with rubric notes. |
| [`docs/roadmap.md`](docs/roadmap.md) | The single source of "what's next": scope, sprints, backlog, risks. |
| [`tools/`](tools/README.md) | The content compiler: linter + balance simulator over the real content. |
| `docs/concept-art/` | Gameplay mockups (visual/HUD/graph language reference). |
| `docs/UAT/` | Playtest prompts and observer checklist. |
| `docs/archived/` | Superseded planning docs, kept for posterity. |
