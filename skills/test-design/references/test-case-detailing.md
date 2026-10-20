# Stage 2 — Detailed test cases

🎯 **Objective:** create **ready-to-execute manual test cases** based on the scenarios approved in stage 1.

## Expected structure (Excel or table)

| Source | Context | Scenario | Steps | Expected Result |
|---|---|---|---|---|
| US:1234 / RN.001 | Module X - Screen Y | Required field validation | 1. Open screen Y<br>2. Leave the field empty... | Show message: "Este campo é obrigatório." |

(pt-BR column labels, original template: Origem | Contexto | Cenário | Passo a Passo | Resultado Esperado. In the example the documented message is quoted in its original language.)

In the spreadsheet, steps go in a single cell, one numbered step per line.

## Mandatory instructions

- Each test case must be **independent**, **clear** and **traceable**.
- Use the **deliverable language** (English by default, or the project's `deliverableLanguage`). Quoted messages stay exactly as documented, in their original language.
- Include **exact messages (in quotes)** in the Expected Result — **when documented**. When the exact text is not documented, describe the expected behavior and add **[MESSAGE TO CONFIRM]** (pt-BR: [MENSAGEM A CONFIRMAR]); never invent the wording.
- Do not omit **negative tests**, exception tests or tests with invalid values.
- Use **real values**, not just generic ranges: write `Enter quantity 0`, not `Enter an invalid quantity`. Values come from documented rules (limits, formats) or are synthetic test data; a value that would require an undocumented rule is marked pending.
- Generate **as many tests as needed** to cover all scenarios.
- **Context** identifies module and screen (or API/flow) using names from the documents or project context.
- **Origin** repeats the scenario's origin from the mapping.

## Data file for export

Save `test-cases.json` in the run's `outputs/` folder:

```json
{
  "testCases": [
    {
      "source": "US:1234 / RN.001",
      "context": "Module X - Screen Y",
      "scenario": "Required field validation",
      "steps": "1. Open screen Y\n2. Leave the Name field empty\n3. Click Save",
      "expected": "Show message: \"Este campo é obrigatório.\""
    }
  ]
}
```

Then export (from the framework root):

`npm run xlsx -- write --layout skills/test-design/assets/test-cases.layout.json --data <run>/outputs/test-cases.json --lang <en | pt-BR> --out "<run>/outputs/Test Cases.xlsx"`

(Use the file name for the deliverable language from the layout: `Test Cases.xlsx` for en, `Casos de Teste.xlsx` for pt-BR.)

## Self-check before delivering

- Every approved scenario has at least one test case; none was added that is not in the approved mapping (if a new one is needed, ask).
- No duplicated test cases.
- Every quoted message exists in the sources.
- Pending items listed at the end.
