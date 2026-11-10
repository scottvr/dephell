# Content model

How content for Dependency Hell is shaped, how pieces combine, and how a new piece is judged.
`docs/design.md` has the rules of the game; this is the rulebook for adding to it.

Sections marked **(today)** describe code that exists. Sections marked **(planned)** describe
where the content system is going and are not implemented.

## Two tests

Every piece of content has to pass both.

**Explainable.** After it happens, the player can say why.

> I did not expect that, but after seeing it, I understand why it happened.

**Felt.** The player notices it in the fight, with their eyes on the arena, within about five
seconds of it mattering. Something that is only true in the sidebar, the map or the report has
not happened yet as far as the player is concerned.

The earlier prototype passed the first test and failed the second. Its content was traceable
and flat. The second test exists so that does not happen again.

## The two layers

A package is two things joined together:

- a **power**: what it does to your shots, your body or the room, right now;
- a **cost**: the dependency tree it adds to the map, and everything living in that tree.

The layers are authored separately and combine freely. A power is drawn from a small set of
primitives. A tree is assembled from a shared pool of dependencies, and the same dependency can
sit under several packages. That sharing is the main source of variety: the same triple shot is
a different decision when its tree overlaps the tree you already vetted, or drags in the other
major version of a library you already carry.

Rough multiplication, for scale: P powers × the trees they could plausibly sit on × the state
of the graph when the offer appears. Volume in either layer multiplies the other.

## Inventory (today)

| Kind | Count | Lives in |
| --- | --- | --- |
| Packages | 18 | `PACKAGES` |
| Dependencies | 40 | `DEPS` |
| Ecologies (enemy mixes) | 11 | `ECO` |
| Enemy types | 11, plus the boss | `ENEMIES` |
| Tools | 8 | `TOOLS` |
| Incident flags | 5 | `INCIDENT_TEXT` |
| Boss variants | 6 | `BOSSES` |

All in `js/content.js`.

## Power layer

### Primitives (today)

A power is a change to the player's stat block. The fields of `BASE_STATS` are the vocabulary.

| Family | Primitives | What the player sees |
| --- | --- | --- |
| Shot shape | `shots`, `pierce`, `bounce`, `homing`, `split`, `chain`, `explode` | The bullets look or travel differently |
| Cadence | `fireDelay`, `cache`, `duck`, `cron` | The rhythm of firing changes |
| Hit weight | `damage`, `dmgMult`, `crit` | Yellow crit bolts and numbers; otherwise weak on its own |
| Body | `speed`, `dashCd`, `dashDamage`, `shield`, `regen` | Movement and survival change |
| Companions | `drones`, `orbitals` | Something else is on screen fighting for you |
| Active | `flag` | A new button |
| Information | `obs` | Health bars, risk markers, forecasts appear |
| Drawback | `hallucinate`, `legacySlow`, a damage cut | A visible flaw or quirk |

Rules for a package's power:

1. **One headline primitive.** The player should be able to name the package's effect in three
   words. A second primitive is allowed as a trade (triple shot, each bolt weaker).
2. **No headline from the hit-weight family alone.** "+40% damage" does not pass the felt test.
   Hit weight may ride along with something visible.
3. **Hardened is more of the same**, optionally with one twist (hardened `vibe-coder` stops
   hallucinating). It never introduces an unrelated effect, because the player earned it by
   vetting this package's tree and should recognise the reward.
4. **A new primitive is a code change**, and must come with: simulation, a distinct look, a
   sound, bot awareness if it changes how to play, and an entry in the table above. A new
   package built from existing primitives is data only.

### How primitives stack (today)

Combination comes from stacking rules, with no rule written per pair:

- counts add (`shots`, `pierce`, `bounce`, `chain`, `split`, `drones`, `orbitals`);
- rates and damage multiply (`fireDelay`, `damage`, `dmgMult`, `dashCd`);
- sizes and strengths take the larger (`explode`, `homing`);
- on-hit effects each apply to every hit, so they compound: split bolts can chain, piercing
  shots explode at each enemy.

