# Change playbooks

What each type of change touches, in implementation order. A playbook is the minimum to check, not a reason to touch files the change does not need.

## Impact checklist

Mark each item affected or not affected, with the reason, in the proposal's Impact section.

1. **Callers:** every importer and caller of the touched symbols (search `scripts/`, `desktop/`, `app/src/`, `tests/`).
2. **Content readers:** skills, agents, workflows, examples and docs that name the touched file, field, step id or phrase.
3. **Generated mirrors:** does `npm run build` output change?
4. **Validation and checks:** `validate.mjs` rules, `check-artifacts` locations, `check-secrets`, `check-output`.
5. **Business rules and invariants** (`moki-architecture`): which apply and how they stay intact.
6. **Desktop security model:** IPC, input validation, path confinement, launching, rendering.
7. **UI:** `api.ts` types, components, `pt-BR.json` entries.
8. **Existing user data:** workspaces, `project.json`, `state.json`, custom agents in `workspace/library/agents/`, installed skills and agents.
9. **Platforms:** Windows, macOS, Linux (paths, quoting, terminals).
10. **Installer:** `extraResources`, `asarUnpack`, `desktop/framework.ts` sync.
11. **Docs:** `AGENTS.md` (≤ 32 KB), `README.md` + `README.pt-BR.md`, `docs/*`, `adapters/*`.
12. **Tests:** which existing tests cover it; which test to add or adjust.

## Playbooks

### Edit a skill's procedure, rules or outputs
`skills/<name>/SKILL.md` or its `references/`/`assets/` → if a step id, fixed phrase or layout changes: vocabulary, `scripts/check-output.mjs`, `examples/<name>/`, workflows that reference it → `npm run build`.

### Add a skill
Follow `docs/skill-standard.md` § Adding a new skill: folder and frontmatter (status) → 13 sections → `examples/<name>/` (usable skills) → row in `AGENTS.md` → workflow if it chains → retrieval-map row in `skills/project-context/references/context-files.md` if it needs project context → if it becomes an app or menu activity: `ACTIVITIES`, `ActivityKey`, `buildPrompt` case, `pt-BR.json` label and hint, `scripts/qa.ts` help → README pair if user-facing → `npm run build`.

### Change a core policy
`core/<file>.md` reaches every skill through the build. Check consistency with `AGENTS.md` golden rules and every skill that cites the policy → `npm run build`.

### Add or change a built-in agent
`agents/<category>/<name>.md` (four sections, existing skills, access level) → `agents/categories.json` for a new category → agent table in `AGENTS.md` → `npm run build` (Claude Code subagent) → `docs/agents.md` / README pair if user-facing. Renaming or removing: search every reference; custom copies keep `metadata.basedOn`; `project.json` `agents` lists drop unknown names silently — state this in Impact.

### Add or change a workflow
`skills/qa-orchestrator/references/workflows/<id>.md` with a ` ```json workflow ` block (schema `schemas/workflow.schema.json`, `id` = file name, `dependsOn` earlier steps only) → `qa-orchestrator` text if it lists workflows → `AGENTS.md` workflow list.

### Change a data contract (`state.json`, `project.json`, workflow)
`schemas/*.json` → `templates/project-context/` → readers in `scripts/lib/core.ts`, `desktop/service.ts`, `scripts/runs.mjs` → policies and skills that describe the field → `api.ts` types. New fields optional with a default; a required field needs a migration plan.

### Add a helper command or flag
`scripts/<name>.mjs` reusing `scripts/lib/` (`parseArgs`, `ROOT`, `workspaceDir`) → `package.json` script → helper table in `AGENTS.md` and README pair if user-facing → test in `tests/framework.test.mjs` → if outputs are versioned, `check-artifacts`.

### Change a shared library (`scripts/lib/`)
Search every importer (CLI, terminal menu, desktop, validator, build, tests) → keep exported signatures (add optional parameters last) → test.

### Add an app capability
Service method (validate every input, `projectDir`/`inside`, fixed lists, `ServiceError`) → typed wrapper in `app/src/api.ts` → screen or component → `t()` strings + `pt-BR.json` → test in `tests/desktop.test.ts` → `docs/desktop-app.md` when it changes pieces or the security model.

### Add an activity to the app and the menu
`ACTIVITIES` + `ActivityKey` + `buildPrompt` case → `pt-BR.json` label and hint (`tests/i18n.test.ts`) → `scripts/qa.ts` help → docs. The skill must exist; if it is not usable the activity shows as unavailable.

### Add an AI tool
`TOOLS` + `ToolKey` (`scripts/lib/core.ts`) → detection → `desktop/launcher.ts` and `desktop/terminals.ts` behavior → launcher tests → README pair and `adapters/`.

### Packaging and installer
`package.json` `build` (`extraResources`, `asarUnpack`) → `scripts/build-desktop.mjs` → `desktop/framework.ts` / `desktop/boot.ts` (never touch the workspace folders) → test "installer framework sync" in `tests/desktop.test.ts`. Run `dist:*` only when asked.

### New versioned top-level path
`ALLOWED_ROOT_FILES`/`ALLOWED_ROOT_DIRS` (and `BINARY_ALLOWED` for binaries) in `scripts/check-artifacts.mjs` with the reason → README pair "Where things live" if user-facing.

### Docs only
`npm run validate` checks links in `README*.md`, `AGENTS.md`, `docs/`, `adapters/`, `examples/`, `templates/`, `core/`. Keep the README pair in sync.

### Fix a failing check
Read the full output → find the rule and why it exists (`moki-architecture`) → fix the content or code. If the rule itself is wrong, that is a separate proposal.

## Verification matrix

| Touched | Run, in order |
|---|---|
| `skills/`, `core/`, `agents/`, `AGENTS.md`, workflows, schemas, templates, examples | `npm run build` → `npm run check` → `npm test` |
| `scripts/` | `npm run typecheck` → `npm run check` → `npm test` |
| `desktop/`, `app/` | `npm run typecheck` → `npm run app:build` → `npm test`; `npm run test:ui` for UI flows; manual look with `npm run app:dev` or `QA_SCREENSHOT=<file.png>` |
| `package.json` `build` | `npm run app:build`; `npm run dist:<os>` only when asked |
| Docs only | `npm run validate` |
| New untracked files | `node scripts/check-artifacts.mjs <paths>` and `node scripts/check-secrets.mjs <paths>` (`--all` reads only tracked files) |
| Always, before declaring done | `npm run typecheck && npm run check && npm test` |

CI runs: typecheck → `app:build` → validate → `check-artifacts --all` → `check-secrets --all` → `node --test` (Node 24). The pre-commit hook runs `check-artifacts`, `check-secrets` (staged files) and `build --check`.
