# Adapters

The skills are written once (`skills/` + `core/`). Adapters only explain how each tool finds them; no instruction is rewritten per tool.

| Tool | Reads instructions from | Reads skills from | What you do | Guide |
|---|---|---|---|---|
| Claude Code | `CLAUDE.md` → imports `AGENTS.md` | `.claude/skills/` (generated) | Open the repository folder | [claude-code.md](claude-code.md) |
| OpenAI Codex (CLI/IDE) | `AGENTS.md` | `.agents/skills/` (generated) | Open the repository folder | [codex.md](codex.md) |
| Cursor | `AGENTS.md` | `.agents/skills/` (also `.claude/skills/`) | Open the repository folder | [cursor/README.md](cursor/README.md) |
| claude.ai (browser/desktop) | Project instructions | Uploaded skill ZIPs | `npm run bundle`, upload zips | [chat/README.md](chat/README.md) |
| ChatGPT | Project instructions / custom GPT | Skills (Business/Enterprise/Edu plans) or uploaded Markdown | `npm run bundle`, upload | [chat/README.md](chat/README.md) |
| Gemini and other chat tools | Gem / system instructions | Uploaded Markdown | `npm run bundle`, upload | [chat/README.md](chat/README.md) |
| Any other agent tool | its own instructions file | its own skills folder, if any | point it at `AGENTS.md` | [generic/README.md](generic/README.md) |

Why two generated folders: Claude Code discovers project skills only in `.claude/skills/`, Codex only in `.agents/skills/`. `npm run build` copies the canonical skills to both and `npm run check` fails if they drift. Details and sources: [docs/compatibility.md](../docs/compatibility.md).