A new primitive should say which of these it follows. If it needs a special case against an
existing primitive, that is a sign it is two primitives.

### Powers as data (planned)

Each package currently carries an `apply(s, h)` function. To let content be linted, compared
and generated, powers move to a declarative list:

```js
fx: [
  { stat: 'shots',  op: 'add', v: 2,   hard: 4 },
  { stat: 'damage', op: 'mul', v: 0.8 },
]
```

with `op` one of `add`, `mul`, `max`, `set`. Anything that cannot be written this way is a
missing primitive, to be added under rule 4.

### Named synergies (planned)

A thin layer on top of stacking, used sparingly: a specific pair of primitives that produces
something neither does alone, announced by name the first time it fires. They are keyed on
primitives, never on package names, so they keep working as the package pool grows.

## Cost layer

### Dependency fields (today)

| Field | Meaning | Where the player meets it |
| --- | --- | --- |
| `risk` 0–3 | How strongly the pager favours this node | Risk markers on the map (with observability) |
| `eco` | Which enemy mix its room spawns | The fight in that room |
| `flag` | `cve`, `abandoned`, `license`, `unpublish` | Incident text; `cve` shipped unvetted pulls the boss toward The Breach |
| `lib` | Two nodes with the same `lib` are two majors of one library | Version conflict: one side fails to load each fight |
| `deps` | Further nodes it drags in | More rooms |

Package fields on this layer: `risk`, `flag`, `debt` (debt added on install), `deps`, `eco`.

### The principles a player can learn (today)

These are the generic rules. Each is true everywhere, which is what makes a new package
readable on sight.

1. **Unvetted things break.** The pager only ever takes down a node you have not cleared, and
   prefers risky ones.
2. **What breaks takes its dependents with it.** Every package above a downed node goes dark.
3. **Shared nodes are single points of failure.** One node under three packages is one outage
   that costs three powers. It is also one room that protects three packages.
4. **Two versions of one library fight.** Until both are vetted or shimmed, one side fails to
   load in each fight.
5. **Depth costs time.** Each room is a tick; there are fourteen.
6. **Shortcuts are loans.** Shims, hotfixes, pins and flags add debt; debt adds enemies, speeds
   the pager and fattens the boss.
7. **You cannot dodge what you cannot see.** Forecasts, risk markers and the boss's health bar
   all need observability.
8. **Production calls everything in.** Every unvetted node, shim and pin is struck during the
   boss fight. Vetted nodes hold.
9. **The neighbourhood tells you the fight.** A node's ecology decides what lives in its room.

Hub, leaf and bridge are not authored tags. They are facts about the graph the player built,
computed from it and visible on the map.

### Interaction resolution

When more than one rule could apply, the most specific wins:

1. Named synergy (planned).
2. Tag rule (planned).
3. Structural rule: the nine principles above (today).
4. Nothing special.

Almost everything should resolve at level 3. Levels 1 and 2 are seasoning.

### Dependency tags (planned)

A small curated set, each with exactly one rule the player can see in a room or on the map.
Candidates:

| Tag | Rule |
| --- | --- |
| `opaque` | Forecasts cannot name this node below observability 3; its room hides enemy health |
| `isolator` | An outage here does not cascade upward (a built-in container) |
| `heavy` | Its room costs two ticks |
| `noisy` | While unvetted, adds one enemy to every neighbouring room |
| `flaky` | Its room has a second wave nobody mentioned |

To add a tag: one visible rule, one plain-language sentence for the wiki, one line the report
can cite. Tags that only adjust a number are rejected.

## Axes

Each piece of content acts mainly on one axis and should touch one other, so pieces meet each
other naturally.

- **Shot**: what leaves the player.
- **Body**: movement, dash, survival.
- **Room**: enemies, hazards, layout.
- **Graph**: nodes, edges, sharing, conflicts.
- **Information**: what is shown, forecast or hidden.
- **Time**: ticks, cooldowns, escalation, debt.

