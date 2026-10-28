---
name: moki-architecture
description: Reference knowledge of the Moki framework itself (this repository) - its layers and how they connect, the framework's business rules (skills, agents, statuses, projects, runs, workspaces, tags, approvals, isolation) and the invariants no change may break. Use to answer how any part of Moki works, and before analyzing, proposing or making a change to it. Not for QA activities on a project.
license: MIT
metadata:
  version: "1.0.0"
  status: draft
  category: framework
---

# Moki Architecture

## Purpose

Give whoever analyzes or changes Moki an accurate model of the system: which layer owns each concern, how requests and files flow between layers, which rules are business rules of the framework and which invariants protect its users. Accurate means verified in the source files, not recalled.

## Responsibilities

- Locate the layer that owns a concern and the files and symbols involved.
- Explain how parts connect, citing `path:line` or path plus symbol.
- State the business rules and invariants that apply to an area.
- Does **not** propose or make changes (that is the `moki-change` skill), run QA activities on projects, or replace reading the code: the references are a map, the source is the truth.

## When to use

- Questions such as "how does X work", "where is Y decided", "what depends on Z".
- First step of any analysis, review or change of the framework (`moki-change` loads this skill).

Not for QA work on a project or questions about a system under test: those go through the QA skills.

## Inputs

- **Required:** the question, or the area of the framework (file, feature, command, check, error).
- **Optional:** a check's output (validate, typecheck, tests), a diff or branch.

## Tools

- Read and search files in this repository (required).
- Shell, optional, for read-only commands only: `git log`, `git show`, `git diff`, `git blame`, `npm run validate`, `npm run typecheck`, `npm test`, `node scripts/build.mjs --check`.
- Without file access: ask for the files the answer depends on and label the answer unverified until then.

## Procedure

1. **`locate`** — Classify the area: content (skills, policies, agents, templates, schemas), generated mirrors, build and validation, helper commands, shared libraries, `qa` command, desktop main process, UI, packaging, tests and CI. Use the layer table in [architecture](references/architecture.md).
2. **`load`** — Read only the reference section for that area: [architecture](references/architecture.md) for layers, flows, extension points and technical constraints; [business rules](references/business-rules.md) for the domain model, policies and invariants.
3. **`verify`** — Open the source files the answer depends on and confirm what the reference says. When code and reference disagree, the code wins: say so, and name the stale reference line so `moki-change` can fix it.
4. **`answer`** — In the user's language: the direct answer first, then the location (path and symbol), the flow, the rules and invariants involved, and what remains unverified.

## Rules and constraints

- Source over memory: every claim about behavior is checked in the file, or labeled unverified.
- Never change files while using this skill.
- Framework files are written in English; talk to the user in their language.
- Project data is not framework knowledge: do not read the workspace folders to answer a framework question unless the user asks, and never copy project content into the repository ([isolation](references/core/isolation-policy.md)).
- [Execution principles](references/core/execution-principles.md) apply: nothing invented, hypotheses labeled as hypotheses.

## Validation criteria

- Every path and symbol named exists (checked, not assumed).
- The answer names the owning layer and, when relevant, the business rules and invariants involved.
- Verified facts and inferences are distinguishable.

## Output format

An answer in the conversation: direct answer; location and flow (path and symbol, or `path:line`); rules and invariants involved; open points. No files are written.

## Human approval points

None: this skill only reads and answers.

## Error handling

- Reference contradicts the code: trust the code, report the stale reference.
- Area not covered by the references: read the code directly and its history (`git log -- <path>`), and say the map does not cover it.
- Commands fail with `ERR_UNKNOWN_FILE_EXTENSION` for `.ts`: Node is older than 22.18 (`engines` in `package.json`). It is the environment, not the code.

## Completion criteria

The question is answered with verified locations, or the gap that prevents verification is stated.

## Persistence

None. Framework knowledge lives in this skill's references and in the repository; nothing is written to a project or run folder. Stale references are reported so the `moki-change` skill can update them.
