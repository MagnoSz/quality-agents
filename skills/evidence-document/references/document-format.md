# Document format

## document.json

```json
{
  "fields": { "project": "Acme Library", "workItem": "Azure DevOps 142", "executedAt": "2026-10-24 14:30" },
  "blocks": [
    { "type": "heading", "level": 0, "text": "Test Evidence — Azure DevOps 142" },
    { "type": "table", "labels": true, "rows": [["Work item", "142 — Renew a loan https://dev.azure.com/acme/library/_workitems/edit/142"], ["Environment", "QA"]] },
    { "type": "heading", "level": 1, "text": "TC-1001 — Renew a loan before the due date" },
    { "type": "table", "header": true, "rows": [["Step", "Action", "Expected", "Actual"], ["1", "Open My loans", "Active loans are listed", "Active loans are listed"]] },
    { "type": "image", "path": "../../20261024-1430-evidence-collection-lib-142/evidence/TC-1001-01.png", "caption": "Figure 1 — TC-1001, step 1: Open My loans" },
    { "type": "paragraph", "text": "Recording: https://jam.dev/c/00000000-0000-0000-0000-000000000000" },
    { "type": "pageBreak" }
  ]
}
```

| Block | Fields |
|---|---|
| `heading` | `level` 0 (document title), 1–3; `text` |
| `paragraph` | `text` (line breaks with `\n`), `bold` |
| `table` | `rows` (list of rows of strings); `header: true` styles the first row; `labels: true` styles the first column (key/value tables) |
| `image` | `path` relative to `document.json`; `caption`; `width` in cm (default: page text width, never larger than the image) |
| `pageBreak` | — |

- `fields` fill `{{name}}` placeholders of the model (body, header and footer). `{{content}}` alone in a paragraph is where the blocks go; without it, blocks go at the end of a model with placeholders.
- A model without placeholders is an example: its body is replaced by the blocks; header, footer, styles and page setup stay.
- Headings, title and captions use the model's own styles (found by their Word names, so they work in any Word language).
- Any URL in a text becomes a clickable link.

## Default structure

Used when there is no model. Labels in the deliverable language.

1. **Title** (level 0): `Test Evidence — <source system> <source id>`.
2. **Identification** (key/value table): project, source (id, title, link), environment, version/build, executed by, execution date/time.
3. **Summary** (heading 1 + table with header): test case, title, status — one row per case; then the total by status.
4. **One section per test case** (heading 1 `<id> — <title>`), each starting on a new page:
   - key/value table: source, preconditions, expected result, actual result, status, recordings (links), defects;
   - heading 2 `Steps`: table Step | Action | Expected | Actual;
   - heading 2 `Evidence`: for each step with images, its images in order with captions; then Jam screenshots of the case;
   - console/network errors from the recordings, if any (paragraph list);
   - notes and divergences of the case.
5. **Pending items** (heading 1), only if there are any.

pt-BR labels: Evidências de Teste, Identificação, Resumo, Passos, Evidências, Pendências; table labels Projeto, Origem, Ambiente, Versão/build, Executado por, Data/hora de execução, Pré-condições, Resultado esperado, Resultado obtido, Status, Gravações, Defeitos, Passo, Ação, Esperado, Obtido.
