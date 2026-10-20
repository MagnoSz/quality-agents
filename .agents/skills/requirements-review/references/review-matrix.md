# Stage 5: Consolidation and QA Review Matrix

## 5. Consolidation

After G1 authorization, deliver:

- functional summary;
- contradictions, ambiguities and gaps;
- definitions obtained;
- interactions between rules;
- final checklist;
- impacts on parameters, screens, permissions, e-mails, multi-tenancy, multi-language, data, history, integrations, reports and legacy;
- prototypes required/recommended;
- changes needed in the stories;
- pending items and risks.

### QA verdict (Parecer QA)

- 🟢 **APTA** — clear, consistent and testable.
- 🟡 **APTA COM RESSALVAS** — minor, non-blocking pending items.
- 🔴 **NÃO APTA** — relevant gaps, contradictions or risks remain.

## Excel — QA Review Matrix

After final authorization, generate **Matriz de Revisão QA.xlsx** (en: QA Review Matrix.xlsx).

The Excel records correct points, problems and definitions obtained, distinguishing:

**Original documentation → QA analysis → Question → Answer → Final definition → Impact/Update needed**

The exact sheet and column names (pt-BR original and en) are defined in [the layout asset](../assets/review-matrix.layout.json). Summary (pt-BR original):

### Sheet 1 — Matriz de Revisão

**ID | US | Categoria | Subcategoria | Origem | Referência | Ponto analisado | Análise inicial | Status inicial | Problema | Impacto | Risco | Pergunta | Resposta | Definição final | Status final | Atualizar US? | Atualização necessária | Evidência | Prototipação | Observações**

Initial status: **CONTEMPLADO | PARCIAL | NÃO CONTEMPLADO | AMBÍGUO | CONTRADITÓRIO | A CONFIRMAR | NÃO SE APLICA**

Final status: **CONTEMPLADO | RESOLVIDO | RESOLVIDO — ATUALIZAR US | PENDENTE | BLOQUEADO | NÃO SE APLICA**

### Sheet 2 — Checklist Sistêmico

**Área | Aplicabilidade | Status Inicial | Status Final | Nº Pontos | Pendências | Observação**

### Sheet 3 — Perguntas e Definições

**Nº | US | Tema | Motivo | Pergunta | Resposta | Definição | Impactos | Status**

### Sheet 4 — Alterações nas USs

**ID | US | Referência | Tipo de Alteração | Situação Atual | Definição Aprovada | Prioridade**

### Sheet 5 — Impactos e Artefatos

**Tipo | Elemento | Novo/Alterado | US | Definição | Artefato necessário | Situação**

### Sheet 6 — Prototipação

Only **NECESSÁRIO/RECOMENDADO**:

**ID | US | Tela/Fluxo | Classificação | Motivo | O que precisa definir | Status**

### Sheet 7 — Pendências e Riscos

**ID | US | Pendência | Tipo | Risco | Impacto | Responsável | Próxima ação**

Do not invent owners; use **A DEFINIR**.

### Presentation

The `.xlsx` must have filters, highlighted headers, frozen first row, text wrapping, adequate column widths, consistent IDs and a professional presentation. `npm run xlsx -- write` applies all of these from the layout.

### Producing the file

1. Write the data to `review-matrix.json` in the run's `outputs/` folder: `{ "<sheet key>": [ { "<column key>": "value", ... } ] }` using the keys from the layout asset.
2. Run, from the framework root:
   `npm run xlsx -- write --layout skills/requirements-review/assets/review-matrix.layout.json --data <run>/outputs/review-matrix.json --lang <deliverable language: en | pt-BR> --out "<run>/outputs/<file name for that language, from the layout>"`
   (e.g. `--lang en` → `QA Review Matrix.xlsx`; `--lang pt-BR` → `Matriz de Revisão QA.xlsx`)
3. If the tool cannot run commands, use its own spreadsheet capability with the same sheets, columns and presentation, or deliver the JSON and tell the user how to build it.

After delivering the Excel, the process is **not** over: set `state.json` status `awaiting-input` (G2) and continue with [stage 6](final-report.md).

## Validation

- Seven sheets, names and columns exactly as in the layout for the chosen language.
- Status cells use only the allowed values for their column.
- Every ID referenced in sheets 3–7 exists in sheet 1 or is consistently numbered within its sheet.
- Every row with final status RESOLVIDO — ATUALIZAR US has a matching row in sheet 4.
- Sheet 6 contains only NECESSÁRIO/RECOMENDADO rows.
- No owner other than those stated by the user; otherwise A DEFINIR.
