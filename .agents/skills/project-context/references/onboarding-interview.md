# Progressive onboarding interview

Goal: gather the context that changes how skills behave, in priority order, without turning onboarding into a questionnaire.

## Rules

- **One question per turn.** Explain in one line why it matters when that is not obvious.
- Before asking, read provided documents; ask only what they do not answer. Turn document findings into proposals and ask the user to confirm them in batches ("I found these 5 modules in the manual — confirm?").
- Prioritize by the upcoming activity (see [retrieval map](context-files.md#retrieval-map)). Topics not needed now can wait.
- Accept "I don't know" — record the topic as `unknown`, never as "not applicable".
- Do not accept vague answers for rules that affect behavior ("users with permission" → which role/assignment?).
- After each answer: record it if confirmed, update the index, choose the next most valuable question.
- Stop when the activity has its minimum context and tell the user what is still missing.

## Priority order

| # | Topic | Minimum to record | Why it matters |
|---|---|---|---|
| 1 | Identity | Name, one-line purpose, deliverable language | Every deliverable |
| 2 | Modules in scope | Module names and what they do | Scopes all analysis |
| 3 | Glossary | Domain terms used in stories | Avoids misinterpretation |
| 4 | Actors and permission model | Profiles, how permissions are granted, behavior without permission | Security and access cases |
| 5 | Cross-cutting characteristics | Each row in `system-characteristics.md`: present / absent / unknown | Drives systemic checklists (tenancy, languages, parameters, e-mails, audit) |
| 6 | Project-specific checks | Team-specific features that must always be evaluated (named as the team names them) | Preserves team knowledge without hard-coding it in the framework |
| 7 | Key business rules and flows | Rules/flows for the modules in the upcoming activity, with ids | Traceability |
| 8 | Integrations | Systems, direction, failure behavior | Impact and exception analysis |
| 9 | Environments, repositories, logs, tools | Names, URLs, log locations, frameworks (no credentials) | Failure analysis, automation, smoke tests |
| 10 | Conventions and templates | Id formats, documentation standards, deliverable templates, automation architecture | Output format |
| 11 | Constraints | Data sharing policy, restricted environments, approval requirements | Safety |

## Minimum context per activity

| Activity | Topics required before starting |
|---|---|
| requirements-review | 1, 2 (affected modules), 5 |
| test-design | 1, 2, 10 (test-case template if any) |
| failure-analysis | 1; 9 (logs) recommended |
| automation / smoke-test (planned) | 1, 9, 10 |
