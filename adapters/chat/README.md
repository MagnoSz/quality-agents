# Browser / chat tools (claude.ai, ChatGPT, Gemini, others)

Chat tools cannot read this repository, run scripts or keep files between conversations by themselves. You give them the instructions and files, and you save what they produce.

## 1. Build the bundles (once per framework version)

On a computer with Node.js ≥ 20, in the repository folder:

```bash
npm run bundle
```

This creates (ignored by Git):

| File | Use |
|---|---|
| `dist/claude-ai/<skill>.zip` | Skill packages for claude.ai (and other tools that accept Agent Skills zips) |
| `dist/chat/<skill>.md` | One self-contained Markdown file per skill (skill + its references + core policies) |
| `dist/chat/quality-agents-all.md` | `AGENTS.md` + every usable skill in one file |

## 2. Configure the tool

### claude.ai (Pro, Max, Team, Enterprise)

1. Enable code execution / file creation in settings.
2. In the Skills section of settings, upload each `dist/claude-ai/<skill>.zip` (at least `qa-orchestrator`, `project-context` and the skills you use).
3. Optional: create a Project and paste `AGENTS.md` into the project instructions.

Menu names change between versions; see Anthropic's help article "Using Skills in Claude".

### ChatGPT

- Plans with **Skills** (Business, Enterprise, Edu — may require admin enablement): upload the skill zips from `dist/claude-ai/` (ChatGPT skills follow the same Agent Skills standard). Check OpenAI's help article "Skills in ChatGPT" for your plan.
- Other plans: create a **Project** (or custom GPT), paste `AGENTS.md` into its instructions and upload `dist/chat/quality-agents-all.md` (or only the skill files you need) as project files.

### Gemini

Create a **Gem**: paste `AGENTS.md` into the instructions, add `dist/chat/<skill>.md` files under Knowledge. Gems limit the number of files; upload only the skills you need.

### Any other chat tool

Paste `dist/chat/<skill>.md` at the start of the conversation (or upload it), then make your request.

## 3. Work

1. Upload the project context files the activity needs: `project.json`, `context/index.md` and the files listed for that activity in the project-context retrieval map. For a new project, the agent interviews you and outputs the files for you to save.
2. Upload the inputs (user story, log...).
3. The agent outputs deliverables and, at each gate, the `state.json` content. **Save them** into `workspace/projects/<project-id>/runs/<run-id>/` on your computer.
4. To resume in a new conversation: upload `state.json` plus the context files and say "resume this run".

## Limitations

| Capability | claude.ai | ChatGPT | Gemini |
|---|---|---|---|
| Read the repository / workspace | No — upload files | No — upload files | No — upload files |
| Persist state between conversations | No — save/upload `state.json` | No — save/upload `state.json` | No — save/upload `state.json` |
| Create xlsx | With code execution | With code/data analysis tools | Limited — use the JSON + `npm run xlsx` locally |
| Create PDF | With code execution | With code tools | Limited — save Markdown and run `npm run pdf` locally |
| Read screenshots | Yes | Yes | Yes |

Data policy: uploading project documents to a chat tool sends them to that provider. Do it only if your organization allows it for that project (`externalDataSharingAllowed` in `project.json` documents the decision).
