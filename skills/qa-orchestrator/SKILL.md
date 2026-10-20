---
name: qa-orchestrator
description: Entry point for QA requests. Identifies whether the user wants one activity or a chain of activities, identifies the project, loads its context through project-context, selects the right skills or workflow, enforces approval gates between steps and records runs so work can be resumed in any AI tool. Use for composite requests (e.g. "review this story and, once approved, map the test scenarios"), for resuming a run, or when it is unclear which QA skill applies.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  phase: "3"
---

# QA Orchestrator

## Purpose

Route each QA request to the right skill or workflow, with the right project context, without skipping approval gates, and leave a resumable record.

## Responsibilities

- Classify the request: single activity, composite workflow, resume, or context management.
- Identify the project and obtain its context via `project-context`.
- Select skills and give each one only the context it needs.
- Execute workflow steps in order, respecting dependencies and gates.
- Record activities, approvals, pending items and results separately (run state vs. project context).
- Propose context updates only from confirmed definitions.

Out of scope: performing the QA activities themselves — each belongs to its skill.

## When to use

- The request involves more than one activity, or a conditional chain ("after approval, ...").
- The user asks to resume or check the status of previous work.
- It is unclear which skill applies.

A request clearly matching one skill may go straight to that skill, which still starts by identifying the project (step 2 below).

## Inputs

Required:
- The user's request.

Optional:
- Project id, documents, run id to resume.

## Tools

- File read/write in `workspace/projects/<project-id>/`.
- Shell (optional): `npm run new-project`, `npm run new-run`, `npm run runs`. Fallback: create folders and `state.json` manually per the [persistence protocol](references/core/persistence-protocol.md).

## Procedure

1. **Classify the request.** Single activity, composite (match a [workflow](#workflows)), resume, or context management. If composite but no workflow matches, build an ad-hoc sequence from the skill catalog, show it to the user and get approval before starting.
2. **Identify the project.** Use `project-context` step 1. Never proceed with an ambiguous project.
3. **Check whether the project context exists.**
4. **New project** → `project-context` creates the structure automatically (after confirming id and name).
5. **New project** → `project-context` runs the progressive interview, prioritized by the requested activity, until that activity's minimum context is confirmed.
6. **New project** → glossary, rules, modules, flows and other knowledge are recorded by `project-context` as they are confirmed.
7. **Existing project** → `project-context` retrieves the registered context.
8. **Select skills and hand over context.** For each step, pass only the context files/sections from the retrieval map plus the gaps list. Check skill status: `planned` or `pending-migration` skills are not executed — tell the user and stop or skip if the step is optional.
9. **Run and record.** Create a run per skill execution (or one run for the whole workflow with per-step entries), update `state.json` at every step and gate, append to `activity-log.md`. Activity results stay in the run folder.
10. **Update context only with confirmed definitions.** At the end of each step, collect definitions that may be general system knowledge, add them as proposals, and ask the user to confirm them via `project-context`.

### Gates

- Stop at every `approval` gate and every skill-internal approval point; ask; record the decision ([approval policy](references/core/approval-policy.md)).
- `input` gates wait for something external (for example, the team returning a filled matrix). Set status `awaiting-input` and tell the user exactly what to provide.
- Never run a dependent step in the same response as the request for approval.

### Interrupting and resuming

- The user can stop at any time. Persist `state.json` with the current step and pending items, and tell the user the run id.
- To resume: identify project and run id (`npm run runs -- <project-id>`), read `state.json`, reload the context for the current step, summarize, continue. See the [persistence protocol](references/core/persistence-protocol.md).

## Workflows

| Workflow | Use when |
|---|---|
| [requirements-to-tests](references/workflows/requirements-to-tests.md) | Review a story and, after approval, design its tests |
| [failure-investigation](references/workflows/failure-investigation.md) | A failure was observed and needs pre-analysis for developers |
| [quality-lifecycle](references/workflows/quality-lifecycle.md) | End-to-end quality cycle for a change (several steps still planned) |

## Rules and constraints

- Apply [execution principles](references/core/execution-principles.md), [isolation](references/core/isolation-policy.md), [approval](references/core/approval-policy.md), [traceability](references/core/traceability.md).
- One project per run; never mix projects.
- Do not execute skills whose status is `planned` or `pending-migration`.
- Do not duplicate a skill's procedure here; delegate to the skill.

## Validation criteria

- Each executed step has a run (or a step entry) with a valid `state.json`.
- Every gate passed has a matching entry in `approvals`.
- No step executed before its `dependsOn` steps are completed.
- No file written outside the active project folder (except authorized target-repository changes).

## Output format

- To the user: a short plan (steps, gates) before starting a workflow, and a status summary at each gate.
- Files: run folders under `workspace/projects/<project-id>/runs/` and lines in `workspace/projects/<project-id>/activity-log.md`.

## Human approval points

- Ad-hoc sequences not covered by a workflow (approve the sequence).
- Every `approval` gate of the workflow.
- Every context promotion (via `project-context`).

## Error handling

- Skill unavailable (planned / pending migration): report; skip only if the step is optional, otherwise stop.
- Missing input for a step: set `awaiting-input`, list exactly what is needed.
- Step failure after the retry limit: set `blocked`, report what was tried.
- Conflicting instructions between user, project context and framework: apply the precedence in execution principles; if still unclear, ask.

## Completion criteria

All non-optional steps are `completed` (or the user cancelled), every gate decision is recorded, the activity log is updated, and confirmed definitions were offered for context promotion.

## Persistence

Run state in `workspace/projects/<project-id>/runs/<run-id>/state.json`; history in `workspace/projects/<project-id>/activity-log.md`; project knowledge only through `project-context`.
