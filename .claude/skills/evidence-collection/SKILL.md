---
name: evidence-collection
description: Collects and consolidates the evidence of an executed test, end to end - the test description from Azure DevOps, Jira or similar (via MCP or pasted/attached), the Jam screen recordings (link plus, via the Jam MCP when available, user steps, console and network errors and screenshots) and the QA's prints - into one approved evidence file per run, used by evidence-sheet and evidence-document. Asks only for what is missing and never decides a test status by itself. Use when the QA wants to assemble or prepare test evidence.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  category: quality
  phase: "2"
---

# Evidence Collection

## Purpose

Act as a **senior QA preparing the evidence of an executed test** so it can be audited: what was tested (source item), how it was executed (steps, environment, who, when), what happened (actual result, status) and the proof (Jam recordings, screenshots, prints), all traceable to the source.

## Responsibilities

- Retrieve or receive the description of what was tested (work item, test case, user story or bug).
- Gather each Jam recording: always its link; when the Jam MCP is available, its data (steps, console and network errors, screenshots).
- Gather the prints attached by the QA and associate each one with a test case and step.
- Consolidate everything into `evidence.json`, flagging divergences (for example, a case reported as passed whose recording shows an error).
- Ask only for missing mandatory information; never invent results, statuses, ids or values.
- Get the QA's approval of the consolidated evidence.

Out of scope: producing the spreadsheet (`evidence-sheet`) or the Word document (`evidence-document`); analyzing the cause of a failure (`failure-analysis`); registering defects in a tracker; executing the test.

## When to use

- The QA executed one or more tests and wants to assemble their evidence.
- First step of the `test-evidence` workflow.

Do not use to design tests (`test-design`) or before the test was executed.

## Inputs

**Mandatory** (ask only for what is missing, all at once):
- **Source item**: id and description of what was tested, with steps and expected results — retrieved via MCP (Azure DevOps, Jira or another configured tracker) when the user gives an id, or pasted/attached (text, `.md`, `.docx`, `.pdf`, export).
- **Execution data**: executed by, execution date/time, environment.
- **Per test case**: actual result and status (Passed, Failed, Blocked, Not run), stated or confirmed by the QA.
- **At least one piece of evidence per executed test case**: a Jam link or a print.

Optional:
- Version/build, defects opened, notes.
- Prints (`.png`, `.jpg`) in the project inbox or attached to the request; their file names may indicate test case and step (for example `TC-01_step-2.png`).
- Models for the deliverables (`.xlsx`, `.docx`) attached to the request: copy them to the run's inputs folder; `evidence-sheet` and `evidence-document` use them.
- Project id (context via `project-context`: trackers and MCP servers in `environments-and-tools`, id formats in `conventions`).

## Tools

- File read/write in the project folder. Image reading to describe prints and propose their association (fallback: ask the QA which case and step each print belongs to).
- **Tracker MCP** (Azure DevOps, Jira or similar), read-only, when configured in the project or in the tool: fetch the item by id, including its steps and linked test cases. Fallback: ask the QA to paste or attach the description.
- **Jam MCP**, when configured: read each recording's details, user events (steps), console logs, network requests and screenshots. Fallback: keep the Jam link as the reference and ask the QA for the actual result of each case.
- Details of each source: [sources](references/sources.md).

## Procedure

