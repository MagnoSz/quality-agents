---
name: evidence-sheet
description: Produces the test evidence spreadsheet (xlsx), one row per test case, from the approved evidence of an evidence-collection run - filling the user's own xlsx model with its formatting kept, following a column standard defined for the project, or using the framework default. Maps the model's columns to the evidence fields, asks for approval when the model is new, and offers to register it as the project standard. Use when the QA wants the evidence spreadsheet of an executed test.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  category: quality
  phase: "2"
---

# Evidence Sheet

## Purpose

Deliver the evidence of an executed test as a spreadsheet the team already recognizes: **one row per test case**, in the project's model, with every value traceable to the approved evidence.

## Responsibilities

- Choose the model: attached now, the project standard or the framework default.
- Map the model's columns to the evidence fields; leave unmapped columns empty and say so.
- Produce the xlsx keeping the model's formatting (logo, colors, merged cells, other sheets).
- Check the file produced.
- Offer to register a new model as the project standard.

Out of scope: collecting or changing evidence (`evidence-collection`), the Word document (`evidence-document`), embedding images in the spreadsheet (the sheet carries links and file names).

## When to use

- After an approved `evidence-collection` run, when the QA wants the spreadsheet.
- Step `sheet` of the `test-evidence` workflow.

Do not use without approved evidence: run `evidence-collection` first.

## Inputs

Required:
- Project id.
- `evidence.json` approved in an `evidence-collection` run of the same project (the run id, or the latest completed one after confirming with the QA).

Optional:
- Model: an `.xlsx` attached now (inbox or the collection run's inputs folder), or a column standard written by the QA (list of columns, order, status vocabulary).
- Deliverable language (default: project's `deliverableLanguage`, else English).

## Tools

- File read/write.
- Shell, from the framework root:
  - Read a model: `npm run xlsx -- inspect <model.xlsx>`.
  - Fill a model: `npm run xlsx -- fill --template <model.xlsx> --data <rows.json> --out <file.xlsx> [--sheet <name>]` — `rows.json` is a list of objects keyed by the model's header texts.
  - Layout (project standard or default): `npm run xlsx -- write --layout <layout.json> --data <data.json> --lang <pt-BR|en> --out <file.xlsx>`; default layout: [evidence-sheet.layout.json](assets/evidence-sheet.layout.json).
- Fallback without shell: deliver the rows as a Markdown table plus `rows.json` and say the xlsx was not produced.

## Procedure

1. **Model** (`model`). Resolve in this order and tell the QA which one is used:
   1. A model attached to this request or present in the collection run's `inputs/models/`.
   2. The project standard listed under "Deliverable templates" in `context/conventions.md` (an `.xlsx` plus its mapping, or a layout, under the project's `templates/` folder).
   3. The default layout.
   A standard written by the QA in the conversation becomes a layout (same format as the default) saved in the run's outputs folder.
2. **Mapping** (`mapping`). For an `.xlsx` model, run `inspect`, find the header row and map each column to an evidence field ([mapping](references/mapping.md)), including the status vocabulary. Columns without a source stay empty and become pending items; never fill them by assumption.
3. **Mapping gate**. If the model or its mapping is new or changed, show the mapping table and wait for approval (`awaiting-approval`). A project standard already approved skips this gate.
4. **Build** (`build`). Write `rows.json` (or `data.json` for a layout) in the run's outputs folder, one row per test case, then produce the xlsx. File name: the model's name with the source id (for example `Evidence LIB-142.xlsx`), or the layout's `fileName`.
5. **Verify** (`verify`). `inspect` the result: one row per test case, ids and statuses equal to `evidence.json`, no row left from the model's examples. Report the script's warnings.
6. **Standard** (`promote`). If the model is new, offer to register it as the project standard: copy it (and `mapping.json`) to the project's `templates/` folder and add the entry to `context/conventions.md` through `project-context` (proposal, then confirmation).

## Rules and constraints

- Every cell comes from `evidence.json` or is empty. No value is invented, summarized into a different meaning or "improved".
- Statuses use the model's vocabulary through the approved mapping; a status without a mapping is a pending item.
- Keep the model file untouched; write a new file.
- Steps go into one cell as numbered lines (`1. ... ⏎ 2. ...`); expected and actual results by step only if the model has such columns.
- Links (Jam, work item) are written in full; evidence files by name, separated by line breaks.
- Apply [execution principles](references/core/execution-principles.md), [isolation](references/core/isolation-policy.md), [approval](references/core/approval-policy.md), [traceability](references/core/traceability.md).

## Validation criteria

- Rows in the xlsx = test cases in `evidence.json`, same ids, same order.
- Status values belong to the model's (or layout's) vocabulary.
- Every model column is mapped or reported as unmapped.
- No warnings from the script left unexplained to the QA.

## Output format

In `workspace/projects/<project-id>/runs/<run-id>/outputs/`: the xlsx, `rows.json` (or `data.json`) and, for a new model, `mapping.json`. To the user: model used, mapping (at the gate), file path, pending items.

## Human approval points

- Mapping of a new or changed model (step 3).
- Registering the model as the project standard (step 6, through `project-context`).

## Error handling

- No approved evidence: stop and offer `evidence-collection`.
- Model header not found (`no row of the model matches`): ask which row holds the headers or which sheet to use (`--sheet`).
- Model with formulas, Excel tables or protected sheets in the data area: report the script's warnings; if the result is unusable, offer the layout route with the model's columns.
- `.xls` or `.ods` model: ask for it saved as `.xlsx`.

## Completion criteria

Spreadsheet produced and verified, mapping approved when required, pending items listed, standard offered for a new model, `state.json` `completed`.

## Persistence

Follow the [persistence protocol](references/core/persistence-protocol.md). In `workspace/projects/<project-id>/runs/<run-id>/`: `state.json` (steps `model`, `mapping`, `build`, `verify`, `promote`; the mapping approval; the collection run id in `inputs`), the files of the output format in its outputs folder.
