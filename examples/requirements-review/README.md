# Example: requirements-review

Input: [user-story.md](user-story.md) (pt-BR, synthetic). It contains deliberate problems.

Request to the AI tool. To test the original pt-BR labels, first set `"deliverableLanguage": "pt-BR"` in `workspace/projects/acme-library/project.json`; with the default (English) the checklist items apply with the English labels from the skill vocabulary.

> Revise a US do arquivo workspace/projects/acme-library/inbox/user-story.md do projeto acme-library.

## Acceptance checklist

Stage 1–2 (diagnosis, first response):

- [ ] Does **not** ask anything before presenting the diagnosis.
- [ ] Diagnosis has the six sections: USs analisadas, Entendimento, Problemas, Checklist sistêmico, Impactos aparentes, Necessidade de prototipação.
- [ ] Problems use `[REV-XXX]` with Tipo, Origem, Problema, Impacto, Definição necessária.
- [ ] Flags **CA1 × CA6**: limit for teachers vs. readers — contradiction or precedence gap (who is "professor", does CA6 override CA1).
- [ ] Flags **CA4** "usuário autorizado" as ambiguous (which role/permission assignment).
- [ ] Flags the base date for **CA2** (14 days from the original due date or from the renewal date).
- [ ] Flags the **CA2 × RN.011** interaction (renewal landing on a holiday).
- [ ] Flags **CA3** "em atraso" definition (same day? after closing time?) or the CA3 × RN.010 combination.
- [ ] E-mail (**CA5**): trigger, recipient, template, language gaps; e-mail accumulator and e-mail manager evaluated explicitly with status **A CONFIRMAR** (the example project context does not say whether they exist) — **not** NÃO SE APLICA.
- [ ] New screen "Meus empréstimos": permission assignment evaluated; prototype classified 🟡 RECOMENDADO or 🔴 NECESSÁRIO with what must be defined.
- [ ] No final verdict (APTA / NÃO APTA) in the diagnosis.
- [ ] No test cases anywhere.
- [ ] Ends with **exactly one question**, starting the interview, about a contradiction (highest priority).

Stage 3–4:

- [ ] Every interview turn contains exactly one question.
- [ ] Answering "quem tiver permissão" to CA4 is **not** accepted; the agent asks which assignment/rule.
- [ ] Before consolidating, asks the G1 question verbatim and waits.

Stage 5–6:

- [ ] `review-matrix.json` passes `npm run check-output -- review-matrix <run>/outputs/review-matrix.json`.
- [ ] The xlsx has 7 sheets with the pt-BR names; owners not given by the user are `A DEFINIR`.
- [ ] After delivering the xlsx, it waits for the returned matrix and does not produce the PDF.
- [ ] With the returned matrix, asks the G3 question verbatim before the PDF.
- [ ] The PDF reads as a consolidated specification (no Q&A sections, no "decisões tomadas" section).
- [ ] All files are under `workspace/projects/acme-library/runs/<run-id>/`.
