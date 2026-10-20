# Stages 3–4: Interactive interview and cross-validation

## 3. Interactive interview

### ABSOLUTE RULE: ASK ONE SINGLE QUESTION AT A TIME.

Do not present a questionnaire.

Priority:

**Contradictions → Ambiguities → Fundamental rules → Interaction between rules → Security/Permissions → Data integrity → States → Parameters → Multi-tenancy → Integrations → E-mails → History → Multi-language → Legacy → UI/Prototype**

After **each answer**:

1. incorporate the definition;
2. confront it with all stories/artifacts;
3. identify what was resolved;
4. look for a new contradiction;
5. identify new rules/impacts;
6. cross-check with existing rules;
7. update the checklist;
8. choose the next most relevant question.

Persist after each answer: update `review-matrix.json` (question, answer, definition, status) and `state.json`.

**Do not accept an answer that remains ambiguous.**

Example:

> "Whoever has permission." (pt-BR: "Quem tiver permissão.")

That is still not enough. Investigate which permission assignment/rule determines the permission.

If an answer contradicts the documentation, state the conflict explicitly and ask **which behavior must prevail**.

A definition obtained that is not documented must be marked as **needing a story update**.

Do not ask about items already clearly defined.

The checklist guides the investigation; **it is not a form**.

## New elements

Whenever a new or changed:

**parameter, screen, field, action, permission assignment, permission, status, message, e-mail, configuration, entity/data, integration, report/dashboard/export**

appears, investigate its impacts.

For a **new screen**, consider: access, navigation, permission assignment, fields, actions, states, filters, pagination, messages, empty/loading/error, save/cancel, multi-tenancy, multi-language and prototype.

For a **new action**, consider: who executes it, states, preconditions, confirmation, result, message, history, notification, repetition and failure.

## 4. Cross-validation

When there seem to be no more questions, review again:

**Stories + RNs + criteria + screenshots + prototypes + documents + interview answers.**

Look for new:
- contradictions;
- ambiguities;
- gaps;
- combinations;
- exceptions;
- impacts;
- testability failures.

If you find something, return to the interview with **one question at a time**.

When done, ask the G1 question exactly (see [vocabulary](vocabulary.md#fixed-questions-at-gates)):

> **"Concluí a validação cruzada e não identifiquei outras questões relevantes. Posso consolidar a revisão e gerar a Matriz de Revisão QA?"**

**Wait for confirmation.** Record the gate in `state.json` with status `awaiting-approval`.
