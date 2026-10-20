# OpenAI Codex (CLI, IDE extension, app)

## Setup

1. Clone the repository and start Codex in its folder: `cd quality-agents && codex`.
2. Optional: `npm run setup`.

What loads automatically:
- `AGENTS.md` at the repository root (kept below 32 KiB, Codex's default instruction size limit; `npm run validate` enforces it).
- Skills in `.agents/skills/` (Codex scans `.agents/skills` from the working directory up to the repository root).

## Working with a target system's repository

Keep this repository as the working directory. Give Codex access to the target repository (for example with the CLI's additional writable directories option, or by referencing its absolute path) — check `codex --help` for the option in your version.

## Running

- Natural language: "Use the failure-analysis skill on workspace/projects/acme-library/inbox/error-report.txt".
- Explicit mention of a skill name (e.g. `$requirements-review` in recent versions) also works; see the Codex skills documentation.

## Limitations

- Sandbox settings may block writing outside the repository or running the browser used by `npm run pdf`. Approve the command or use the fallback (deliver Markdown, export to PDF manually).
- Codex limits the size of the initial skills list; descriptions are kept short for that reason.
