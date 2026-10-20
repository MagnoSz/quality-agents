# Context update rules

## Proposals

Any skill that discovers knowledge which may be general to the system appends to `proposed-updates.md`:

```markdown
## PU-007 — Approval requires a supervisor role
- Proposed on: 2026-10-20 (run 20261020-0930-requirements-review-loan-renewal)
- Target file: context/business-rules.md
- Content: Only users with the Supervisor role can approve a loan extension.
- Source: interview answer in the run above, user story LIB-142
- Status: proposed
```

Ids are sequential within the project and never reused.

## Promotion

1. Present pending proposals in small batches. For each, the user answers: confirm / reject / adjust.
2. Confirm → write the content into the target file using that file's entry format, with `Source` and `Confirmed: <date> by <who>`; set the proposal status to `promoted (<date>, by <who>)`.
3. Adjust → record the adjusted wording, not the original proposal.
4. Reject → status `rejected`; nothing is recorded in `context/`.
5. Update the "Last confirmed update" column in `context/index.md`.

## Changing confirmed context

- Never edit or remove a confirmed entry silently. Show current text, proposed change and source; record the change only after explicit approval.
- Keep official ids. A removed rule is marked `obsolete (<date>)`, not deleted, so traceability survives.

## What never goes into context

- Activity results (review matrices, test cases, analyses) — they stay in the run folder.
- Hypotheses, inferences and decisions specific to a single story.
- Credentials, tokens, personal data, customer data.
