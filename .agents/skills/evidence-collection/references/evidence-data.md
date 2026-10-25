# Evidence data format

`evidence.json` is the single source for `evidence-sheet` and `evidence-document`. Paths are relative to the run folder. Text is in the deliverable language, except quoted source content (steps, expected results, messages), which stays in its original language.

```json
{
  "project": "acme-library",
  "language": "en",
  "source": {
    "system": "Azure DevOps",
    "id": "142",
    "type": "User Story",
    "title": "Renew a loan",
    "url": "https://dev.azure.com/acme/library/_workitems/edit/142"
  },
  "execution": {
    "executedBy": "Ana Lima",
    "executedAt": "2026-10-24 14:30",
    "environment": "QA",
    "version": "2.8.0-rc1"
  },
  "testCases": [
    {
      "id": "TC-1001",
      "title": "Renew a loan before the due date",
      "source": "Azure DevOps 142 / Test Case 1001",
      "preconditions": "Member with one active loan due in 5 days",
      "steps": [
        {
          "number": 1,
          "action": "Open My loans",
          "expected": "Active loans are listed",
          "actual": "Active loans are listed",
          "evidence": ["evidence/TC-1001-01.png"]
        }
      ],
      "expectedResult": "Due date extended by 14 days and \"Loan renewed.\" shown",
      "actualResult": "Due date extended by 14 days; message \"Loan renewed.\" shown",
      "status": "Passed",
      "statusOrigin": "qa",
      "recordings": [
        {
          "url": "https://jam.dev/c/00000000-0000-0000-0000-000000000000",
          "summary": "inputs/jam-00000000.md",
          "consoleErrors": [],
          "networkErrors": []
        }
      ],
      "defects": [],
      "notes": ""
    }
  ],
  "extra": { "Sprint": "Sprint 42" },
  "divergences": [],
  "pending": [{ "id": "P1", "text": "Version/build not informed" }]
}
```

## Fields

| Field | Rule |
|---|---|
| `source` | From the tracker or the pasted item. `url` only if known; never built by guessing. |
| `execution` | From the QA or the recording metadata (Jam creation date, environment URL). Mark values taken from the recording in `notes` of the case if they differ from the QA's statement. |
| `testCases[].id` | Official id from the source; otherwise `TMP-TC-01`, `TMP-TC-02`... |
| `steps[]` | One entry per source step. `expected` copied from the source. `actual` from the QA or from the recording (then say so in `notes`). `evidence` lists the files for that step. A case without step detail may have a single step `0` holding the whole case. |
| `status` | `Passed`, `Failed`, `Blocked`, `Not run` (pt-BR deliverables: `Aprovado`, `Reprovado`, `Bloqueado`, `Não executado`). |
| `statusOrigin` | `qa` (stated or confirmed by the QA) or `proposed` (deduced; only allowed before the review gate). |
| `recordings[]` | One per Jam link. `consoleErrors` / `networkErrors`: short, masked lines (`POST /api/loans/77/renew → 500 at 14:31:02`). |
| `defects` | Ids given by the QA or linked in the tracker; never created here. |
| `extra` | Values required by a deliverable model that have no standard field, keyed by the model's label. |
| `divergences` | `{ "testCase": "TC-1001", "text": "Reported Passed, but the recording shows POST /renew → 500 at step 3" }`. |
| `pending` | Everything missing or unresolved. |

Evidence file names: `TC-1001-01.png`, `TC-1001-02.jpg` (prints), `TC-1001-jam-01.png` (Jam screenshots), all in the run's `evidence/` folder.

## Summary for the gate

```text
Evidence — <source system> <id>: <title>
Executed by <name> on <date/time>, environment <env>, version <version|pending>

| Test case | Status | Origin | Steps | Files | Jam | Notes |
|---|---|---|---|---|---|---|
| TC-1001 Renew before due date | Passed | qa | 3 | 2 | 1 | — |
| TC-1002 Renew an overdue loan | Failed (proposed) | proposed | 4 | 1 | 1 | console: TypeError at step 3 |

Divergences:
- ...
Pending:
- P1 ...

Do you approve this evidence, or what should be adjusted?
```
