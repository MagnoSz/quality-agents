---
name: deckcraft
description: Reference for DeckCraft (Presentations and slide shows), a tool of the Craft App Suite that ArtCraft Launcher installs (github.com/storytold/craft-launcher), with its source at github.com/storytold/deckcraft - what it is, formats, build, CLI, MCP, checks and logs, verified against the repositories before answering. Use when a request is about DeckCraft (presentations and slide shows, a clean-room reimplementation of Microsoft PowerPoint) or presentations, slides, decks, .pptx files, themes, transitions, animations, slide shows, including QA work on it. Not for the other Craft apps.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  category: artcraft
---

# DeckCraft

## Purpose

Give whoever works on DeckCraft (questions, requirements review, test design, failure analysis) an accurate starting point on the product and its repository, checked against the source instead of recalled.

## Responsibilities

- Identify DeckCraft as the system a request is about and link it to its repository.
- Give the project facts below as orientation and confirm them in the repository before relying on them.
- Hand QA activities to the QA skills with DeckCraft as the project.
- Does **not** change the DeckCraft repository, decide which Craft app a vague request means (that is the `artcraft-router` agent), or replace reading its code and docs.

## When to use

- The request names DeckCraft or its repository, or is about presentations, slides, decks, .pptx files, themes, transitions, animations, slide shows.
- A QA activity on DeckCraft needs product knowledge: load this skill, then the QA skill.

Not for the other Craft apps: each has its own skill. Not for the launcher itself (installing, updating, opening apps): that is the `artcraft-router` agent.

## Project facts

From the launcher catalog and the DeckCraft README on 2026-10-27. They drift: the repositories win.

- **In the suite:** ArtCraft Launcher lists DeckCraft as "Presentations and slide shows" (`crates/core/src/catalog.rs` in https://github.com/storytold/craft-launcher) and installs and updates it from https://github.com/storytold/deckcraft/releases; bundle id `ai.storyteller.deckcraft`; page https://getartcraft.com/apps/deckcraft.
- **Repository:** https://github.com/storytold/deckcraft (branch `main`, Apache-2.0, Rust)
- **What:** presentations: themes, layouts, shapes, pictures, tables, charts, transitions and animations; full-screen slide shows; desktop and browser.
- **Formats:** opens and saves `.pptx`; native `.deckcraft`; PDF export through the shared `craft-pdf` writer.
- **Run:** `cargo run --release -p deckcraft-cli -- render --sample --all --scale 1 out/` (renders the sample deck). Linux builds need the ALSA headers.
- **CLI:** `deckcraft-cli` (`commands`, `run`, `render`, `mcp`).
- **MCP:** `deckcraft-cli mcp` (headless) or `deckcraft-cli mcp --connect 7990` to an app started with `deckcraft --control 7990`; `--automation-read-root` / `--automation-write-root` confine file access.
- **Logs:** `logs/deckcraft.log` in the settings directory (Linux `~/.config/deckcraft/logs/`).
- **Contributor and agent rules:** `AGENTS.md` at the repository root; details in `docs/`.

## Inputs

- **Required:** the request about DeckCraft.
- **Optional:** the path of a local clone, a version or commit, a log, a story or a test to analyze.

## Tools

- Read files from a local clone, or fetch them from `https://raw.githubusercontent.com/storytold/deckcraft/main/<path>`.
- Shell, optional, read-only in a clone: `git log`, `git show`, `<cli> --help`.
- Without file or web access: answer from the project facts, labeled unverified, and ask for the files the answer needs.

## Procedure

1. **`scope`** — Confirm the request is about DeckCraft. Another Craft app, or several: use each app's skill (the `artcraft-router` agent decides).
2. **`load`** — Start from the project facts.
3. **`verify`** — Before stating commands, features, formats or counts, read the DeckCraft repository's `README.md`, `AGENTS.md` and the `docs/` page the topic needs; for suite facts (name, tagline, releases, installation) read the launcher's catalog and README. When they disagree with the facts, the repositories win: say which fact is stale.
4. **`answer`** — In the user's language: the direct answer, then the source (link or path). For a QA activity, continue with `project-context` using the project id `deckcraft` (created if missing) and the QA skill; offer verified facts as context proposals, never as confirmed context without the user's OK.

## Rules and constraints

- Source over memory: every claim about DeckCraft is checked in its repository or labeled unverified.
- Never change the DeckCraft repository, nor open issues or pull requests on it, from this skill.
- Never invent features, formats, commands or behavior; missing information is a pending item ([execution principles](references/core/execution-principles.md)).
- Project data stays in its project folder ([isolation](references/core/isolation-policy.md)).

## Validation criteria

- The answer names the repository and, when relevant, the file it was checked in.
- Verified and unverified statements are distinguishable.
- Stale project facts are reported.

## Output format

An answer in the conversation: direct answer, source, open points. When a QA skill takes over, its own output format applies inside `workspace/projects/<project-id>/`.

## Human approval points

None in this skill; the QA skills that follow keep their own gates.

## Error handling

- Repository or file unreachable: answer from the project facts, labeled unverified, and say what could not be read.
- Request spans several Craft apps: answer per app, each from its own skill.
- Same fetch failing 3 times: stop and report what was tried.

## Completion criteria

The request is answered with verified sources, or handed to a QA skill with DeckCraft identified as the project.

## Persistence

None. This skill writes nothing; QA skills that follow persist under `workspace/projects/<project-id>/`.
