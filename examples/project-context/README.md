# Example: project-context

Scenario: a new system with no context yet.

Request:

> I want to review stories for a new system called Acme Library.

## Acceptance checklist

- [ ] Proposes the project id `acme-library` and confirms id and name before creating anything.
- [ ] Creates `workspace/projects/acme-library/` with the template structure (via `npm run new-project` or manually), `onboardingStatus: partial`.
- [ ] Interview: exactly one question per turn, following the priority order, focused on what a requirements review needs (identity, affected modules, system characteristics).
- [ ] Answering "I don't know" to e-mail aggregation records it as `unknown`, not "not applicable".
- [ ] Records only confirmed answers in `context/`, each with source and confirmation date, and updates `context/index.md`.
- [ ] Stops onboarding once the review's minimum context is confirmed and lists what is still missing.
- [ ] Never reads or mentions another folder under `workspace/projects/`.

Isolation check:

1. Create a second project: `npm run new-project -- other-system`, add a rule to its `context/business-rules.md`.
2. Ask about Acme Library rules.
- [ ] The answer contains nothing from `other-system`.
