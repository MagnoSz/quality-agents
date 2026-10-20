# Compatibility tests

A skill becomes **stable** only after passing its example's acceptance checklist in **at least two AI tools**. Model answers that merely look plausible do not count; use the checklist items and `npm run check-output` where available.

## Procedure

1. Fresh clone; `npm run setup`; `npm run new-project -- acme-library "Acme Library"`.
2. For each example in [examples/](../examples/README.md): run it in the tool, tick the checklist, run the deterministic checks.
3. Record one row per tool × skill below (tool version and model included). Note every failed item.
4. Do not paste real project data here — this file is versioned.

## Framework checks (deterministic)

| Check | Command | Result (2026-10-20, Windows 11, Node 24) |
|---|---|---|
| Skill structure, metadata, links, workflows, schemas, AGENTS.md, mirrors | `npm run validate` | Pass (8 skills) |
| No artifacts / no secrets in Git | `npm run check` | Pass; pre-commit hook blocked a forced `workspace/` file and a fake GitHub token |
| Unit tests of the checks (incl. negative cases) | `npm test` | 27/27 pass |
| Official Agent Skills validator | `skills-ref validate .agents/skills/<name>` | 8/8 valid (skills-ref 0.1.1) |
| xlsx write → re-save in another library (openpyxl) → read back | `npm run xlsx` | Pass: 7 sheets, frozen row, filter, widths, styles, dropdowns; edits detected on read |
| PDF rendering | `npm run pdf` | Pass with Microsoft Edge (headless) |
| Run isolation check | `npm run runs` | Flags a `state.json` pointing to another project |
| Terminal assistant | `qa` | Interactive menu driven end to end (invalid input re-asked, unavailable skill greyed out, missing file rejected, no overwrite in inbox, tool detection); prompt passed as a single argument on Windows `.cmd` shims with quotes and `&`; bin shim works via `npm exec` |

## Tool × skill results

| Date | Tool + version | Model | Skill | Result | Failed items / notes |
|---|---|---|---|---|---|
| 2026-10-20 | Claude Code (VS Code extension) | Claude Opus 5.5 | all | Discovery only | All 8 skills were discovered from `.claude/skills/` with their descriptions. |
| 2026-10-20 | Claude Code (VS Code extension) | Claude Opus 5.5 | failure-analysis | Format checks pass — weak evidence | Outputs written by the same session that authored the skill; `check-output` passed for both cases. Must be repeated in a fresh session and in a second tool. |
| 2026-10-20 | Claude Code CLI (fresh session, launched by `qa`, non-interactive, no write permission) | default | failure-analysis + project-context | Partial pass | Identified project; listed the 4 mandatory fields and did not analyze without them; used the chat-only fallback when writes were denied; conversation in pt-BR with deliverable defaulting to English; refused to reuse an earlier pre-analysis whose run had no recorded inputs (correct traceability behavior). Full checklist not run. |
| | Codex | | | not run | |
| | Cursor | | | not run | Check whether skills appear twice |
| | claude.ai | | | not run | |
| | ChatGPT | | | not run | |
| | Gemini | | | not run | |
