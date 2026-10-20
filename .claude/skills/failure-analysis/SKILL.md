---
name: failure-analysis
description: Pre-analysis of a software failure from the QA's description and the log, to point developers quickly to the probable cause. Validates mandatory information first (item description, failure moment, evidence date/time, log) and asks only for what is missing; then returns a short plain-text pre-analysis (summary, failure point, evidence, hypothesis, direction, impact) that never presents hypotheses as certainty. Use when a test or user found an error and the QA has logs or a stack trace.
license: MIT
metadata:
  version: "1.0.0"
  status: draft
  category: quality
  phase: "2"
---

# Failure Analysis

## Purpose

Act as a **senior QA performing a log PRE-ANALYSIS to direct the development team**.

Objective: produce a **direct, short and useful** analysis so the developer can quickly identify the possible cause of the error.

## Responsibilities

- Validate that all mandatory information was provided before analyzing.
- Identify the main error/exception and the probable failure point, using the log as the main evidence.
- Correlate log, flow and moment of the failure.
- State the most probable cause as a hypothesis, never as certainty.
- Tell the developer what to check directly.
- State the impact on the flow.

## When to use

Use when the QA reports an error observed during testing or in an environment and provides (or can provide) a log or stack trace.

Do not use to design tests, review requirements or register defects in a tracker (not implemented).

## Inputs

The QA fills in the [input template](references/input-template.md):

**Mandatory information:**
- **Item description** (flow + action executed + expected result + obtained result)
- **Moment of the failure** (step where the error occurred)
- **Evidence date/time** (approximate date and time of the error, e.g. 02/04/2026 16:24)
- **Log** (relevant excerpt: error + stack trace)

Optional:
- Observations: does the error always happen? relevant variations.
- Project id (to load log locations, affected module and integrations from project context).

Log input is manual in this version. Future integrations (log platforms, CI artifacts, MCP) must place retrieved logs in the run's `inputs/` folder and do not change the mandatory check.

## Tools

- None required beyond reading the provided text/files. Large log files: read only the part around the reported date/time and the error.

## Procedure

1. **Validate mandatory information.** Check each of the four mandatory items. The description counts as provided only if flow, action, expected result and obtained result are all present.
2. **If anything is missing, do NOT analyze.** Reply **exactly** with the [missing-information message](#missing-information-message), listing only the missing fields. Set status `awaiting-input`.
3. **Analyze** using the log as the main evidence: main error/exception, where it probably happened, whether its timestamp is consistent with the reported date/time, correlation with the flow and step.
4. **Deliver the pre-analysis** in the [mandatory output format](#output-format). Nothing before or after it unless the user asks.

## Rules and constraints

- Before analyzing, validate that all mandatory information was provided.
- If any is missing, do NOT analyze; request only what is missing.
- Do NOT produce long explanations.
- Do NOT repeat unnecessary context.
- Do NOT invent information.
- Do NOT treat a hypothesis as certainty.
- Focus on what helps the developer investigate.
- Use the log as the main evidence.
- If the log timestamp does not match the reported date/time, or the log does not contain the error described, say so under Evidence — do not force a correlation.
- Apply [execution principles](references/core/execution-principles.md) and [isolation](references/core/isolation-policy.md); never echo credentials or personal data that appear in logs — mask them.

## Validation criteria

- No analysis delivered when a mandatory field is missing; the missing-information message lists exactly the missing fields and nothing else.
- Output has the six sections in order, under the `[PRE-ANALYSIS]` header (pt-BR: `[PRÉ-ANÁLISE]`).
- The Evidence section quotes the error/exception and a log excerpt actually present in the input, and the date/time.
- The Hypothesis is worded as probability ("provável", "possivelmente", "likely"), never as a confirmed cause.
- Short: each section a few lines.

## Output format

Mandatory format — plain text, notepad style (deliver inside a plain code block so it can be copied as-is). Labels in the deliverable language (English by default).

English:

```text
[PRE-ANALYSIS]

Summary:
- objective description of the problem

Failure point:
- where it probably occurred (based on the log)

Evidence:
- main error/exception
- date/time of the occurrence
- relevant excerpt

Hypothesis:
- most probable cause (without stating it as certain)

Direction:
- what the developer should check directly

Impact:
- effect on the flow (short)
```

pt-BR (original):

```text
[PRÉ-ANÁLISE]

Resumo:
- descrição objetiva do problema

Ponto da falha:
- onde provavelmente ocorreu (com base no log)

Evidência:
- erro/exceção principal
- data/hora da ocorrência
- trecho relevante

Hipótese:
- causa mais provável (sem afirmar como certeza)

Direcionamento:
- o que o dev deve verificar diretamente

Impacto:
- efeito no fluxo (curto)
```

Save the same text as `pre-analysis.txt` in `workspace/projects/<project-id>/runs/<run-id>/outputs/` and the received log in the run's inputs folder.

### Missing-information message

If anything is missing, reply EXACTLY, in the user's language:

```text
To start the pre-analysis, I need the following information:
- [list only the missing fields]
```

pt-BR (original):

```text
Para iniciar a pré-análise, preciso das seguintes informações:
- [listar apenas os campos faltantes]
```

## Human approval points

None inside the analysis. Sending log content to any external service (search engines, third-party tools) requires authorization ([approval policy](references/core/approval-policy.md)).

## Error handling

- Log unreadable, truncated or without any error: report it under Evidence and keep the hypothesis open; ask for a larger excerpt only if needed.
- Log clearly from another system/date: point out the mismatch.
- Several unrelated errors: focus on the one matching the moment of failure; mention others in one line.

## Completion criteria

The pre-analysis was delivered in the mandatory format, or the missing-information message was sent and the run is `awaiting-input`.

## Persistence

Follow the [persistence protocol](references/core/persistence-protocol.md). Run in `workspace/projects/<project-id>/runs/<run-id>/` with `state.json` (steps `validation`, `analysis`), the log in its inputs folder and `pre-analysis.txt` in its outputs folder.
