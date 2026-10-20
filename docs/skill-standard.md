# Skill standard

Every skill follows the [Agent Skills specification](https://agentskills.io/specification) using **only its portable fields**, plus this repository's conventions. `npm run validate` enforces everything marked ✔.

## Folder

```text
skills/<name>/
├── SKILL.md          # required, < 500 lines ✔
├── references/       # detailed procedures loaded only when a step needs them
├── assets/           # templates, layouts, static data
└── scripts/          # optional executable helpers
```

- Folder name = `name`: lowercase letters, digits, single hyphens, ≤ 64 chars ✔.
- Links from a skill must stay inside the skill folder (skills are distributed standalone) ✔. Core policies are linked as `references/core/<file>.md`; the build injects them from `core/` ✔.
- Do not edit `.agents/skills/` or `.claude/skills/`; they are generated ✔ (drift check).

## Frontmatter

Single-line values only (no YAML `>` or `|` blocks) ✔.

```yaml
---
name: my-skill
description: What it does and when to use it, in one line, max 1024 characters.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  phase: "2"
---
```

| Field | Rule |
|---|---|
| `name` | Required ✔ |
| `description` | Required, ≤ 1024 chars ✔. First what it does, then "Use when...". Keep it short: tools truncate long skill lists. |
| `license` | Required ✔ |
| `metadata.version` | Semver ✔ |
| `metadata.status` | `stable` · `draft` · `pending-migration` (defined, waiting for source or reference material) · `planned` ✔ |
| other keys | Only `compatibility` and `allowed-tools` from the spec ✔ |

Status rules ✔: `planned` descriptions start with `[PLANNED]`, `pending-migration` with `[PENDING MIGRATION]`, so tools that only read descriptions know not to run them. `stable` and `draft` skills need an `examples/<name>/` folder.

- **draft**: procedure complete and usable; not yet validated in two AI tools.
- **stable**: passed the acceptance checklist in at least two tools (recorded in [compatibility-tests.md](compatibility-tests.md)).

## Required sections (in `SKILL.md`) ✔

| # | Heading | Content |
|---|---|---|
| 1 | (frontmatter + `# Title`) | Name and description |
| 2 | `## Purpose` | Objective |
| 3 | `## Responsibilities` | What it does and explicitly does not do |
| 4 | `## When to use` | Activation criteria and when not to use |
| 5 | `## Inputs` | Required and optional |
| 6 | `## Tools` | Capabilities needed and the fallback when absent |
| 7 | `## Procedure` | Ordered steps with step ids used in `state.json` |
| 8 | `## Rules and constraints` | Including links to core policies |
| 9 | `## Validation criteria` | Objective, checkable |
| 10 | `## Output format` | Exact formats and file locations |
| 11 | `## Human approval points` | Gates |
| 12 | `## Error handling` | |
| 13 | `## Completion criteria` | |
| 14 | `## Persistence` | What goes into the run folder |

In **Output format** and **Persistence**, every path in backticks must start with `workspace/projects/<project-id>/`, `<target-repo>/`, `references/` or `assets/` ✔.

## Writing guidance

- Write for any capable model: plain imperative English, no vendor-specific syntax.
- Keep `SKILL.md` to the procedure; move long checklists and formats to `references/`, one level deep.
- Preserve exact phrases that the user will see (gate questions, fixed messages) in the deliverable language — put translations in a vocabulary reference.
- Prefer deterministic checks (scripts) for anything that can be verified mechanically.
- Never hard-code a company's or application's rules; put them in project context (`templates/project-context/`).

## Adding a new skill

1. Copy an existing skill folder (e.g. `skills/failure-analysis/`) to `skills/<new-name>/`; adjust frontmatter and sections.
2. Add synthetic inputs and an acceptance checklist to `examples/<new-name>/`.
3. Add the skill to the catalog table in `AGENTS.md` ✔ and, if needed, to a workflow in `skills/qa-orchestrator/references/workflows/` ✔.
4. If the skill needs project knowledge, add its row to the retrieval map in `skills/project-context/references/context-files.md`.
5. `npm run build && npm run check && npm test`.
