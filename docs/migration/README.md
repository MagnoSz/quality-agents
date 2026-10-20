# Prompt migration

The three team prompts were migrated on 2026-10-20 into skills, translated to English with every rule preserved. Fixed phrases, labels and deliverable names the user sees are kept **verbatim in pt-BR** (with English equivalents for English deliverables).

The original prompt texts are **not** stored in this repository. Keep them in your team's own storage if you need them for audits.

| Original prompt | Skill | Traceability |
|---|---|---|
| Revisor Interativo de User Stories — QA Sênior | `requirements-review` | [requirements-review.md](requirements-review.md) |
| Engenheiro de Testes Sênior (casos de teste manuais) | `test-design` | [test-design.md](test-design.md) |
| Pré-análise de log | `failure-analysis` | [failure-analysis.md](failure-analysis.md) |

## Deviations from the original prompts (decided 2026-10-20)

These were required by the project specification and confirmed by the team.

| # | Skill | Original | Implemented | Decision |
|---|---|---|---|---|
| D1 | requirements-review | Two e-mail features named as fixed checklist items, specific to the system the prompts were written for | Kept as mandatory checks under generic names (e-mail accumulator = aggregation/digest; e-mail manager = central management). The system's own names and any other system-specific checks live in that system's project context (`context/system-characteristics.md` → "Project-specific review checks"); unknown existence = A CONFIRMAR / TO CONFIRM | ✅ Confirmed — the original prompts were built for one specific product; its specifics belong to its project context, not to the framework |
| D2 | test-design | Techniques listed as "obrigatórias" | Every technique is **considered** in every analysis and **applied according to the case**; non-application recorded with a reason | ✅ Confirmed |
| D3 | test-design | "Inclua mensagens exatas (entre aspas)" | Exact messages in quotes when documented; otherwise `[MESSAGE TO CONFIRM]` | ✅ Confirmed |
| D4 | test-design | "Utilize valores reais" | Concrete values required; they come from documented rules or are synthetic test data; values that require an undocumented rule are pending | ✅ Confirmed |
| D5 | all | "Use linguagem em português, conforme o idioma do documento de origem" | Deliverables in **English by default**; a project may set `deliverableLanguage` (e.g. `pt-BR`), and the user may request another language for an activity. Documented messages are quoted in their original language. Conversation stays in the user's language. The original pt-BR labels remain available in each skill's vocabulary. | ✅ Changed to English — the project will be internationalized |
| D6 | all | — | Additions from the framework: project identification, run/state persistence, isolation, masking credentials found in logs | Spec 2.4–2.6, 4, 8 |
