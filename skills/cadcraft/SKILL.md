---
name: cadcraft
description: Reference for CADCraft (Computer-aided design and drafting), a tool of the Craft App Suite that ArtCraft Launcher installs (github.com/storytold/craft-launcher), with its source at github.com/storytold/cadcraft - what it is, formats, build, CLI, MCP, checks and logs, verified against the repositories before answering. Use when a request is about CADCraft (computer-aided design and drafting, a clean-room AutoCAD-style app) or CAD, drafting, DXF or DWG drawings, object snaps, layers, dimensions, hatches, blocks, including QA work on it. Not for the other Craft apps.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  category: artcraft
---

# CADCraft

## Purpose

Give whoever works on CADCraft (questions, requirements review, test design, failure analysis) an accurate starting point on the product and its repository, checked against the source instead of recalled.

## Responsibilities

- Identify CADCraft as the system a request is about and link it to its repository.
- Give the project facts below as orientation and confirm them in the repository before relying on them.
- Hand QA activities to the QA skills with CADCraft as the project.
- Does **not** change the CADCraft repository, decide which Craft app a vague request means (that is the `artcraft-router` agent), or replace reading its code and docs.

## When to use

- The request names CADCraft or its repository, or is about CAD, drafting, DXF or DWG drawings, object snaps, layers, dimensions, hatches, blocks.
- A QA activity on CADCraft needs product knowledge: load this skill, then the QA skill.

Not for the other Craft apps: each has its own skill. Not for the launcher itself (installing, updating, opening apps): that is the `artcraft-router` agent.

## Project facts

From the launcher catalog and the CADCraft README on 2026-10-27. They drift: the repositories win.

- **In the suite:** ArtCraft Launcher lists CADCraft as "Computer-aided design and drafting" (`crates/core/src/catalog.rs` in https://github.com/storytold/craft-launcher) and installs and updates it from https://github.com/storytold/cadcraft/releases; bundle id `ai.storyteller.cadcraft`; page https://getartcraft.com/apps/cadcraft.
- **Repository:** https://github.com/storytold/cadcraft (branch `main`, Apache-2.0, Rust)
- **What:** computer-aided design and drafting: command line, object snaps, layers, dimensions, hatches, blocks and DXF drawings; desktop and browser (WebAssembly).
- **Formats:** DXF drawings; DWG input; export to SVG and PNG (`cadcraft-cli convert`).
- **Run:** `cargo run --release -p cadcraft -- --sample`; web: `cd apps/cadcraft-web && trunk serve`.
- **CLI:** `cadcraft-cli` (`run`, `info`, `convert`, `mcp`).
- **MCP:** `cadcraft-cli mcp` (headless) or `cadcraft-cli mcp --connect 127.0.0.1:7979` to an app started with `--control 7979`.
- **Checks:** `cargo xtask ci`.
- **Logs:** `logs/cadcraft.log` in the settings directory (Linux `~/.config/cadcraft/logs/`; override with `CADCRAFT_CONFIG_DIR`).
- **Contributor and agent rules:** `AGENTS.md` at the repository root; details in `docs/`.

## Inputs

- **Required:** the request about CADCraft.
- **Optional:** the path of a local clone, a version or commit, a log, a story or a test to analyze.

## Tools

- Read files from a local clone, or fetch them from `https://raw.githubusercontent.com/storytold/cadcraft/main/<path>`.
- Shell, optional, read-only in a clone: `git log`, `git show`, `<cli> --help`.
- Without file or web access: answer from the project facts, labeled unverified, and ask for the files the answer needs.

## Procedure

1. **`scope`** — Confirm the request is about CADCraft. Another Craft app, or several: use each app's skill (the `artcraft-router` agent decides).
2. **`load`** — Start from the project facts.
3. **`verify`** — Before stating commands, features, formats or counts, read the CADCraft repository's `README.md`, `AGENTS.md` and the `docs/` page the topic needs; for suite facts (name, tagline, releases, installation) read the launcher's catalog and README. When they disagree with the facts, the repositories win: say which fact is stale.
4. **`answer`** — In the user's language: the direct answer, then the source (link or path). For a QA activity, continue with `project-context` using the project id `cadcraft` (created if missing) and the QA skill; offer verified facts as context proposals, never as confirmed context without the user's OK.

## Rules and constraints

- Source over memory: every claim about CADCraft is checked in its repository or labeled unverified.
- Never change the CADCraft repository, nor open issues or pull requests on it, from this skill.
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

The request is answered with verified sources, or handed to a QA skill with CADCraft identified as the project.

## Persistence

None. This skill writes nothing; QA skills that follow persist under `workspace/projects/<project-id>/`.
