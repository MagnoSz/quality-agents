# Compatibility

What each tool supports, based on official documentation consulted on 2026-10-20. Tools change often — re-check these sources when something stops working.

## Summary

| | Claude Code | Codex | Cursor | claude.ai | ChatGPT | Gemini |
|---|---|---|---|---|---|---|
| Reads `AGENTS.md` | Via `CLAUDE.md` import (native in recent versions) | Native | Native | No (paste into project instructions) | No (paste) | No (paste) |
| Discovers repo skills | `.claude/skills/` | `.agents/skills/` | `.agents/skills/`, `.claude/skills/` | Uploaded zips | Uploaded skills (Business/Enterprise/Edu) | No — Markdown in Gem knowledge |
| Reads/writes workspace files | Yes | Yes (sandbox rules apply) | Yes | No | No | No |
| Runs `npm` scripts | Yes | Yes (approval/sandbox) | Yes | No (has its own code execution) | No (has its own code tools) | No |
| Resume via `state.json` | Reads it directly | Reads it directly | Reads it directly | User uploads it | User uploads it | User uploads it |

**There is no shared memory between tools.** A run started in one tool continues in another only by reading `state.json` and the project context files.

## Native vs. configuration vs. manual

| Works natively (open the folder) | Needs configuration | Needs manual steps |
|---|---|---|
| Claude Code, Codex, Cursor: instructions, skills, project context, state, scripts | claude.ai / ChatGPT skills upload (`npm run bundle`) | Chat tools: uploading context/state, saving outputs, generating xlsx/PDF locally |

## Sources

- Claude Code — skills: https://code.claude.com/docs/en/skills ; instructions/AGENTS.md: https://code.claude.com/docs/en/memory
- Codex — skills (`.agents/skills`, discovery from CWD to repo root, skills list budget): https://learn.chatgpt.com/docs/build-skills
- Cursor — skills (`.agents/skills`, `.cursor/skills`, compatibility with `.claude/skills`): https://cursor.com/docs/context/skills ; rules and AGENTS.md: https://cursor.com/docs/context/rules
- Agent Skills specification: https://agentskills.io/specification
- claude.ai — Using Skills in Claude: https://support.claude.com/en/articles/12512180-using-skills-in-claude
- ChatGPT — Skills in ChatGPT: https://help.openai.com/en/articles/20001066
- Gemini — Use Gems: https://support.google.com/gemini/answer/15146780

## Known limitations and open points

- Claude Code reads `AGENTS.md` natively only without a `CLAUDE.md`; this repository ships `CLAUDE.md` with `@AGENTS.md` so it loads in every version.
- Cursor may show each skill twice (both mirrors). Unverified — see [compatibility-tests.md](compatibility-tests.md).
- Codex limits the initial skills list (≈2% of the context window); descriptions are kept concise.
- Chat tools: plan-dependent features (skills upload, code execution) — check your plan.
- `npm run pdf` needs a Chromium-based browser (Edge/Chrome/Chromium). Without it, the HTML is produced and must be printed to PDF manually.
