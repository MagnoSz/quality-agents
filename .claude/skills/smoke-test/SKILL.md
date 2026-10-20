---
name: smoke-test
description: "[PLANNED] Not available yet. Will run targeted pre-validations of a delivered improvement - identify impacted flows, reuse existing deterministic tests, complement with AI exploration, record problems and evidence, and state coverage limits. If invoked, explain that it is planned and stop."
license: MIT
metadata:
  version: "0.0.1"
  status: planned
  category: quality
  phase: "4"
---

# Smoke Test

> **Status: planned.** Conceptual definition only. Do not execute: tell the user this skill is not available yet and stop.

## Purpose

Execute targeted pre-validations of improvements before full testing.

## Responsibilities

- Identify impacted flows.
- Select relevant checks.
- Reuse existing tests.
- Run deterministic tests whenever possible.
- Use AI for complementary exploration.
- Record problems and evidence.
- Report coverage limitations.

## When to use

When a delivered improvement needs a quick pre-validation. Not yet available.

## Inputs

Planned: the change description; environment (from project context); existing automated tests; test design outputs.

## Tools

Planned: shell, existing test runners, optional browser MCP server.

## Procedure

Not implemented. If invoked: inform the user that the skill is planned and stop.

## Rules and constraints

- **Never declare an improvement fully validated just because the smoke test passed.**
- Prefer deterministic tests over AI exploration ([execution principles](references/core/execution-principles.md)).
- Running against shared environments requires approval.

## Validation criteria

To be defined. Minimum: report lists what was checked, how, and what was not covered.

## Output format

To be defined. Reports and evidence in `workspace/projects/<project-id>/runs/<run-id>/`.

## Human approval points

Before running against shared environments.

## Error handling

To be defined.

## Completion criteria

To be defined.

## Persistence

Standard [persistence protocol](references/core/persistence-protocol.md).
