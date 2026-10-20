# Stage 1 — Scenario mapping

🎯 **Objective:** map all **relevant test scenarios** based on the documentation sent.

## Must consider

- Functional and non-functional requirements
- Business rules (explicit or implicit — implicit ones are labeled as inferred)
- Acceptance criteria
- Messages, validations and translations
- Main, alternative and exception flows
- Project context: glossary, related rules, flows and project-specific checks

## Techniques

The original process lists these techniques as **mandatory**. Every one of them must be **evaluated** for every analysis; each is **applied where it fits the requirement**, and when it does not fit, record why (e.g. "BVA: not applicable — no numeric or ordered input in this story").

| Technique | Apply when |
|---|---|
| **Equivalence Partitioning (EP)** | Inputs/conditions with classes of values handled the same way |
| **Boundary Value Analysis (BVA)** | Numeric, date, length or ordered limits |
| **Decision Tables / Condition combinations** | Two or more conditions that combine to determine the result |
| **Risk-Based Testing** | Always — to prioritize scenarios and decide depth |
| **Positive & Negative Testing** | Always — valid and invalid usage |
| **Alternative and exception flow coverage** | Any flow with branches, errors, cancellations or failures |
| **Acceptance Criteria Coverage** | Always — every criterion maps to at least one scenario |
| **Non-Functional Testing (ISO 25010)** | Only characteristics relevant to the change (performance, usability, security, compatibility, reliability...) |
| **Traceability by RN, requirement or criterion** | Always |

Add the technique record at the end of the mapping:

```markdown
**Techniques evaluated** (pt-BR: Técnicas avaliadas)
- EP: applied — item quantity classes (RN.002)
- BVA: applied — limit of 5 renewals (RN.003)
- Decision table: not applicable — a single condition determines the result
- ...
```

## Output format

Keep the original format, with labels in the deliverable language.

English (default):

```markdown
### 🔸 US:1234 / RN.001 – [Rule summary, if applicable]

🔹 Scenario: [Clear scenario description] – (Source: US:1234 / RN.001)
🔹 Scenario: [Clear scenario description] – (Source: Acceptance Criterion)
🔹 Scenario: [Clear scenario description] – (Source: ISO 25010)
```

pt-BR (original):

```markdown
### 🔸 US:1234 / RN.001 – [Resumo da Regra, se aplicável]

🔹 Cenário: [Descrição clara do cenário] – (Origem: US:1234 / RN.001)
🔹 Cenário: [Descrição clara do cenário] – (Origem: Critério de Aceite)
🔹 Cenário: [Descrição clara do cenário] – (Origem: ISO 25010)
```

Use the real ids from the documents; never invent `US`/`RN` numbers. If an item has no id, say so (e.g. `Source: US:1234 / rule without id — paragraph 2`).

> ⚠️ Tips:
> - Avoid redundancies
> - Consider variations by data, states, conditions and exceptions
> - Map all relevant paths

After the mapping, list **pending items** (ambiguities, undocumented messages/values) and then ask for the OK to proceed to stage 2. **Wait.**
