# Tools — the content compiler

Node scripts that treat content as data to be validated and simulated, per the pipeline in [`../docs/content-authoring.md`](../docs/content-authoring.md). They read the **same** zero-build browser scripts the game runs (via `lib/load-dephell.js`), so there is no duplicate content and no build step. No dependencies — plain Node.

| Command | What it does |
| --- | --- |
| `node tools/lint-content.js [--strict]` | Content gate: effect-verb shapes, tag ontology, graph-node references, and the coherence-trace rule (no package is a pure stat bump). Exit 1 on any error. |
| `node tools/simulate.js [runs]` | Balance oracle: plays N runs through the real effect engine and reports package pick rates, boss-selection spread, incident distribution, debt/observability, and pathologies (dominant package, one-boss runs, Rollback-lock rate). |

`lib/load-dephell.js` loads the DOM-free data scripts (`constants`, `content`, `run-state`, `utils`, `reports`, `effects`, `graph`) into a headless context and returns the `DepHell` namespace.

The boss-selection and incident-weight formulas in `simulate.js` intentionally mirror `scripts/game.js` (`selectBoss` / `incidentWeights`) — the simulator is the balance oracle for those formulas, so keep them in sync when tuning.
