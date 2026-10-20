# Stage 6: Returned matrix and final formalization

## 6. Returned matrix and final formalization

After generating the **QA Review Matrix**, the process is still NOT closed.

The Excel represents the result of the review and can also be used by the team to resolve points that remained pending, blocked or dependent on external definition.

After delivering the Excel:

> **Wait for the user to return the QA Review Matrix with the pending points resolved and/or complementary definitions filled in.**

**Do not generate the final report before receiving this updated matrix.**

## Analysis of the returned matrix

When the updated Excel is received (read it with `npm run xlsx -- read <file> --layout skills/requirements-review/assets/review-matrix.layout.json --out <run>/inputs/returned-matrix.json`, or with the tool's own capability):

1. Read all sheets of the matrix.
2. Identify changes made by the user/team (compare with the delivered `review-matrix.json`).
3. Identify points that were PENDENTE or BLOQUEADO and now have a definition.
4. Identify new information added.
5. Cross-check these definitions with the stories and with the review history.
6. Check whether the answers effectively resolve the points.
7. Check whether any new definition contradicts another rule already consolidated.
8. Check whether there are still PENDENTE, BLOQUEADO, AMBÍGUO or insufficiently defined points.

**Do not alter, complete or silently interpret a definition provided in the Excel.**

The definitions recorded by the user/team are the source for the final formalization.

If there is a conflict or insufficient information, return to the **interactive interview**, asking **ONE question at a time**.

## Criteria for formalization

The final report may only be generated when the relevant points are sufficiently defined.

If there are still pending points:

- state which remain;
- explain why they prevent or limit formalization;
- continue the investigation when necessary.

When the definitions are sufficient, ask the G3 question exactly:

> **"A matriz está suficientemente consolidada para formalização. Posso gerar o Relatório Final de Definições em PDF?"**

**Wait for authorization.**

## Final Definitions Report — PDF

After authorization, generate the file **Relatório Final de Definições QA.pdf** (en: QA Final Definitions Report.pdf).

The purpose of the PDF is to **formalize what was effectively defined after the whole review process**, serving as a consolidated record for QA, Product, Development and other stakeholders.

The report must NOT be a reproduction of the spreadsheet nor a complete history of questions and answers.

It must turn the approved definitions into clear, organized and objective functional documentation.

### PDF content

Structure as applicable:

1. **Identification** — stories reviewed; feature/delivery; consolidation date.
2. **Objective** — summary of the functional objective of the change.
3. **Consolidated scope** — what is effectively part of the delivery after the definitions obtained.
4. **Defined functional behavior** — approved behaviors, objective and testable.
5. **Business rules** — final rules and their interactions.
6. **Flows and states** — when applicable: main flow; alternatives; exceptions; states; transitions; restrictions; precedences.
7. **Screens and interface behavior** — screens; fields; actions; messages; visual states; navigation; related prototypes.
8. **Permission assignments and permissions** — who can view or execute each relevant behavior.
9. **Parameters and configurations** — new/changed parameters, scope, defaults and effects.
10. **Multi-tenancy** — isolation rules, active company, visibility and per-company configuration.
11. **Multi-language** — behaviors and elements requiring translation/localization.
12. **E-mails and notifications** — when applicable: triggers; recipients; content; e-mail manager; e-mail accumulator; language; company.
13. **Data, persistence and history** — data created/changed; links; legacy; history; audit; integrity.
14. **Integrations** — behaviors, responses, errors and processing rules.
15. **Reports, queries and exports** — impacts and related definitions.
16. **Compatibility and legacy** — expected behavior for existing data, customers and configurations.
17. **Non-functional requirements** — only those effectively defined and applicable.
18. **Prototypes and related artifacts** — prototypes/artifacts complementing the definitions, when they exist.
19. **Remaining risks or caveats** — only risks or limitations consciously accepted.

Use the section titles of the deliverable language (pt-BR originals: Identificação, Objetivo, Escopo consolidado, Comportamento funcional definido, Regras de negócio, Fluxos e estados, Telas e comportamento de interface, Atribuições e permissões, Parâmetros e configurações, Multiempresa, Multilíngue, E-mails e notificações, Dados, persistência e histórico, Integrações, Relatórios, consultas e exportações, Compatibilidade e legado, Requisitos não funcionais, Protótipos e artefatos relacionados, Riscos ou ressalvas remanescentes).

### Consolidation rule

The PDF must represent the **final approved state of the feature**, not the path of the discussion.

Therefore:

- do not turn interview questions into sections;
- do not keep discarded alternatives as if they were still valid;
- do not record hypotheses as rules;
- do not replicate all Excel rows;
- do not keep contradictions already resolved;
- do not create a separate "decisions taken" section.

Each approved definition must be incorporated into its corresponding functional place. Examples:

- decision about permission → **Permission assignments and permissions**;
- decision about a parameter → **Parameters and configurations**;
- decision about a state → **Flows and states**;
- decision about company → **Multi-tenancy**;
- decision about e-mail → **E-mails and notifications**;
- decision about history → **Data, persistence and history**.

The report must look like a **consolidated specification, not meeting minutes**.

### Traceability

Preserve traceability with the source stories and rules whenever possible. A consolidated definition must make it possible to identify which US, RN or functional point it belongs to. However, prioritize readability: do not turn the document into a textual spreadsheet.

### Unresolved points

Never turn a pending point into a final definition.

If a non-blocking point remains undefined and the user chooses to formalize anyway:

- identify it explicitly as pending/caveat;
- do not complete the information by inference;
- do not present a hypothesis as approved behavior.

### Producing the file

1. Write the report as Markdown in the run's `outputs/` folder (`final-report.md`).
2. Run from the framework root: `npm run pdf -- <run>/outputs/final-report.md "<run>/outputs/QA Final Definitions Report.pdf"` (pt-BR deliverables: `Relatório Final de Definições QA.pdf`).
3. Fallback: deliver the Markdown (or HTML) and ask the user to export it to PDF. Never claim the PDF exists if it was not generated.

**The process is only formally closed after the final PDF is generated.** Then set `state.json` status `completed`, and offer general system definitions to `project-context` as proposals.

## Validation

- G3 approval recorded before the PDF.
- Every section present is backed by approved definitions (matrix final status CONTEMPLADO / RESOLVIDO / RESOLVIDO — ATUALIZAR US, or user definitions in the returned matrix).
- No PENDENTE/BLOQUEADO item appears as a definition; each appears only under section 19 if the user chose to formalize anyway.
- No section titled after interview questions and no "decisions taken" section.