1. **Sources** (`sources`). Identify the project. Get the source item via MCP or from the user; save it as `inputs/work-item.md` (id, title, URL, description, steps, expected results, linked test cases). Copy attached models to `inputs/models/` and prints to `evidence/`.
2. **Check mandatory information** (`validation`). Compare with [Inputs](#inputs). If anything is missing, reply with the [missing-information message](#missing-information-message), set status `awaiting-input` and stop. If deliverable models are already known (attached or registered in the project's `context/conventions.md`), read their columns and placeholders and include in the request any field they need that no source provides.
3. **Jam recordings** (`jam`). For each link: record it; if the Jam MCP is available, read the recording and save a masked summary as `inputs/jam-<jam-id>.md` and its screenshots in `evidence/` ([sources](references/sources.md#jam)). Associate each recording with its test case.
4. **Prints** (`prints`). Rename each print to `<test-case-id>-<nn>.<ext>` and associate it with a test case and step: by file name, by the QA's statement or, if images can be read, by a proposed association marked `proposed`. Never guess silently.
5. **Consolidate** (`consolidate`). Write `outputs/evidence.json` in the [evidence data format](references/evidence-data.md). Copy expected results from the source without rewording. Actual results and statuses come from the QA; a status deduced from a recording is recorded as `proposed` with its reason. List divergences and pending items.
6. **Review gate** (`review`). Show the [summary](references/evidence-data.md#summary-for-the-gate) and ask the QA to approve or adjust. Stop (`awaiting-approval`).
7. **Close** (`close`). After approval, mark every `proposed` item as confirmed or corrected, save `evidence.json`, set the run `completed` and offer the next steps: spreadsheet (`evidence-sheet`) and Word document (`evidence-document`).

### Missing-information message

Reply exactly, in the user's language, listing only the missing items:

```text
To assemble the evidence, I need:
- [missing item]
```

pt-BR:

```text
Para montar a evidência, preciso de:
- [item faltante]
```

## Rules and constraints

- A test status is the QA's decision. Never mark a case Passed or Failed on your own; a deduction from a recording is `proposed` until the gate.
- Expected results and steps come from the source, quoted, never rewritten or completed by assumption. Missing ones are pending items.
- Use the ids of the source (work item, test case). A case without an id gets a provisional `TMP-` id ([traceability](references/core/traceability.md)).
- If the recording contradicts the reported result (an error in the console or a failed request at the moment of the step, a different screen), report the divergence; do not choose.
- Mask tokens, passwords, cookies, authorization headers and personal data from Jam logs and network data before saving them ([isolation](references/core/isolation-policy.md)). If a print or screenshot shows such data, warn the QA; do not edit images.
- Retrieve data only from the MCP servers of this project's own tools; never send project data to other services ([approval](references/core/approval-policy.md)).
- Apply [execution principles](references/core/execution-principles.md).

## Validation criteria

- Every test case in `evidence.json` has: id (official or `TMP-`), title, source reference, steps and expected results from the source, actual result, status and at least one evidence item (Jam link or file) — or an explicit pending item.
- Every file listed in `evidence.json` exists in the run's evidence folder.
- No status is final without the QA's approval recorded in `state.json`.
- No secret or personal data in the saved Jam summaries.
- Divergences between recordings and reported results are listed.

## Output format

- To the user: the missing-information message, or the gate summary.
- Files in `workspace/projects/<project-id>/runs/<run-id>/`: in its inputs folder `work-item.md`, one `jam-<jam-id>.md` per recording read and the attached models (subfolder `models`); prints and screenshots in its evidence folder; `evidence.json` in its outputs folder ([format](references/evidence-data.md)).

## Human approval points

- **Review** (`review`): the QA approves the consolidated evidence (statuses, associations, divergences) before the deliverables are produced.
- Fetching from a tracker or Jam MCP for the first time in a run: confirm which item or recordings will be read.

## Error handling

- MCP not configured or failing: say so once and ask for the description pasted or attached; keep the Jam links as references. After 3 failures of the same call, stop using it ([execution principles](references/core/execution-principles.md)).
- Jam link private or expired: record it and ask the QA for the actual result or an exported video/screenshots.
- Print that cannot be associated: ask; keep it out of `evidence.json` until answered.
- Source with several test cases but evidence for only some: the others are `Not run` only if the QA confirms; otherwise pending.

## Completion criteria

`evidence.json` approved at the review gate, every pending item listed, `state.json` `completed`, next steps offered.

## Persistence

Follow the [persistence protocol](references/core/persistence-protocol.md). In `workspace/projects/<project-id>/runs/<run-id>/`: `state.json` (steps `sources`, `validation`, `jam`, `prints`, `consolidate`, `review`, `close`; the review approval), source copies and models in its inputs folder, images in its evidence folder, `evidence.json` in its outputs folder.
