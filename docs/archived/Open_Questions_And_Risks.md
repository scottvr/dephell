# Open Questions And Risks

## 1. Product And Design Questions

1. What is the intended MVP platform?
Desktop is assumed. Confirm whether the prototype should target Steam-style PC, web, controller-first console, or internal demo only.

2. How platform-heavy should side-view combat be?
The MVP direction is side-view room combat, matching the mockups. The remaining design question is not top-down versus side-view; it is how much platforming belongs in the combat. A conservative MVP should use side-view chambers with simple platforms, jumps, drops, and lanes, while keeping precision platforming secondary to combat and graph decisions.

3. How literal should rooms-as-services be?
Decide whether every room has a named software component identity, or whether the graph is more abstract and rooms are mostly arcade spaces.

4. How much graph interaction happens during combat?
Current MVP assumes minimap only during standard side-view combat and fuller graph decisions between rooms or in paused overlays. Special rooms, boss phases, or later levels may promote the dependency graph to a full-screen graph-scale view. The FTL reference points toward this mode as subsystem triage and pausable panic, not just inspection. The open question is how much of that graph-scale view should be interactive in MVP versus preserved as future design space.

5. Is there meta-progression?
MVP assumes no meta-progression. Runs stand alone.

6. How comedic should failure text be?
Treatment asks for dry, specific, systemic humor. Decide how far the generated text can go into workplace satire versus clean game fiction.

7. Is "morale" in MVP?
Treatment lists morale as a possible resource, but MVP scope keeps it out except as flavor text. Confirm.

8. Is "security risk" in MVP?
MVP treats security risk as tags/event weights, not a top-level meter. Confirm.

## 2. Technical Risks

### Graph complexity becomes unreadable

Risk:
Players ignore the graph because it is too dense or too abstract.

Mitigation:
Keep MVP graph small, use stable visual hierarchy, and reveal only decision-relevant edges.

### Consequences feel arbitrary

Risk:
Hidden interactions create frustration instead of "I should have known."

Mitigation:
Use suspected edge states, warning tags, postmortem explanations, and observability upgrades.

### Package effects become bespoke code

Risk:
Every item needs custom engineering, slowing content iteration.

Mitigation:
Build packages from reusable operations and reserve custom hooks for a few signature items.

### Combat readability suffers under overlays

Risk:
Logs, scanlines, graph pulses, and warning banners obscure bullets or enemies.

Mitigation:
Define combat-safe UI zones and reserve full-screen warnings for noninteractive or boss-phase moments.

### Postmortem generation feels random

Risk:
Generated postmortems become disconnected joke text.

Mitigation:
Base every line on structured event log facts. Let humor come from phrasing and true combinations.

## 3. Production Risks

### MVP tries to simulate real package management

Risk:
The team spends time on correctness rather than play.

Mitigation:
Use a toy dependency model tuned for stories. Authenticity should support fun, not replace it.

### Content load is underestimated

Risk:
Packages, enemies, incidents, postmortems, icons, and graph states all need content.

Mitigation:
Start with the content matrix and build only the interactions needed to prove the loop.

### Visual polish arrives before system proof

Risk:
The mockups are compelling enough to tempt a heavy art pass too early.

Mitigation:
Graybox combat and graph interactions first, then apply CRT/arcade treatment once UI needs are known.

### Humor becomes dated

Risk:
Meme-specific jokes age quickly.

Mitigation:
Use systemic jokes, fake changelogs, generated postmortems, item behavior, and precise technical absurdity.

## 4. Art And UX Risks

### Text density

Risk:
The concept naturally wants logs, warnings, graphs, and descriptions, which can overload the player.

Mitigation:
Use icons and short labels in combat. Reserve longer prose for package inspection and postmortems.

### Color-only communication

Risk:
Graph states and hazards may rely too much on red/yellow/green.

Mitigation:
Pair color with edge style, node shape, iconography, animation, and audio.

### CRT effect hurts readability

Risk:
Scanlines, bloom, and curvature may make small UI text hard to read.

Mitigation:
Make CRT treatment adjustable and keep gameplay-critical text large and high contrast.

## 5. Decisions Needed Before Implementation

High priority:

- Confirm how platform-heavy side-view combat should be.
- Choose engine/platform.
- Approve MVP resource set: Stability, Observability, Technical Debt.
- Decide whether MVP graph-scale view is inspection-only, pause-based interaction, or active gameplay in select encounters.
- Approve one-floor scope and no meta-progression.

Medium priority:

- Choose player identity/name.
- Confirm final two MVP bosses.
- Decide package count target.
- Choose postmortem tone boundaries.
- Decide whether generated war stories can be exported later.

Low priority:

- Naming convention for rooms and packages.
- Exact CRT intensity.
- Whether victory report includes morale/security as flavor.
- Whether external references to real ecosystems are generic or parodic.
