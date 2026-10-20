# Example: qa-orchestrator

Uses the inputs of [requirements-review](../requirements-review/README.md).

Request:

> Review the story in workspace/projects/acme-library/inbox/user-story.md and, once approved, map the test scenarios.

## Acceptance checklist

- [ ] Recognizes the `requirements-to-tests` workflow and states the plan (steps and gates) before starting.
- [ ] Identifies/loads project `acme-library` through `project-context` first.
- [ ] Creates a run under `workspace/projects/acme-library/runs/` and keeps `state.json` valid (`npm run runs -- acme-library` shows no `!` lines).
- [ ] Does **not** start test design while the review is not approved.
- [ ] At the review → test-design gate, presents the verdict and open items and asks for explicit approval.

Resume check:

1. Stop in the middle of the interview (close the session).
2. In a **different** session (or a different AI tool), ask: "Resume the Acme Library review."
- [ ] Lists or identifies the run, reads `state.json`, summarizes current step and pending items, and continues with the next single question — without redoing the diagnosis.
