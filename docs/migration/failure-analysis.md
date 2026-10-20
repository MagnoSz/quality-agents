# Traceability: Pré-análise de log → failure-analysis

Paths are relative to `skills/failure-analysis/`.

| Original section | Content | New location | Notes |
|---|---|---|---|
| Entrada — preenchimento (QA) | Input form | `references/input-template.md` | pt-BR verbatim + en version |
| Papel: QA sênior, pré-análise para direcionar dev | Persona | `SKILL.md` § Purpose | |
| Objetivo: direta, curta, útil | Objective | `SKILL.md` § Purpose | |
| Regras (8) | Rules | `SKILL.md` § Rules | All 8 verbatim in meaning |
| Informações obrigatórias (4) | Inputs | `SKILL.md` § Inputs, Procedure step 1 | |
| "Se faltar algo, responder exatamente: …" | Fixed message | `SKILL.md` § Missing-information message | en default + pt-BR original verbatim; checked by `npm run check-output -- missing-info` |
| Formato de saída obrigatório (bloco de notas, 6 sections) | Format | `SKILL.md` § Output format | en default + pt-BR original verbatim; delivered in a plain code block; checked by `npm run check-output -- pre-analysis` |
| — | Additions | `SKILL.md` § Rules, Error handling | D6 — mask credentials/personal data found in logs; flag timestamp/log mismatches instead of forcing correlation; future log integrations write to the run's inputs |
