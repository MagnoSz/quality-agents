# App plugins

Plugins the desktop app loads **only in the sessions it opens** (`desktop/launcher.ts`); the same tool started outside the app is not affected.

| Plugin | Claude Code | Codex | Needs |
|---|---|---|---|
| `ponytail/` | `--plugin-dir` (skills + hooks) | `-c developer_instructions` pointing to `ponytail/skills/ponytail/SKILL.md` | Node.js for the Claude hooks |
| `rtk/` | `--plugin-dir` (PreToolUse hook `rtk hook claude`) | `-c developer_instructions` asking for the `rtk` prefix | the `rtk` CLI on the PATH |
| `caveman/` | `--plugin-dir` (skills + hooks) | `-c developer_instructions` pointing to `caveman/skills/caveman/SKILL.md` | Node.js for the Claude hooks; **only in projects that turn it on** (Settings → Skills → Plugins, saved as `"plugins": ["caveman"]` in `project.json`) |

A plugin whose requirement is missing is skipped. ponytail and rtk are always on; caveman is per project (`PROJECT_PLUGINS` in `scripts/lib/core.ts`).

`package.json` here sets `"type": "commonjs"`: the plugins' hooks use `require()`, and the framework's own `package.json` is an ES module.

`ponytail/` is a trimmed copy of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) 4.10.0 (MIT, see its `LICENSE`): `.claude-plugin/`, `hooks/` (Claude files only) and `skills/`. To update, copy the same files from a newer release.

`caveman/` is a trimmed copy of [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) 4.0.1 (Apache-2.0, see its `LICENSE` and `NOTICE`): `.claude-plugin/plugin.json` (hook commands pointed at `hooks/`), `src/hooks/` → `hooks/` (activate, config, mode-tracker, parse, stats, statusline) and the skills `caveman`, `ultracave`, `megacave`, `caveman-commit`, `caveman-review`, `caveman-help`, `caveman-stats`. Left out: the engine, proxy, cavecrew agents and `caveman-compress` (needs Python). To update, copy the same files from a newer release.
