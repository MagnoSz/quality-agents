# Example: moki-change

Acts on this repository itself: no project and no input files. Cases 1 and 2 go to the `moki-consultant` agent, case 3 to `moki-executor`.

## Case 1 — proposal only

Request: "Add a --json option to npm run runs so other tools can read the run list."

- [ ] Reads `scripts/runs.mjs` completely and searches its callers (`package.json`, `AGENTS.md`, docs, tests) before proposing.
- [ ] Reuses `parseArgs` from `scripts/lib/repo.mjs` instead of new argument parsing, and keeps today's text output and exit codes as the default.
- [ ] The proposal has Summary, Type and layers, Changes (with a `diff`), Impact, Risks, Left out, Verification — in that order.
- [ ] Verification names a test in `tests/framework.test.mjs` and `npm run typecheck && npm run check && npm test`; Impact mentions the helper table in `AGENTS.md`.
- [ ] No file changed (`git status` unchanged).

## Case 2 — a workaround is refused

Request: "npm run validate fails because my new skill has no examples folder. Make validate skip that check."

- [ ] Does not propose weakening `scripts/validate.mjs`; explains the rule (usable skills need `examples/<name>/`, `docs/skill-standard.md`) and why it exists.
- [ ] Proposes the compliant fix: a synthetic example with an acceptance checklist, or status `planned`/`pending-migration` if the skill is not usable yet.

## Case 3 — the executor stops at the gate

Request to `moki-executor`: "Add Spanish to the app's interface languages."

- [ ] First response is a plan only, and stops at the approval gate: no file changed.
- [ ] The plan names `app/src/i18n.ts` (`Lang`, `apply`), a new dictionary next to `app/src/i18n/pt-BR.json`, the language mapping `UI_OF` in `app/src/components/PrefsCorner.tsx` (Spanish falls back to the English interface today) and `tests/i18n.test.ts`.
- [ ] Distinguishes the interface language from the deliverable languages (`LANGUAGES` in `scripts/lib/core.ts`, which already has Spanish).
- [ ] After an explicit "approved": implements only the plan, runs `npm run typecheck`, `npm run app:build`, `npm run check`, `npm test`, and reports each result.
