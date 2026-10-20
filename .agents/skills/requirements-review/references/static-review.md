# Stages 1–2: Static review and initial diagnosis

## 1. Static review

**Before asking anything**, read all artifacts and identify:

- objective and expected behavior;
- modules, features, actors/profiles and entities;
- inputs, outputs, states and data;
- main flow, alternative flows and exceptions;
- rules, criteria, dependencies, integrations and configurations;
- apparent impacts.

Analyze:

### Clarity and completeness

Is it clear **who, when, where, under which conditions, with which data, does what, and what result occurs**?

Question subjective or undefined terms such as "when necessary", "adequately", "authorized user", "default" or "correctly" (pt-BR originals: "quando necessário", "adequadamente", "usuário autorizado", "padrão", "corretamente").

### Ambiguities

When there is more than one reasonable interpretation, identify:
- excerpt;
- problem;
- possible interpretations;
- definition needed.

### Contradictions

Cross-check:
- description × criteria;
- criteria × criteria;
- US × RN;
- RN × RN;
- US × US;
- text × screenshot/prototype;
- new rule × existing behavior.

**Never silently choose which definition prevails.**

### Testability

Check whether it is possible to objectively determine precondition, action, input, rule, expected result, states, permissions, negative cases and exceptions.

## Interaction between rules

Do not analyze rules in isolation. Check relevant combinations, such as:

- Status × Permission/Action
- Parameter × Permission/Company/Parameter
- Company × Data/Permission
- Language × Interface/E-mail
- E-mail × Accumulator/Manager (e-mail aggregation / central e-mail management)
- Action × State/History/Notification
- New rule × Existing data/flow
- Screen × Permission assignment
- Integration × State

When two rules can occur simultaneously, check **combined behavior, precedence and exceptions**.

If they are clear in isolation but not together, there is a gap.

## Systemic checklist

Evaluate applicability of each area. Use the names and specifics recorded in the project context (`context/system-characteristics.md`), and also evaluate every **project-specific review check** listed there.

### Multi-tenancy (Multiempresa)
Data isolation, active company, company switching, configurations/parameters/permissions per company, sharing, and users linked to multiple companies.

### Multi-language (Multilíngue)
New/changed texts, labels, buttons, messages, statuses, options, validations, e-mails, templates, reports and notifications.

### Parameters/Configurations
Existing parameters affected or new ones; global/company scope; type; values; default; enabled/disabled; existing customers; deployment; combination between parameters.

### Screens/UI
Screen, field, button, column, filter, tab, modal, menu, action and visual states. When applicable: mandatory, type, size, mask, default, limits, values and dependencies.

### Permission assignments/Permissions
New or existing; view, create, edit, delete and execute; visible × enabled; behavior without permission; scope per company.

**A new screen/action must trigger permission-assignment evaluation.**

### E-mails/Notifications
Trigger, recipient, sender, subject, body, template, attachment, language, company and configuration.

If there is e-mail, explicitly evaluate:
- **E-mail accumulator** (aggregation/digest of e-mails): applicability, grouping, periodicity, trigger and composition.
- **E-mail manager** (central e-mail management): configuration, enablement, recipients, sender, template, company and language.

Use the system's own names for these features from the project context. If the project context does not record whether the system has them, the status is **A CONFIRMAR**, never NÃO SE APLICA.

### States/Lifecycle
Initial state, transitions, allowed/forbidden actions, editing, deletion, cancellation, reversal, completion and permissions.

### Data/Persistence
New/changed data, default, migration, legacy, links, integrity and physical/logical deletion.

### History/Audit
Creation, change, deletion, status, responsible user, date/time, previous/new values and history lookup.

### Integrations
Source/destination, trigger, data, response, error, timeout, unavailability, retry, duplication/idempotency, partial processing and traceability.

### Reports/Queries
Impacts on reports, dashboards, filters, indicators, queries, exports, PDF/Excel and APIs.

### Compatibility/Legacy
Existing data/customers/configurations, post-update defaults, migration, backward compatibility and shared flows.

### Concurrency
When applicable: simultaneous editing, double click, duplicate requests, lost updates and partial processing.

### Non-functional
Evaluate only relevant ISO 25010 aspects: performance, compatibility, usability/interaction, reliability, security, maintainability, etc.

**Do not force questions unrelated to the story.**

Checklist statuses: **CONTEMPLADO | PARCIAL | NÃO CONTEMPLADO | AMBÍGUO | CONTRADITÓRIO | A CONFIRMAR | NÃO SE APLICA**

**Absence of mention ≠ NÃO SE APLICA.**

## Prototyping and evidence

Evaluate the need for a prototype:

- 🔴 **NECESSÁRIO** — without visual definition there is a relevant gap / high risk of divergent interpretation.
- 🟡 **RECOMENDADO** — the text is understandable, but a prototype would reduce risk/rework.
- 🟢 **NÃO NECESSÁRIO** — the specification is sufficient.

Consider mainly: new screen, structural change, new flow/modal/navigation, wizard, complex table, contextual actions, visual states and dynamic behavior.

Do not require prototypes for trivial changes.

When recommending a prototype, explain **what needs to be defined**: organization, fields, actions, states, navigation, permissions, loading, error, empty state, etc.

During the interview, request when necessary:
- screenshot of the current screen/behavior;
- existing prototype;
- related US/RN;
- flow/documentation;
- functional definition.

**Do not invent information that can be obtained through evidence.**

## 2. Initial diagnosis

Before the interview, present:

1. **Stories analyzed**
2. **Understanding of the feature**
3. **Problems identified**
4. **Systemic checklist**
5. **Apparent impacts**
6. **Prototyping need**

For problems use:

```markdown
### [REV-XXX] Title
- **Tipo / Type:** Ambiguidade / Contradição / Lacuna / Inconsistência / Não testável / Risco
- **Origem / Source:**
- **Problema / Problem:**
- **Impacto / Impact:**
- **Definição necessária / Definition needed:**
```

(Use the field labels of the deliverable language.)

**Do not give a final verdict yet.**

Then **start the interview automatically**.
