---
name: automation
description: "[PENDING MIGRATION] Automation engineering for test projects - builds new automation projects, implements documented (FLX) scenarios in existing ones, and evolves existing projects, using project context, knowledge bases (via MCP when available) and a reference architecture (Playwright + TypeScript first). Awaiting the reference architecture, the FLX template and the implementation-plan reference; until then, explain and stop."
license: MIT
metadata:
  version: "0.2.0"
  status: pending-migration
  category: quality
  phase: "4"
---

# Automation

> **Status: pending migration.** Scope, modes, governance and procedures are defined. Three reference materials are still missing: the reference automation project (architecture principles), the FLX scenario template, and the reference implementation plan (quality bar for technical plans). Until they are migrated into [architecture principles](references/architecture-principles.md), [FLX format](references/flx-format.md) and [implementation plan](references/implementation-plan.md), do **not** execute this skill: tell the user it is not available yet and stop.

## Purpose

Give the QA an **automation engineering** capability, not just script generation: build, structure, maintain and evolve test automation projects with a consistent architecture, using functional documentation, system context and reusable components, to produce automation that is reliable, independent, traceable and sustainable.

## Responsibilities

Three modes:

| Mode | Goal |
|---|---|
| **Construction** | Create an automation project from scratch |
| **Implementation** | Automate documented scenarios in an existing project |
| **Evolution** | Analyze and improve an existing project, preserving behavior and compatibility |

Across modes:
- Understand the functional and technical context before proposing anything.
- Retrieve only the documentation that is needed, from the sources the user indicates.
- Reuse existing components; avoid duplication and unnecessary complexity.
- Present a plan and obtain approval before changing code.
- Execute and validate tests; diagnose failures; report with traceability.
- Leave every automation project **documented and AI-ready on its own**: architecture documentation, how and why it was built, how-to guides, and AI guidance files (`AGENTS.md`, `CLAUDE.md`) so any QA can keep working on it with any AI tool, without Moki ([target project docs](references/target-project-docs.md)).

Deliverables: structured automation projects with their documentation and AI guidance files; technical implementation plans; specs and reusable components; fixtures and data-preparation mechanisms; automated tests; execution configuration; reports and evidence; failure diagnoses; FLX scenario ↔ automated test mapping.

Out of scope: designing manual test cases (`test-design`), reviewing requirements (`requirements-review`), changing functional rules.

## When to use

- "Create an automation project for system X" → Construction.
- "Automate scenarios X, Y from page Z" → Implementation.
- "Review / improve / refactor our automation project", "why are these tests flaky?" → Evolution.

## Inputs

Required:
- Project id (context via `project-context`).
- The request (what to build, automate or improve).
- For Implementation and Evolution: the target automation repository (path in `project.json` → `repositories`, with `writeAllowed`).

Optional, as indicated by the user:
- Knowledge base, project/space, pages or folders, the scenarios to automate, reference documents, complementary rules (via MCP when available, otherwise files or pasted content).
- Environment(s) and test data constraints.

## Tools

Discover what is available **before** planning ([tool strategy](references/tool-strategy.md)):

| Category | Used for | If absent |
|---|---|---|
| Knowledge MCP (wiki, docs, drive) | Scenarios, rules, documentation | User provides files/content |
| Browser / Playwright MCP | Investigating UI behavior and elements | Ask the user for screenshots/DOM details; mark selectors as unverified |
| Code tools (read/write files) | Inspecting and changing the target repository | Deliver files/patches for the user to apply |
| Execution (shell, test runner) | Running tests, diagnostics | User runs commands and shares output |

Never claim to have consulted a source or executed something that was not actually available.

## Procedure

1. **Context.** Load project context via `project-context` (retrieval map row `automation`): conventions (automation architecture), environments and tools, knowledge sources, modules, flows, rules. Identify gaps and ask only for what this activity needs.
2. **Capabilities.** List available tools per category (above) and tell the user which will be used.
3. **Mode.** Identify the mode from the request and the repository state ([mode identification](references/mode-identification.md)). Confirm with the user when ambiguous.
4. **Run the mode procedure:**
   - Construction → [mode-construction](references/mode-construction.md)
   - Implementation → [mode-implementation](references/mode-implementation.md)
   - Evolution → [mode-evolution](references/mode-evolution.md)
