# Example: moki-architecture

Acts on this repository itself: no project and no input files. Ask the questions below to the `moki-consultant` agent, or with the `moki-architecture` skill.

## Case 1 — a flow across layers

Request: "When I click Open in the desktop app, how does my request reach Claude Code, and where could my text end up in a shell command?"

- [ ] Traces `app/src/api.ts` → `window.qa.call` (`desktop/preload.ts`) → IPC `qa:call` in `desktop/main.ts` (`trusted()`, `METHODS`) → `launch` in `desktop/service.ts` (fixed lists, usable and enabled agent) → `buildPrompt` (`scripts/lib/core.ts`) → `desktop/launcher.ts`.
- [ ] States the invariant: user text only travels as the prompt argument (`cleanPrompt`; UTF-8 request file on Windows; single-quoted script on macOS/Linux) — never inside a shell command line.
- [ ] Every path and symbol named exists; no file changed (`git status` unchanged).

## Case 2 — a business rule

Request: "Can a skill save its report in docs/?"

- [ ] No: the isolation policy forbids writing generated content into framework folders (`core/isolation-policy.md`), `npm run validate` rejects backticked output paths outside the allowed prefixes (`OUTPUT_PATH_PREFIXES` in `scripts/validate.mjs`), and `check-artifacts` blocks committing deliverables.
- [ ] Says where it goes instead: the outputs folder of the run, inside the project folder.
