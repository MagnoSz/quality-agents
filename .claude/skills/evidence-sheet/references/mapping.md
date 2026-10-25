# Mapping a model's columns

## Evidence fields

| Field | From `evidence.json` | Cell text |
|---|---|---|
| `testCaseId` | `testCases[].id` | as is |
| `title` | `testCases[].title` | as is |
| `source` | `source.system` + `source.id` (+ `source.title`) | `Azure DevOps 142 — Renew a loan` |
| `sourceUrl` | `source.url` | full URL |
| `preconditions` | `testCases[].preconditions` | as is |
| `steps` | `steps[].number` + `action` | `1. Open My loans` one per line |
| `expected` | `testCases[].expectedResult` (or the steps' `expected`, numbered) | as is |
| `actual` | `testCases[].actualResult` (or the steps' `actual`, numbered) | as is |
| `status` | `testCases[].status` | through the status mapping |
| `environment`, `version`, `executedBy`, `executedAt` | `execution.*` | as is |
| `recording` | `recordings[].url` | one URL per line |
| `evidenceFiles` | all `steps[].evidence` | file names, one per line |
| `defects` | `testCases[].defects` | comma-separated |
| `notes` | `testCases[].notes` + divergences of the case | as is |
| `extra.<label>` | `extra["<label>"]` | as is |

Match model headers by meaning, in any language (for example "Resultado Obtido", "Actual", "Evidência" → `evidenceFiles` or `recording`, depending on content). When a header is ambiguous, ask.

## mapping.json

```json
{
  "model": "Evidence model.xlsx",
  "sheet": "Evidências",
  "headerRow": 3,
  "columns": {
    "Caso de Teste": "testCaseId",
    "Descrição": "title",
    "Resultado": "actual",
    "Situação": "status",
    "Vídeo": "recording",
    "Sprint": "extra.Sprint",
    "Aprovador": null
  },
  "status": { "Passed": "OK", "Failed": "NOK", "Blocked": "Impedido", "Not run": "Não executado" }
}
```

`null` = no source; the column stays empty and is reported. The status map converts the evidence statuses (either language) to the model's words; if the model has a dropdown, use exactly its values (`inspect` shows example values; ask if unsure).

## Mapping table for the gate

```text
Model: Evidence model.xlsx — sheet "Evidências", header row 3

| Model column | Filled from | Example (TC-1001) |
|---|---|---|
| Caso de Teste | testCaseId | TC-1001 |
| Situação | status (Passed→OK, Failed→NOK) | OK |
| Aprovador | — (no source, stays empty) | |

Do you approve this mapping?
```
