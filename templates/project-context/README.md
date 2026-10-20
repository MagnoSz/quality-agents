# Project context folder

This folder holds everything Quality Agents knows about **one** system under test. It lives under `workspace/projects/<project-id>/`, which the framework repository never versions.

| Path | Contents | Who writes it |
|---|---|---|
| `project.json` | Identity, repositories, environments, tools, constraints | `project-context` skill, after confirmation |
| `context/` | **Confirmed** knowledge only: glossary, rules, modules, flows... `context/index.md` lists every file | `project-context` skill, after confirmation |
| `proposed-updates.md` | Knowledge discovered during activities and waiting for confirmation | Any skill |
| `activity-log.md` | One line per run | Orchestrator / `npm run new-run` |
| `inbox/` | Files you hand to the agents for this project | You |
| `runs/<run-id>/` | State, outputs, evidence and logs of each execution | Skills |
| `temporary/` | Scratch files | Skills |

## Versioning this context privately (optional)

The context is plain Markdown and JSON, so any AI tool can read it. To share it with your team, version **this folder** in a separate private repository:

```bash
cd workspace/projects/<project-id>
git init
git remote add origin <your-private-repository-url>
```

The `.gitignore` in this folder keeps `runs/`, `inbox/` and `temporary/` out of that repository. Never add project context to the public Quality Agents repository, and never store credentials here.
