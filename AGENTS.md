# Dependency Hell — contributor and agent guide

Read `README.md` for how to run it and `docs/design.md` for the rules. `docs/vision.md` is the
original treatment and still the north star for tone. Everything under `docs/archived/` describes
an earlier prototype and is not current.

## Constraints

- Zero-build. `index.html` must work when opened from disk: plain script tags, a shared
  `window.DH` namespace, no modules, no dependencies.
- `js/sim.js`, `js/graph.js`, `js/content.js`, `js/reports.js` and `js/bot.js` must stay free of
  DOM access so the node tools can load them.
- The target machine is an old Intel laptop. The arena is a 320x192 canvas scaled by CSS; keep
  per-frame work to `fillRect`/`drawImage`, and keep CSS effects static (no filters, no
  per-frame DOM writes — `UI.sync` only touches the DOM when something changed).

## Design rules

- A package must change what the player can do, and its cost must live in the graph: tree size,
  risky nodes, shared nodes, version conflicts, debt. No pure stat sticks.
- Anything that hurts the player has to be traceable: it goes through `log()` with a typed entry,
  and the reports are built only from those entries and run state.
- Absurd is fine. Arbitrary is not.

## Verify a change

```
node tools/bot-run.js 40     # no "stuck" runs; win rate in a sane band
node tools/selftest.js       # all PASS
node tools/shots.js          # look at shots/*.png
```

There is no unit-test framework; these three are the gate.

## Git

Commit freely. Never push.
