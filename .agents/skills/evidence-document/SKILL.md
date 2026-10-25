---
name: evidence-document
description: Produces the test evidence document (docx) with the prints and Jam screenshots embedded step by step, from the approved evidence of an evidence-collection run - inside the user's own Word model (styles, header, footer and logo kept, {{placeholders}} filled), following a structure defined for the project, or in the framework default structure. Asks for approval of the outline when the model is new and offers to register it as the project standard. Use when the QA wants the evidence document of an executed test.
license: MIT
metadata:
  version: "0.1.0"
  status: draft
  category: quality
  phase: "2"
---

# Evidence Document

## Purpose

Deliver the evidence of an executed test as a Word document that proves each step: what was expected, what happened and the image that shows it, in the project's model and traceable to the approved evidence.

## Responsibilities

- Choose the model: attached now, the project standard or the framework default.
- Plan the outline: sections, fields, placeholders and where each image goes.
- Produce the docx with the images embedded and captioned, links clickable.
- Check the file produced.
- Offer to register a new model as the project standard.

Out of scope: collecting or changing evidence (`evidence-collection`), the spreadsheet (`evidence-sheet`), editing or masking images.

## When to use

- After an approved `evidence-collection` run, when the QA wants the evidence document.
- Step `document` of the `test-evidence` workflow.

Do not use without approved evidence: run `evidence-collection` first.

## Inputs

Required:
- Project id.
- `evidence.json` approved in an `evidence-collection` run of the same project, and the images it lists.

Optional:
- Model: a `.docx` attached now (inbox or the collection run's inputs folder), or a structure written by the QA (sections and fields in order).
- Deliverable language (default: project's `deliverableLanguage`, else English).

## Tools

- File read/write. Image reading helps write captions (fallback: captions from the step text).
- Shell, from the framework root:
  - Read a model: `npm run docx -- inspect <model.docx>` (placeholders, styles, header/footer, body outline).
  - Produce: `npm run docx -- write --data <document.json> --out <file.docx> [--template <model.docx>]`. Format of `document.json`: [document format](references/document-format.md).
- Fallback without shell: produce `evidence.md` with the same structure and image links, and say the docx was not produced.

## Procedure

1. **Model** (`model`). Resolve in this order and tell the QA which one is used:
   1. A model attached to this request or present in the collection run's `inputs/models/`.
   2. The project standard listed under "Deliverable templates" in `context/conventions.md` (a `.docx` under the project's `templates/` folder, or a written structure).
   3. The [default structure](references/document-format.md#default-structure).
2. **Outline** (`outline`). `inspect` the model. With placeholders (`{{name}}`): map each one to an evidence field; `{{content}}` marks where the test cases go. Without placeholders, the model is an example: reproduce its sections, tables and order with the evidence (its header, footer, styles and page setup are kept automatically; its body is replaced). Placeholders or sections without a source stay empty and become pending items.
3. **Outline gate**. If the model or its structure is new or changed, show the outline and wait for approval (`awaiting-approval`). An approved project standard skips this gate.
4. **Build** (`build`). Write `document.json` in the run's outputs folder; image paths point to the collection run's evidence folder. Produce the docx. File name: the model's name with the source id (for example `Evidence LIB-142.docx`), or `Test Evidence <source id>.docx` (pt-BR: `Evidências de Teste <id>.docx`).
5. **Verify** (`verify`). `inspect` the result: one section per test case, images = files listed in `evidence.json`, no `{{placeholder}}` left, no script warning unexplained.
6. **Standard** (`promote`). If the model is new, offer to register it as the project standard: copy it to the project's `templates/` folder and add the entry to `context/conventions.md` through `project-context` (proposal, then confirmation).

## Rules and constraints

- Every text comes from `evidence.json`; expected results and messages quoted as in the source. Nothing invented or embellished.
- Every image listed in `evidence.json` appears once, under its test case and step, with a caption: `Figure <n> — <test case id>, step <n>: <action>` (pt-BR: `Figura <n> — <id do caso>, passo <n>: <ação>`).
- Statuses with the project's vocabulary (the same used in the spreadsheet when one exists).
- Divergences and pending items of the evidence appear in the document, not hidden.
- Keep the model file untouched; write a new file.
- Apply [execution principles](references/core/execution-principles.md), [isolation](references/core/isolation-policy.md), [approval](references/core/approval-policy.md), [traceability](references/core/traceability.md).

## Validation criteria

- One section per test case of `evidence.json`, same ids and order.
- Number of images in the docx = number of distinct files listed in `evidence.json`.
- No unfilled placeholder; every unmapped placeholder reported.
- Jam and work item links present and clickable.

## Output format

In `workspace/projects/<project-id>/runs/<run-id>/outputs/`: the docx and `document.json`. To the user: model used, outline (at the gate), file path, pending items.

## Human approval points

- Outline of a new or changed model (step 3).
- Registering the model as the project standard (step 6, through `project-context`).

## Error handling

- No approved evidence: stop and offer `evidence-collection`.
- Image missing or not PNG/JPEG: report it, leave a paragraph `[image missing: <file>]` in its place and list it as pending.
- `.doc` or `.odt` model: ask for it saved as `.docx`.
- Placeholders inside text boxes are not filled: tell the QA and suggest moving them to normal paragraphs or the header/footer.

## Completion criteria

Document produced and verified, outline approved when required, pending items listed, standard offered for a new model, `state.json` `completed`.

## Persistence

Follow the [persistence protocol](references/core/persistence-protocol.md). In `workspace/projects/<project-id>/runs/<run-id>/`: `state.json` (steps `model`, `outline`, `build`, `verify`, `promote`; the outline approval; the collection run id in `inputs`), the files of the output format in its outputs folder.
