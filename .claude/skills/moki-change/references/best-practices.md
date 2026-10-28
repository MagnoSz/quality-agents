# Best practices

## Layer ownership — where each change goes

| Concern | Goes in | Never in |
|---|---|---|
| How an activity is done: steps, rules, gates, outputs | Skill text in `skills/<name>/` | Code — scripts and the app never do QA |
| A rule every skill follows | `core/*.md` (injected as `references/core/`) | Copied into each skill |
| Who does it and with which access | `agents/<category>/<name>.md` | A skill |
| Logic used by the CLI, the terminal menu, the app, the validator or the build | `scripts/lib/` | Duplicated in `desktop/` or `scripts/qa.ts` |
| A privileged operation the UI needs (files, processes, network) | A method of `createService` in `desktop/service.ts`: inputs validated, paths through `projectDir`/`inside`, `ServiceError` for user-facing failures | `app/`, `preload.ts`, a new request channel |
| A new UI action | Service method (exposed automatically through `callService`) → typed wrapper in `app/src/api.ts` → component | `window.qa` used outside `api.ts` |
| UI text | `t('English text')` while rendering + entry in `app/src/i18n/pt-BR.json` | Module-scope constants, untranslated strings |
| Deterministic check of an AI deliverable | `scripts/check-output.mjs` + the example's checklist | Model judgment alone |
| Deliverable layout | `skills/<name>/assets/*.layout.json` + `npm run xlsx`, `docx` or `pdf` | Ad hoc generation code |
| A newly versioned top-level path | `ALLOWED_ROOT_FILES`/`ALLOWED_ROOT_DIRS` in `scripts/check-artifacts.mjs`, deliberately | Committing first and fixing the check later |
| Files shipped with the installer | `package.json` `build.extraResources` | Hard-coded copies in `desktop/` |

## Design

- **Ladder first:** is it needed at all → does `scripts/lib/` or an extension table already do it → Node standard library → platform feature → minimum new code. Two options that work: take the simpler one.
- **Open/closed through tables:** add an entry to `ACTIVITIES`, `TOOLS`, `REQUIRED_SECTIONS`, `MIRRORS`, a layout or a workflow instead of an `if` on a name.
- **Single responsibility:** one concern per module and function; split by responsibility, not by size.
- **Substitutable contracts:** keep the shapes of `Deps`, `Launcher`, service methods and exported functions; add optional parameters at the end.
- **Dependency inversion where it already exists:** inject through `Deps` (the test seam). Do not add an interface, factory or config with a single implementation just to follow a principle.
- **Compatibility:** existing workspaces, projects, runs and custom agents keep working. New fields are optional with a default when absent; renamed or removed items get a migration path in the proposal.

## Code conventions

- ESM with `node:` imports; no runtime dependencies.
- TypeScript run directly by Node: erasable syntax only (no `enum`, `namespace`, parameter properties), relative imports with the `.ts` extension, `import type` for types. Follow the file's language (`.mjs` or `.ts`); do not convert files as a side effect.
- Scripts: header comment with purpose and usage; exported functions for tests; CLI behind `if (import.meta.url === pathToFileURL(process.argv[1]).href)`; problems printed and `process.exit(1)`.
- Paths: `ROOT` from `repo.mjs` (honors `QA_ROOT`) and `workspaceDir()` (honors `QA_WORKSPACE`) — never `join(ROOT, 'workspace')`. Build with `join`, store and compare with `/` (`relPosix`, `toPosix`).
- Processes: arguments as arrays (`spawn`, `execFileSync`); user text never in a shell string.
- Validate at boundaries: everything the service receives is `unknown` until checked (type, list membership, length limits).
- Errors: clear messages that say what to do; no empty `catch` except documented best-effort reads, with a comment saying why.
- Names reveal intent; small functions; no dead or commented-out code; comments explain *why*, not *what*.
- Tests: `node:test` + `node:assert/strict`. `framework.test.mjs` mutates a temporary `fixture()` copy; `desktop.test.ts` uses `createService` with fake `Deps` and never starts real tools. Every non-trivial branch, parser or security rule leaves one test that fails if it breaks.
- Skill text: plain imperative English; `SKILL.md` keeps the procedure, details go to `references/` one level deep; keep step ids and fixed phrases stable; `metadata.version` stays semver (the repository has not bumped skill versions on edits — do not bump unless asked).

## Workarounds — never

| Workaround (gambiarra) | Do instead |
|---|---|
| Edit `.agents/skills/`, `.claude/skills/` or `.claude/agents/` | Edit `skills/`, `core/`, `agents/`, then `npm run build` |
| `git commit --no-verify`, disabling the hook or a CI step | Fix what the check reports |
| Loosen a validator, test, assertion, regex or limit (500 lines, 32 KB, required sections, prefixes) to get green | Make the content comply; changing a rule is its own approved change with rationale, docs and tests |
| Add a path to `ALLOWED_ROOT_*` or `BINARY_ALLOWED` to commit a run artifact | Move it to the workspace folder |
| `qa-agents:allow-secret` on a real value | Remove the secret; reference an environment variable by name |
| `if (skill === 'x')` / `if (agent === 'y')` in shared code | A table entry or skill/agent metadata |
| Copy a helper into another file | Import it from `scripts/lib/`, or move it there |
| A dependency for what a few lines do | Standard library or a small local function |
| `any`, `as unknown as`, `@ts-ignore`, non-null `!` to silence the compiler | Fix the types |
| Swallow errors to hide a failure | Handle it, or fail with a clear message |
| A new request channel, `ipcRenderer` or Node APIs exposed in the preload | A service method behind `qa:call` |
| A file path sent by the UI and used as is | Ids from listings, `pickFolder`, `resolveInside` |
| User text concatenated into a shell command | Prompt as one argument (`launcher.ts`) |
| Change a fixed phrase, step id or layout in one place | Change skill, vocabulary, `check-output`, examples and docs together |
| Duplicate a core policy inside a skill | Link `references/core/<file>.md` |
| Unrelated refactors or formatting in the same change | A separate, proposed change |
| Silent behavior change for existing users | State it in the proposal; keep a compatible default |
