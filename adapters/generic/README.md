# Other AI tools

## Agent tools with file access (IDE agents, CLIs)

1. Open the repository folder as the working directory.
2. If the tool reads `AGENTS.md`, nothing else is needed. If it uses another file name (e.g. `GEMINI.md`, `.github/copilot-instructions.md`), create that file locally with one line pointing to `AGENTS.md` ("Follow the instructions in AGENTS.md"), or copy `AGENTS.md`'s content. Do not commit tool-specific copies unless the team agrees to maintain them.
3. If the tool supports Agent Skills, point it at `.agents/skills/` (or copy that folder to the tool's skills location). Otherwise tell it: "Skills are in skills/<name>/SKILL.md; read the one that applies before acting."
4. Check that it can run `npm` commands; if not, use the manual fallbacks in each skill.

## Tools without file access

Follow [chat/README.md](../chat/README.md) using `dist/chat/*.md`.

## Minimum capabilities a tool needs

| Capability | Needed for | Fallback |
|---|---|---|
| Follow long Markdown instructions | All skills | — (required) |
| Read files | Inputs, context, state | User pastes content |
| Write files | Deliverables, state | User saves outputs |
| Run commands | xlsx/pdf, run creation | Manual steps described in each skill |
| Read images | Screenshots/prototypes | User describes them |

Record what you tested in [docs/compatibility-tests.md](../../docs/compatibility-tests.md).