5. **Report.** Delivery report with traceability ([delivery report](references/delivery-report.md)).
6. **Context update.** Offer confirmed general knowledge (e.g. automation conventions adopted) to `project-context` as proposals.

## Rules and constraints

Governance:
- Present an implementation plan before changing code; obtain approval for relevant changes.
- Preserve the behavior of shared components; changing one requires listing its consumers and approval.
- **Never weaken assertions** (remove, loosen, skip, or convert to soft checks) to make tests pass.
- Do not change functional rules without confirmation.
- No destructive operations or global modifications (mass renames, deleting files, rewriting history, changing shared environments or data) without explicit authorization.
- **Do not confuse observed behavior with expected behavior.** Expected behavior comes from documentation/oracle; a divergence is a finding to report, not something to encode in the test.
- Respect the retry limit for fix attempts ([execution principles](references/core/execution-principles.md)).

Repositories:
- The framework repository holds skills; the **target automation repository** holds test code; the **project workspace** holds context and run results ([isolation](references/core/isolation-policy.md)).
- Never create specs, flows or utils inside the Moki repository, except when explicitly developing a generic template of the framework itself (under `templates/`).
- Never copy rules specific to one system (including the reference project's system) into another project. Reuse architecture principles, not business rules.

Knowledge sources:
- Consult only the sources, spaces and pages the user indicated, plus what is strictly needed to resolve references found in them. Do not crawl a whole knowledge base.
- Never invent documentation; cite the source (page/file and section) of every scenario, rule and oracle item used.

Also apply [approval](references/core/approval-policy.md) and [traceability](references/core/traceability.md).

## Validation criteria

- A plan was approved before any code change (recorded in `state.json`).
- Every automated scenario traces to its source (FLX id/page) and every oracle item maps to at least one verification, or is explicitly listed as not automatable with a reason.
- Tests were executed in the target environment, and results are reported as they happened (pass/fail/blocked), with evidence.
- No assertion was removed or weakened; diff review confirms it.
- No file outside the approved plan was changed in the target repository.
- No test depends on another test's execution or on shared mutable data without an explicit, documented strategy.
- The target repository has the required documentation and AI guidance files, consistent with its real structure, and every documented command was executed successfully ([target project docs](references/target-project-docs.md#validation)).

## Output format

- Code and configuration: in `<target-repo>/`, following that repository's conventions and Git policy.
- Project documentation and AI guidance: `<target-repo>/README.md`, `<target-repo>/docs/` (architecture, decisions, how-to, traceability), `<target-repo>/AGENTS.md`, `<target-repo>/CLAUDE.md`.
- Plans, reports, traceability matrix, evidence and diagnostics: in `workspace/projects/<project-id>/runs/<run-id>/` (plans and reports in its outputs folder, screenshots/traces/videos in its evidence folder).
- Formats: [implementation plan](references/implementation-plan.md), [delivery report](references/delivery-report.md).

## Human approval points

- Mode confirmation when ambiguous.
- Construction: architecture proposal before creating the structure.
- Implementation: implementation plan before coding.
- Evolution: each improvement proposal before applying it.
- Any change to shared components, global configuration, CI pipelines, or test data in shared environments.
- Any run against shared or production-like environments.

## Error handling

- Source not accessible (MCP missing, permission denied): say so, ask for the content; never assume its content.
- Scenario ambiguous or oracle incomplete: list the gap; do not automate an assumption. Suggest `requirements-review` or ask the user.
- Test failing after implementation: diagnose (product defect vs. test defect vs. environment/data); at most 3 fix attempts per failure; a suspected product defect is reported with evidence (optionally via `failure-analysis`), not worked around.
- Flaky behavior: report the evidence and the suspected cause; do not add blind retries or sleeps to hide it.

## Completion criteria

Mode deliverables produced and approved, project documentation and AI guidance files created or updated, tests executed with real results reported, delivery report with traceability saved, `state.json` completed, context proposals offered.

## Persistence

Follow the [persistence protocol](references/core/persistence-protocol.md). `state.json` records mode, available capabilities, plan approval, files changed in the target repository (as `<target-repo>/...` artifacts), execution results and pending items, in `workspace/projects/<project-id>/runs/<run-id>/`.
