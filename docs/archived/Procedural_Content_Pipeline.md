Generate broadly. Admit narrowly.



---
log

I'm sure you can predict what it is that I am thinking, and that it isn;t solely about ensuring quality. The next natural step once this is implemented is to then automate the content creation, even with a small cheap LLM, ince the linter, runric, etc. will ensure that garbage does not get through! We could even make a similaarity scorer to prevent dupplicates, and the small haraness that tries to genrate new assets can just revise and re-submit an idea up to n times, with templated replacer logic. Duz I want this game to eist, but I don't want to spend a year hadcrafting assets or having to manually ensure  unique ideas.

Oh yes, I absolutely see the shape of that thought.
You’re not just building a gate to keep bad content out. You’re building a content compiler.
The flow becomes:

```
LLM proposes content
-> schema validates shape
-> ontology validates tags
-> rubric scores agency/traceability/graph relevance/etc.
-> interaction resolver checks fallback behavior
-> similarity scorer checks for duplicates
-> simulation harness checks balance/pathology
-> accepted content enters the game
-> rejected content gets structured feedback and retries
```

cheap model does not need to be brilliant if the validators are opinionated. It can throw ideas at the wall; the schema/rubric/sim harness decide what survives

The similarity scorer is especially smart. Even before embeddings, we can start with cheap checks:
same domain + same graph role + same primary risk
overlapping tags above threshold
same effect verbs in same order
same combat verb
same postmortem hook pattern
Later embeddings can catch “different words, same idea.”
The retry loop could be beautifully mechanical:

```
Rejected:
- Score 5/10
- Missing counterplay
- Too similar to Compatibility Shim
- No causal trace for failure outcome

Revision instruction:
Keep domain=deploy and graph_role=bridge.
Add counterplay through Observability or route choice.
Replace direct damage bonus with topology or information effect.
Add postmortem hook.
```

iNot just content generation, it's SUPERVISED MUTATION.