`kubernot` is Shot (a drone) with a heavy Graph cost (three nodes, two ecologies). `logjam` is
Information with a Graph cost (it carries `jndi-lookup`, a risk-3 CVE). The pager is Time
acting through Graph onto Shot.

## Scoring rubric

Score a proposed package, dependency, tag, enemy, tool, hazard or boss mechanic before building
it. 0, 1 or 2 per line; maximum 12.

| Criterion | Question |
| --- | --- |
| **Felt** | Watching only the arena, does the player notice it within five seconds of it mattering? |
| **Agency** | Can the player use, avoid, time, route around or prepare for it? |
| **Traceability** | Can the report name it as a cause from the event log and run state? |
| **Graph relevance** | Does it change, depend on or travel through the graph? |
| **Interaction surface** | Does it meet at least two other systems through the stacking or structural rules? |
| **Counterplay** | Is there an intelligent response before or after it lands? |

- **Felt is a gate.** A 0 there rejects the piece whatever the total.
- 0–6: reject or redesign. 7–8: only if it fills a named gap. 9–10: admit. 11–12: strong.

The rubric filters out content that cannot be fun. It does not detect fun. Only a person
playing does that; see `docs/content-pipeline.md`.

### Worked examples

**`rabbit-hole-mq` (hits arc to two more enemies).** Felt 2: lightning jumps between enemies.
Agency 2: rewards herding enemies together. Traceability 2. Graph relevance 2: its tree
carries `protobuf@3`, which conflicts with anything on `grpc-lib`. Interaction surface 2:
arcs compound with split and explode. Counterplay 1. **11.**

**`modern-crypto` (+40% damage, 15% crits).** Felt 1: crit bolts are yellow and pop a number,
but the damage half is invisible. Agency 1. Traceability 2. Graph relevance 2: conflicts with
`legacy-auth` through `crypto-core`. Interaction surface 1. Counterplay 1. **8.** It stays for
the conflict it sets up, and its power is the first candidate for a rework.

**Memory Leak (enemy, grows the longer it lives).** Felt 2. Agency 2: burst it or kite it.
Traceability 2. Graph relevance 1: only through the `memory` ecology. Interaction surface 2.
Counterplay 2. **11.**

## Causal trace (today)

Anything that can hurt the player, take a power away, add debt, trigger an incident, change the
boss or appear in the report goes through `log()` in `js/sim.js` as a typed entry carrying the
ids involved. `js/reports.js` builds the postmortem from those entries and run state only. No
outcome may depend on state that is not logged or visible.

## Plain language

The setting is software; the rules are not. Someone who has never written code must be able to
play from the rule text alone.

- **Rule text is plain.** "Shots pierce 2 enemies", "This room is down; packages above it are
  off". The joke goes in the name and the tagline.
- **Every object gets one plain sentence** saying what the real thing is, for the in-game
  reference (planned).
- **A joke that needs the reference to land is fine. A rule that needs it is not.**

### Knowledge sources (planned)

In-fiction places to look things up, doubling as items. None of them calls a real model or
network; they are characters with seeded behaviour and canned lines.

- **The wiki**: one entry per package, dependency, enemy and tag, unlocked on first meeting and
  kept between runs. Plain sentence, rule, flavour.
- **A forum answer**: fixes a downed node now, adds debt, and is sometimes for the wrong version.
- **The assistant**: answers confidently. Right most of the time. The report says when it was not.
- **The comment thread**: rerolls the registry and offers strong opinions.

## Volume targets

Variety across runs comes from four places, in order of cost: more trees over the same
dependencies, more dependencies, more packages on existing primitives, more primitives.

| Kind | Today | Next | Later |
| --- | --- | --- | --- |
| Primitives | ~25 | 35 | 50 |
| Packages | 18 | 60 | 150+ |
| Dependencies | 40 | 120 | 250+ |
| Ecologies | 11 | 16 | 24 |
| Enemy types | 11 | 20 | 30 |
| Tags | 0 | 5 | 10 |
| Boss variants | 6 | 8 | 12 |

No more than three packages may share a headline primitive until the pool passes 60, so a run's
three offers rarely feel like the same choice.
