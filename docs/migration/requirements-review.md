# Traceability: Revisor Interativo de User Stories → requirements-review

Paths are relative to `skills/requirements-review/`.

| Original section | Content | New location | Notes |
|---|---|---|---|
| Role (QA Sênior, ISTQB, ISO 25010, 29119, RBT...) | Persona and expertise | `SKILL.md` § Purpose | Verbatim meaning |
| "NÃO gere casos de teste" | Prohibition | `SKILL.md` § Responsibilities, Rules | Repeated in both |
| Objetivo (8 anticipation items) | List | `SKILL.md` § Purpose | All 8 items |
| Pergunta central | Quote | `SKILL.md` § Purpose | |
| "Não invente requisitos nem transforme hipóteses em regras" | Rule | `SKILL.md` § Rules | |
| Classificação (DOCUMENTADO … NÃO SE APLICA) | 7 labels | `SKILL.md` § Inputs; `references/vocabulary.md` | pt-BR labels verbatim |
| Entrada (one or more USs; accepted artifacts; ask if none; individual + joint analysis) | Rules | `SKILL.md` § Inputs | |
| Fluxo obrigatório (5 steps) | Order | `SKILL.md` § Procedure table | Extended with stages 6–7 from the original "Retorno da matriz" section |
| 1. Revisão estática (identify list; clareza; ambiguidades; contradições 7 crossings; testabilidade) | Procedure | `references/static-review.md` § 1 | Subjective-term examples kept in pt-BR |
| Interação entre regras (9 combinations; combined behavior, precedence, exceptions) | Procedure | `references/static-review.md` § Interaction | |
| Checklist sistêmico (14 areas) | Checklist | `references/static-review.md` § Systemic checklist | D1 ✅ — e-mail accumulator/manager generalized; system names from project context |
| Status do checklist; "Ausência de menção ≠ NÃO SE APLICA" | Labels, rule | `references/static-review.md`; `SKILL.md` § Rules | |
| Prototipação e evidências (3 levels, when, what to define, evidence requests) | Procedure | `references/static-review.md` § Prototyping | |
| 2. Diagnóstico inicial (6 items; REV-XXX format; no verdict; start interview automatically) | Format | `references/static-review.md` § 2 | |
| 3. Entrevista (one question; priority order; 8 after-answer steps; ambiguous answers; conflicts; mark US update; no repeats; checklist ≠ form) | Procedure | `references/interview.md` § 3 | Added: persist after each answer |
| Novos elementos (list; new screen; new action) | Procedure | `references/interview.md` § New elements | |
| 4. Validação cruzada (sources; what to look for; return to interview; G1 question) | Procedure, gate | `references/interview.md` § 4; `SKILL.md` § Human approval points | G1 question verbatim |
| 5. Consolidação (9 deliverables; Parecer QA 3 levels) | Format | `references/review-matrix.md` § 5 | |
| Excel — 7 sheets, columns, status lists, A DEFINIR, presentation | Format | `references/review-matrix.md`; `assets/review-matrix.layout.json` | Columns verbatim; `npm run xlsx` implements filters, header style, frozen row, wrap, widths; adds dropdown lists |
| Regras finais (11 rules + "pode alterar desenvolvimento…?" + objective sentence) | Rules | `SKILL.md` § Rules, Procedure, Purpose | |
| 6. Retorno da matriz (wait; do not generate report before) | Gate | `references/final-report.md`; `SKILL.md` G2 | |
| Análise da matriz devolvida (8 steps; no silent changes; return to interview) | Procedure | `references/final-report.md` | Added: `npm run xlsx -- read` |
| Critério para formalização; G3 question | Gate | `references/final-report.md`; `SKILL.md` G3 | G3 question verbatim |
| Relatório final PDF (purpose; not a spreadsheet copy) | Format | `references/final-report.md` § PDF | |
| Conteúdo do PDF (19 sections) | Format | `references/final-report.md` § PDF content | pt-BR section titles listed verbatim |
| Regra de consolidação (6 don'ts; placement examples; spec not minutes) | Rules | `references/final-report.md` § Consolidation rule | |
| Rastreabilidade | Rule | `references/final-report.md` § Traceability | |
| Pontos não resolvidos | Rules | `references/final-report.md` § Unresolved points | |
| Fluxo completo; closed only after PDF | Flow | `SKILL.md` § Procedure, Completion criteria | |
