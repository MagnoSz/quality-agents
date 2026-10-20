# Privacy and isolation

The binding rules are in [core/isolation-policy.md](../core/isolation-policy.md) (loaded by every skill). This page explains how they are enforced.

## What this repository versions

Only the framework: skills, core policies, workflows, templates, schemas, adapters, generic docs, synthetic examples, scripts and tests.

## What it never versions

Everything under `workspace/`: project context, received documents, user stories, spreadsheets, PDFs, logs, evidence, screenshots, traces, temporary files, automation results, run history and any customer data. Also `dist/` (generated bundles).

## Layers of protection

| Layer | What it does | Limit |
|---|---|---|
| Folder layout | Every project has its own folder; skills write only there | Relies on the AI following instructions |
| Skill instructions | Isolation policy loaded by every skill; project identified before reading anything | Same |
| `.gitignore` | Ignores `workspace/*` and `dist/` | `git add -f` bypasses it — it is not a security control |
| Pre-commit hook (`npm run setup`) | Blocks commits containing workspace files, documents/images/evidence outside skill assets, `.env` files, known secret formats, and stale skill mirrors | Must be enabled per clone; can be skipped with `--no-verify` |
| CI (`.github/workflows/ci.yml`) | Same checks on every push/PR | Runs after the push — rotate any leaked secret anyway |
| `npm run runs` | Flags runs whose `state.json` names another project or artifacts outside the project | Checks state, not content |

## Project isolation

- One folder per system: `workspace/projects/<project-id>/`.
- An activity reads only its project's folder; cross-project comparison only when the user explicitly asks and names both projects.
- No per-project branches in this repository.

## Optional private context repository

A team may version `workspace/projects/<project-id>/` as its **own private Git repository** (see the README inside each project folder). Its `.gitignore` excludes `runs/`, `inbox/` and `temporary/`, so activity results stay unversioned there too. This repository's Git ignores the whole `workspace/`, so the two never mix.

## Target repositories

When automation is authorized to change a target system's repository, files are created there and that repository's own Git policy applies. This repository's `.gitignore` does not affect other repositories.

## External services

Uploading project documents to a chat AI, a search engine or any API sends them to that provider. Do it only where your organization allows; record the decision in `project.json` (`externalDataSharingAllowed`). Skills ask before sending project data externally.

## Credentials

Never in any file of this repository or of a project folder. Reference them by environment variable name. `.env` files are ignored and blocked by the pre-commit check.
