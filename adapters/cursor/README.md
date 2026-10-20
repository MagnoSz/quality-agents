# Cursor

## Setup

1. Clone the repository and open its folder in Cursor (File → Open Folder).
2. Optional: `npm run setup` in the integrated terminal.

What loads automatically:
- `AGENTS.md` (Cursor supports it at the root and in subfolders).
- Skills from `.agents/skills/` — Cursor also scans `.claude/skills/` for compatibility.

No `.cursor/rules` file is needed: `AGENTS.md` already carries the global rules.

## Working with a target system's repository

Use a multi-root workspace (File → Add Folder to Workspace) with this repository plus the target repository. Results still go to `workspace/projects/<project-id>/` in this repository.

## Running

- Agent chat: "Review the user story in workspace/projects/acme-library/inbox/us-101.md".
- Skills can also be referenced by name in the chat.

## Known limitation to verify

Because the same skills exist in `.agents/skills/` and `.claude/skills/`, Cursor may list each skill twice. They are identical. Record what you observe in [docs/compatibility-tests.md](../../docs/compatibility-tests.md). If duplicates are a problem, disable the duplicates in Cursor's skills settings.
