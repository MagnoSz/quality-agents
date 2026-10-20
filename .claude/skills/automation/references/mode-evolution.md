# Mode: Evolution

Analyze and improve an existing automation project, preserving functionality and compatibility.

## Inspect before proposing

Inspect the existing structure first. Identify:

- Reusable components (and components that should be reused but are not).
- Duplications.
- Coupling between layers or between tests.
- Improper dependencies (tests depending on execution order, specs importing other specs, environment-specific values in code).
- Isolation problems (shared state, shared accounts, leftover data).
- Fragile selectors (positional, styling-based, text that changes per language).
- Inappropriately shared data.
- Maintenance difficulties (long specs, unclear naming, missing fixtures).
- Execution and diagnostic problems (no traces/screenshots on failure, blind retries, fixed waits, unclear reports, slow pipelines).
- Documentation and AI guidance: missing or outdated `README.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/how-to.md`, `AGENTS.md`, `CLAUDE.md` ([target project docs](target-project-docs.md)). Adding them is usually the first, lowest-risk improvement.

Base findings on evidence (file paths, line references, execution history) — never on assumptions.

## Propose incrementally

For each improvement:

| Field | Content |
|---|---|
| Finding | What and where (paths) |
| Proposal | The smallest change that solves it |
| Benefit | Why it is worth it |
| Risk | What could break; consumers affected |
| Verification | How it will be proven not to change test behavior (run before/after) |
| Effort | Rough size |

Order by value/risk. Each proposal is approved separately.

**Do not restructure the whole project just to make it look like the reference template.** Align with the reference only where it solves a real problem.

## Apply

Apply approved proposals one at a time, run the affected tests before and after, report results. Stop and report if behavior changes. Record each applied change in `docs/decisions.md` and update `docs/architecture.md` / `AGENTS.md` when it changes structure or conventions.
