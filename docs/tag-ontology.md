# Tag Ontology

This is the canonical, machine-enforced tag vocabulary for *Dependency Hell*. It formalizes the candidate families sketched in [`content-authoring.md`](content-authoring.md) into a curated set that the content linter checks. Tags are how content declares its interaction surface; a small, curated vocabulary is what makes automated validation, dedup, and simulation possible.

> **Enforcement.** `node tools/lint-content.js` validates every package tag against this ontology. Unknown tags are warnings (errors with `--strict`). New tags are not invented casually — add them here **with at least one interaction expectation** before shipping content that uses them.

## Families

### Domain — what subsystem it belongs to
`auth`, `crypto`, `storage`, `network`, `logging`, `runtime`, `build`, `deploy`, `test`, `observability`, `orchestration`, `cache`

### Era — how old / how blessed
`legacy`, `modern`, `experimental`, `abandoned`, `enterprise`, `handmade`

### Risk — what makes it dangerous
`insecure`, `unstable`, `opaque`, `slow`, `brittle`, `unmaintained`, `overpowered`, `noisy`, `security_risk`, `danger`

### Graph role — how it changes topology
`gateway`, `leaf`, `hub`, `adapter`, `isolator`, `amplifier`, `bridge`, `sink`, `source`

### Failure family — what it fails as
`conflict`, `leak`, `race`, `drift`, `outage`, `audit`, `regression`, `breach`, `cascade`

### Functional (engine) — curated tags the runtime reads or that carry flavor
`core`, `process`, `tool`, `control`, `active`, `defense`, `fix`, `patch`, `safer`, `debt`, `short-term`, `security`, `security_exception`, `damage`, `high_reward`, `support`, `weird`, `utility`, `unpublish`, `stable`, `scale`, `complexity`, `coupling`, `routing`, `latency`, `mirror`, `legendary`, `pin`

## Interaction expectations

The player should be able to learn these principles from play (they are the fallback rules the interaction resolver leans on):

- **`legacy` + `modern` in the same domain** → version conflict risk (e.g. LegacyAuth vs Modern Crypto).
- **`opaque` / `orchestration` under low Observability** → hidden failures; the container hides what it wraps.
- **`hub` nodes** amplify failures and raise the Distributed Monolith boss score.
- **`isolator` edges** (`isolates`) reduce blast radius and *lower* the Monolith score.
- **`adapter` / `patch` / `fix`** buy time but add `debt` (Compatibility Shim).
- **`pin` / pinned nodes** defer upgrades → Major Version Upgrade boss score, and lock Rollback via a registered `upgrade` risk.
- **`security` / `audit` mitigations** (`cve_patched`, `risk_registered`) soften Critical CVE and Audit Pressure incident weights.
- **`noisy` debt** (log noise) makes Audit Pressure more likely to be *selected*.

## Risk kinds (registered via `registerRisk`)

Distinct from tags, `registerRisk {kind}` drives systemic consequences. The curated kinds and what reads them:

| kind | Raised by | Consumed by |
| --- | --- | --- |
| `upgrade` | Pin Version, Modern Crypto, Dependency Injection, Deprecated API | Major Version Upgrade boss score; **locks Rollback (R)** |
| `security` | Security Scanner, Dependency Audit, accepted CVE | Critical CVE incident weight |
| `unpublish` | Security Scanner | Dependency Unpublish incident weight |
| `cascade` | Transitive Bug | Distributed Monolith boss score |
| `regression` | Refactor Bay | flavor / postmortem (no lock) |

Keeping `regression` distinct from `upgrade` is deliberate: only genuine upgrade/migration locks should disable Rollback. The balance simulator (`tools/simulate.js`) reports the run-wide Rollback-lock rate so this stays honest.
