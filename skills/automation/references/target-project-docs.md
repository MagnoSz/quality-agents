# Documentation and AI guidance inside the automation project

Every automation project built by this skill must be **self-explanatory and AI-ready on its own**: a QA who clones only that repository must understand its architecture and be able to work on it with any AI tool, without the Moki framework.

These files are created in **Construction**, kept current in **Implementation**, and checked (and added if missing) in **Evolution**. They live in the target repository and follow its version-control policy.

## Required files

| File | Purpose | Audience |
|---|---|---|
| `README.md` | What the project automates, prerequisites, install, configure environments (env vars, never secrets), run (all, by tag, by file), view reports, CI | Any QA |
| `docs/architecture.md` | Architecture: folder layout, layers (spec / flow / utils / fixtures / data), responsibilities and dependency rules between layers, data strategy, bootstrap and cleanup, execution strategy, diagnostics, reports, pipeline | QA, reviewers |
| `docs/decisions.md` | **How it was built**: each architecture decision with context, options considered, choice, reason, date (short ADR entries). Appended on every relevant change | Maintainers |
| `docs/how-to.md` | Step-by-step recipes: add a spec, add/extend a flow, add a fixture, prepare data, add a selector, debug a failure (trace, screenshots), update snapshots if used | Any QA |
| `docs/traceability.md` | How tests link to scenarios (FLX ids in test titles/tags), where the scenario ↔ test mapping is kept | QA, auditors |
| `AGENTS.md` | AI guidance read natively by Codex, Cursor and others: project purpose, architecture summary with link to `docs/architecture.md`, layer rules, naming, how to run and validate, the governance rules below, what the AI must not do | AI tools |
| `CLAUDE.md` | One line: `@AGENTS.md` (makes Claude Code load the same guidance) | Claude Code |

Optional, only if the team wants them: repository-local skills (e.g. "add an automated scenario") in `.agents/skills/` and `.claude/skills/`, following the Agent Skills format. Keep one source of truth — do not duplicate `AGENTS.md` content in tool-specific files.

## AGENTS.md content (minimum)

1. **Project** — system under test (name only), what is automated, stack and versions.
2. **Architecture in brief** — layers and their responsibilities; dependency direction (spec → flow → utils; specs never import other specs); link to `docs/architecture.md`.
3. **Conventions** — folder/file naming, test naming with scenario ids, tags, selector strategy, fixtures usage, data creation and cleanup.
4. **Commands** — install, run all, run one file/tag, open report, lint/type check.
5. **How to add an automated scenario** — short checklist pointing to `docs/how-to.md`.
6. **Governance rules for AI** — present a plan before changing code; reuse before creating; never weaken or remove assertions to pass tests; expected behavior comes from the documented scenario/oracle, not from observed behavior; do not change shared components without listing consumers; no destructive or global changes without authorization; secrets only via environment variables; keep `docs/` and this file updated when architecture or conventions change.
7. **Where results go** — reports/traces folders (ignored by Git).

Keep `AGENTS.md` concise (well under 32 KiB) and specific to this repository. It must not contain business rules, credentials, or content copied from another system.

## Keeping them current

| Event | Update |
|---|---|
| New layer, fixture type, data mechanism or execution strategy | `docs/architecture.md`, `docs/decisions.md`, `AGENTS.md` |
| New reusable component | `docs/architecture.md` (component list) and, if it changes how tests are written, `docs/how-to.md` |
| New command or configuration | `README.md`, `AGENTS.md` |
| New scenarios automated | `docs/traceability.md` if the mapping lives there |

Documentation changes are part of the implementation plan and of the delivery report.

## Validation

- All required files exist and are linked from `README.md`.
- Commands in `README.md`/`AGENTS.md` were actually executed during validation and work.
- `docs/architecture.md` matches the real folder structure (no layers that do not exist, no undocumented layers).
- `docs/decisions.md` has an entry for every decision taken in this run.
