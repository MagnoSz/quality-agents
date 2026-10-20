# Mode: Implementation

Automate documented scenarios in an existing automation project.

## Procedure

1. **Retrieve the documentation indicated** (knowledge MCP, files or pasted content). Record each source used.
2. **Identify the scenarios** to automate and their ids.
3. **Use FLX as the functional reference format** ([FLX format](flx-format.md)).
4. **Adapt other formats to FLX** when needed (e.g. manual test cases from `test-design`, Gherkin, free text). Show the adapted version; gaps become pending items, never assumptions.
5. **Consult related rules and context** (business rules, permissions, states, configurations involved).
6. **Inspect the automation repository**: structure, conventions, configuration, existing specs/flows/utils/fixtures, data helpers.
7. **Identify reusable components** and what is missing.
8. **Plan the files and methods needed** (new and changed), respecting the existing layers.
9. **Define the data strategy** for each scenario (creation, isolation, cleanup, idempotency).
10. **Map each oracle item to a verification** (assertion) — one row per oracle item.
11. **Present the implementation plan** ([implementation plan](implementation-plan.md)).
12. **Wait for approval.**
13. **Implement** exactly what was approved, including updates to the project's documentation and AI guidance when components, conventions or commands change ([target project docs](target-project-docs.md#keeping-them-current)). If the project has no `AGENTS.md`/architecture docs, propose adding them in the plan.
14. **Execute and validate** the tests; diagnose failures (product vs. test vs. environment/data), respecting the retry limit.
15. **Produce the delivery and traceability report** ([delivery report](delivery-report.md)).

## Investigating the UI

Use the browser/Playwright MCP only when documentation and existing components do not answer a question (element location, dynamic behavior). What is observed in the UI informs **how** to automate; **what** to assert comes from the oracle. If the UI contradicts the oracle, report it.
