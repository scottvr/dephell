# Technical Creative Director Working Notes

## First Slice Decision

The current first slice is a zero-build browser prototype. That keeps the earliest playable loop easy to run, inspect, and throw away if a stronger engine choice emerges.

## Implemented Prototype Target

- Three side-view rooms.
- One package choice with three tradeoffs.
- Runtime dependency graph with nodes, edges, visibility, relation types, and event log entries.
- Data-driven package effects using reusable operations.
- One later consequence caused by graph state or Technical Debt.
- Generated mini-postmortem/release report that names actual run facts.

## Current Design Bet

Graph-scale interaction begins as pause/between-room inspection and package choice context. Combat uses the graph as a live minimap and consequence surface, not as an active tactical board yet.

## Next Useful Tasks

1. Improve combat feel: enemy telegraphs, hit feedback, jump/dash tuning.
2. Split package/content data out of `scripts/game.js` once the operation vocabulary stabilizes.
3. Add a pause graph view with selectable nodes and cause tracing.
4. Add a second consequence branch for Observability builds so safe choices still create stories.
5. Add quick playtest prompts that measure whether the choice/consequence loop is legible.
