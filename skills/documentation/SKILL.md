---
name: documentation
description: "[PLANNED] Not available yet. Will analyze functional changes and propose targeted updates to the official scenario base, preserving ids and traceability, flagging obsolete scenarios, and requiring approval before any update. If invoked, explain that it is planned and stop."
license: MIT
metadata:
  version: "0.0.1"
  status: planned
  category: quality
  phase: "4"
---

# Documentation

> **Status: planned.** Conceptual definition only. Do not execute: tell the user this skill is not available yet and stop.

## Purpose

Analyze functional changes and propose updates to the official scenario base.

## Responsibilities

- Compare previous and current documentation.
- Identify impacted scenarios.
- Preserve ids and traceability.
- Propose targeted changes (no full rewrites).
- Identify obsolete scenarios.
- Require approval before updating the official base.

## When to use

After a change was reviewed and/or its tests designed, when the official scenario base must reflect it. Not yet available.

## Inputs

Planned: previous and current documentation; current scenario base; approved test design outputs; project conventions for the scenario base.

## Tools

Planned: file access; possibly connectors to the team's test management tool (not defined).

## Procedure

Not implemented. If invoked: inform the user that the skill is planned and stop.

## Rules and constraints

- Never renumber or reuse scenario ids; obsolete scenarios are marked, not deleted.
- Never update the official base without approval.
- Core policies apply ([execution principles](references/core/execution-principles.md), [traceability](references/core/traceability.md)).

## Validation criteria

To be defined when implemented. Minimum: every proposed change traces to a documentation difference.

## Output format

To be defined. Proposals will be saved under `workspace/projects/<project-id>/runs/<run-id>/outputs/`.

## Human approval points

Every change, exclusion or obsolescence mark in the official base.

## Error handling

To be defined.

## Completion criteria

To be defined.

## Persistence

Standard [persistence protocol](references/core/persistence-protocol.md).
