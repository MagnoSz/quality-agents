# Example: evidence-sheet

Prerequisite: the approved `evidence.json` of [examples/evidence-collection](../evidence-collection/README.md), case 2.

## Case 1 — default layout

Request: "Generate the evidence spreadsheet."

- [ ] Says no model was attached or registered and uses the default layout.
- [ ] `Test Evidence.xlsx` (or `Evidências de Teste.xlsx` for pt-BR) with one sheet and two rows: TC-1001 Passed, TC-1002 Failed; steps as numbered lines; the Jam link in full.

## Case 2 — your own model

Create a model in Excel or LibreOffice: a title in row 1 (with a fill color), headers in row 3 `Caso | Descrição | Resultado | Situação | Vídeo | Aprovador`, one example row in row 4 and a dropdown `OK,NOK` in `Situação`. Attach it to the request.

- [ ] Runs `npm run xlsx -- inspect`, finds header row 3 and shows the mapping table; `Aprovador` has no source and stays empty; status mapping Passed→OK, Failed→NOK. Stops for approval.
- [ ] After approval, the xlsx keeps the title, colors and dropdown; rows 4–5 hold TC-1001 and TC-1002; the example row is gone.
- [ ] Offers to register the model and `mapping.json` as the project standard (proposal through `project-context`).
