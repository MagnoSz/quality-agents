# App plugins

Plugins the desktop app loads **only in the sessions it opens** (`desktop/launcher.ts`); the same tool started outside the app is not affected.

| Plugin | Claude Code | Codex | Needs |
|---|---|---|---|
| `ponytail/` | `--plugin-dir` (skills + hooks) | `-c developer_instructions` pointing to `ponytail/skills/ponytail/SKILL.md` | Node.js for the Claude hooks |
| `rtk/` | `--plugin-dir` (PreToolUse hook `rtk hook claude`) | `-c developer_instructions` asking for the `rtk` prefix | the `rtk` CLI on the PATH |

A plugin whose requirement is missing is skipped.

`ponytail/` is a trimmed copy of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 4.10.0 (MIT, see its `LICENSE`): `.claude-plugin/`, `hooks/` (Claude files only) and `skills/`. To update, copy the same files from a newer release.
