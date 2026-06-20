# Dependency Hell Contributor Guide

## Design Gate For New Content

Every new package, tool, enemy, room, route, incident, or resource rule should pass this test before implementation:

1. Does it change what the player can do?
2. Does it mutate, reveal, block, or reinterpret the dependency graph?
3. Does it create a later consequence that can be traced?
4. Does it combine differently with at least two existing or planned systems?
5. Can a player make a clever prediction from it?

Avoid additions that are only stat stacks, filler rewards, or isolated jokes. The game works when each object behaves like a small rules engine: immediate power, graph consequence, readable risk, and future story pressure.

## Coherence Gate For New Content

A new object must define:

1. Its primary domain: what subsystem, resource, or failure family does it belong to?
2. Its graph role: does it create, remove, reveal, block, bridge, isolate, amplify, or weaken graph relationships?
3. Its risk model: what condition makes it dangerous, and what condition makes it safe?
4. Its counterplay: what can the player do before or after the consequence appears?
5. Its explanation path: could the postmortem explain its contribution in one sentence?
6. Its interaction surface: which tags does it care about, and which tags care about it?

Reject content whose effects cannot be explained through the dependency graph, player resources, enemy behavior, or room topology.

## Absurdity Rule

Absurdity is allowed when the cause is traceable. The theme may be ludicrous; the mechanics must be accountable.

Good absurdity:

- The Rubber Duck reveals one hidden dependency if the player stands still, because forced explanation increases Observability.
- The Ancient Perl Script fires a cron effect every 60 seconds, but the effect is deterministic once discovered and appears in the postmortem.
- Friday Deploy gives a huge reward and adds incident pressure to future rooms.

Bad absurdity:

- The Rubber Duck randomly transforms enemies with no graph, resource, room, or enemy-behavior explanation.
- The Ancient Perl Script randomly changes stats with no readable trigger.
- Friday Deploy randomly kills the player.

If it can kill the player, block a route, alter a major resource, trigger an incident, or materially affect a report, it must leave a causal trace in run state or the event log.

## Current Prototype Shape

- The dependency graph is the location map and the systemic cause/effect surface.
- Side-view rooms are body-scale chamber views of graph nodes or edges.
- Graph-route choices are level/location choices; body-scale hallway traversal should only exist if it adds meaningful combat, risk, reward, or pacing.
- Keep the zero-build static browser prototype easy to open from `index.html`.

## MVP Work Intake

- Use `docs/MVP_Sprint_Plan.md` as the active task plan.
- Add new work to the sprint plan before implementing it unless it is an urgent bug fix.
- Prefer finishing the current sprint's exit criteria before pulling from later sprints.
