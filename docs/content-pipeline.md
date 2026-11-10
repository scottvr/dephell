# Content pipeline

**Generate broadly. Admit narrowly.**

The game needs far more content than anyone wants to hand-tune. The answer is a set of gates
strict enough that candidates can be produced cheaply and in bulk, with most of them thrown
away. `docs/content-model.md` defines what a good piece looks like; this document defines how
a candidate gets in.

Nothing here runs inside the game. The game stays zero-build and opens from disk. Candidates
are written offline, by a person or by a model in an authoring session, and what passes is
committed to `js/content.js` like any other change.

Status: gates 1, 3 and 4 have tools (`tools/content-lint.js`, `tools/bot-run.js --with` /
`--each`). Powers are data (`fx` lists). Gate 5 is done by hand with `tools/shots.js`. The
candidate file format and the rejection writer are still to build; until then a candidate is
added to `js/content.js` on a branch and the tools are run against it.

## The gates

```
candidate
  -> 1 lint          shape, references, text fits the screen
  -> 2 rubric        six scores; Felt is a hard gate
  -> 3 similarity    is this already in the game under another name
  -> 4 simulation    the bot plays with it; nothing breaks, balance stays in band
  -> 5 look          screenshot of it in a fight
  -> 6 play          a person plays a small batch
admitted
```

Gates are ordered cheapest first. A candidate that fails gets a structured rejection and may be
revised and resubmitted up to three times; after that it is dropped.

### 1. Lint (`tools/content-lint.js`)

Mechanical, no judgement.

- Required fields present and typed; ids unique; names unique.
- Every `deps` entry exists; the dependency graph has no cycles.
- Every `lib` has at least two members, or the conflict can never occur.
- `eco` exists in `ECO`; every enemy in an ecology exists in `ENEMIES`.
- `fx` uses known stats and ops only.
- Power text, tagline and blurb fit their UI slots (character limits taken from the registry
  card and sidebar widths).
- A plain-language sentence is present and contains no word from the jargon list without the
  rule also being stated in plain terms. (Not checked yet: the field does not exist.)
- Tree size between 0 and 6 nodes; total debt on install within bounds.

### 2. Rubric

The author scores the six criteria from the content model and writes one sentence per score.
Felt 0 rejects. Total under 9 rejects unless the candidate names the gap it fills.

The scores are claims, and the later gates check them: gate 5 checks Felt, gate 4 checks
Agency and Counterplay as far as a bot can.

### 3. Similarity (`tools/content-lint.js`, same run)

Cheap checks first:

- same headline primitive as three existing packages: reject;
- same headline primitive and same ecology as any existing package: reject;
- identical `fx` shape (same stats and ops, in any order) as an existing package: reject;
- tree identical to, or a subset of, an existing package's tree: reject;
- name within edit distance 2 of an existing name: reject.

For dependencies: same ecology, risk, flag and position in the same trees as an existing one
means it adds a room and no decision. Reject.

Different words for the same idea get through these. Gate 6 catches the rest.

### 4. Simulation (`tools/bot-run.js --with=<id>`, or `--each` for the whole pool)

Run the bot over a fixed seed set twice: once on the current pool, once with the candidate
forced into the first registry offer.

- No stuck runs, no exceptions.
- Win rate moves by no more than 10 points either way.
- The candidate's own room and every room in its tree is reachable and clearable.
- Estimated damage per second with the candidate alone stays within 0.8× to 1.7× of base.
- With the candidate in the pool unforced, it is offered and picked at a plausible rate.
- Every way it can hurt the player appears in the event log, and the report can cite it.

Runs are deterministic: the same seed and policy replay exactly, so a before/after difference
is the change and not noise between runs. Across seeds there is still sampling noise; at 30
seeds a swing under about 10 points means little, so use 100 or more before acting on one.

The bot aims perfectly and plans badly. It finds deadlocks, runaway numbers and dead content.
It has no opinion on whether anything is enjoyable.

### 5. Look (`tools/shots.js`, add a per-candidate shot)

Render a fight with only the candidate installed and one without it. If the two pictures
cannot be told apart, the Felt score was wrong and the candidate goes back.

### 6. Play

The only gate that measures fun. To keep it useful:

- Admit in batches of five to eight, so a playtest reaction can be attributed.
- The batch note lists what is new in one line each, in plain language.
- One question per new piece after a few runs: did you notice it, and did you want it again?
  "Did not notice" sends it back to gate 5. "Noticed, did not want" is a tuning or redesign
  call. No longer questionnaire than that.

## Rejection format

Written so a revision can be mechanical.

```
REJECTED  gate 3 similarity
  candidate: thread-pool  (headline: drones +1)
  reason:    same headline primitive and ecology as kubernot
  keep:      eco=async, tree=[retry-lib, backtrack-engine]
  change:    headline primitive; unused in async: bounce is taken, cron and orbitals are free
```

## What can be produced in bulk

Sorted by how safe it is to generate many and keep few.

| Content | Gates that apply | Risk |
| --- | --- | --- |
| Taglines, blurbs, incident lines, report lines, wiki entries | 1, tone read | Low: text only |
| Dependencies on existing ecologies and flags | 1, 3, 4 | Low |
| Trees: which dependencies a package pulls | 1, 3, 4 | Low |
| Packages on existing primitives | all | Medium |
| Ecologies (new mixes of existing enemies) | 1, 4, 6 | Medium |
| Tags, enemies, primitives, bosses | Hand-built code; 2, 4, 5, 6 | High, small numbers |

## Order of work

1. Done: powers are `fx` data; bot results identical before and after.
2. Done: lint and similarity checks pass on the existing content with two warnings.
3. Done: `--with` and `--each`. Per-candidate shots still to add.
4. First batch: dependencies and trees only, to widen the cost layer under existing powers.
5. Second batch: packages on unused primitive and ecology pairs.
6. Then new primitives and tags, a few at a time, each followed by a batch that uses them.
