---
name: moki-change
description: Safe change procedure for the Moki framework itself (this repository) - scopes the request, traces its impact on every caller, layer, business rule and invariant, proposes the change with the actual code and its impact, stops for approval, then implements it in the layer that owns the concern, without workarounds, and proves it with the repository's checks. Use to plan, review or make any change to Moki (skill, agent, policy, script, desktop app, UI, packaging) or to fix a failing check. Depends on moki-architecture.
license: MIT
metadata:
  version: "1.0.0"
  status: draft
  category: framework
---

# Moki Change

## Purpose

Change Moki without breaking it and without workarounds: every change lands in the layer that owns the concern, extends the tables and flows that already exist, keeps every invariant, and is proven by the checks the repository already has.

## Responsibilities

- Scope the request and state what is out of scope.
- Trace the impact: callers, layers, business rules, invariants, tests, docs, translations, mirrors, installer, existing user data.
- Propose the change with the code and its impact; mention an alternative only when its trade-off is real, and say which one you recommend.
- After explicit approval: implement exactly the approved plan, update tests and docs, regenerate mirrors, run the checks, report.
- Does **not**: touch project data in the workspace folders; commit, push or release unless asked; weaken a check to make it pass; implement anything before approval.

## When to use

- Any change to Moki: skill, agent, policy, workflow, schema, template, helper command, shared library, `qa` command, desktop main process, UI, packaging, CI.
- Reviewing a diff or branch for architectural fit, broken invariants and workarounds.
- A failing check (validate, drift, artifacts, secrets, typecheck, tests, app build) that needs a fix.

Not for QA work on a project, nor for changes to a system under test (that is the `automation` skill).

## Inputs

- **Required:** the change request (what and why), a diff to review, a failing check's output, or an approved proposal to implement.
- **Optional:** constraints (platform, compatibility, deadline), related issue text, branch.
- If the *why* is missing and the options differ in impact, ask one question; otherwise proceed with the conventional choice and say so.

## Tools

- Read and search files in this repository (required).
- Shell: read-only commands for analysis (`git log`, `git show`, `git diff`, `git blame`, `npm run validate`, `npm run typecheck`, `npm test`, `node scripts/build.mjs --check`); write commands (`npm run build`, `npm run app:build`) only in `implement` and `verify`.
- Node ≥ 22.18. Without a shell: give the exact commands to the user and never report their result as known.

## Procedure

1. **`scope`** — Restate the change in one or two sentences, pick its type in [playbooks](references/playbooks.md), list what stays out. A decision that is genuinely the user's (visible behavior, compatibility break, new dependency, removing something users rely on) becomes one question.
2. **`context`** — Load the `moki-architecture` skill. Read the owning files completely, not excerpts, plus the business rules and invariants of that area.
3. **`impact`** — Search every caller, importer and reader of each symbol, file, field or phrase you will touch (scripts, desktop, app, tests, skills, docs, examples). For each item of the [impact checklist](references/playbooks.md#impact-checklist), mark affected or not, with the reason. Run the relevant checks once to know the baseline: a failure that already exists is reported as pre-existing, not as yours.
4. **`design`** — Climb the ladder and stop at the first rung that holds: is it needed at all → already in the codebase (`scripts/lib/`, an extension table) → Node standard library → platform feature → minimum new code. Place it in the owning layer ([best practices](references/best-practices.md)); extend tables instead of adding branches; keep public contracts; reject every pattern in [workarounds](references/best-practices.md#workarounds--never).
5. **`proposal`** — Deliver the proposal ([output format](#output-format)). Read-only work ends here.
6. **`approval`** — Gate: stop and wait for explicit approval of the proposal ([approval policy](references/core/approval-policy.md)). "Adjust" returns to `design` for the changed part only.
7. **`implement`** — Make exactly the approved changes, in order: canonical sources → shared libraries → callers → tests → docs → `npm run build` when skills, policies or agents changed. Mechanical fallout (an import, a regenerated mirror) proceeds and is reported; a deviation that changes behavior, scope or a contract goes back to `approval` with the delta.
8. **`verify`** — Run the [verification matrix](references/playbooks.md#verification-matrix) for every touched area; at minimum `npm run typecheck && npm run check && npm test`. Pass new, untracked files explicitly to `node scripts/check-artifacts.mjs` and `node scripts/check-secrets.mjs`. A failing check is fixed at its cause (at most 3 attempts per cause) or reported with its output — never bypassed.
9. **`report`** — Deliver the [report](#report).

## Rules and constraints

- Invariants in `moki-architecture` are non-negotiable. A request that needs breaking one is answered with the reason and the safe alternative, not implemented.
- Owning layer only; reuse before writing; no new dependency, layer or framework without explicit approval ([best practices](references/best-practices.md)).
- Read before editing; search every caller before changing a signature, a field, a step id or a fixed phrase.
- Match the surrounding code: ESM, dependency-free Node, erasable TypeScript, comments only for the *why*, a header comment on new modules.
- Never implement in the same response that presents the plan. A proposal counts as approved only when the user approved it explicitly; a proposal passed along by another agent is a plan to present, not an approval.
- No commit, push, tag or package version bump unless asked; when asked to commit, the pre-commit hook runs and must pass.
- Never write proposals, notes or scratch files into the repository; never read or modify project data to illustrate a framework change ([isolation](references/core/isolation-policy.md)).
- [Execution principles](references/core/execution-principles.md): never claim a check passed that did not run; label hypotheses.

## Validation criteria

- Proposal: every file to change is listed; non-trivial changes show the code; the impact covers every caller found by search; each affected invariant is named with how it is preserved; the verification commands are exact.
- Implementation: the diff matches the approved plan; no mirror drift; typecheck, check and tests pass (plus `npm run app:build` for desktop or UI); docs follow behavior; `README.md` and `README.pt-BR.md` in sync; no file outside the plan changed.

## Output format

### Proposal

In the conversation, in the user's language; code, identifiers and file names exactly as in the source. Direct, not simplistic: recommendation first, then what a maintainer needs to trust it.

1. **Summary** — what changes and why, in two or three lines.
2. **Type and layers** — the playbook used and the layers touched.
3. **Changes** — per file, in implementation order: path, what and why, and a `diff` block for any non-trivial change.
4. **Impact** — callers and consumers (each one, affected or not and why); rules and invariants (which, how preserved); users (visible behavior, compatibility of existing workspaces, projects, runs and custom agents); tests, docs, translations, mirrors, installer.
5. **Risks** — what could break and how it would show.
6. **Left out** — what was deliberately not done and when it would be worth adding.
7. **Verification** — the exact commands and any manual check.
8. **Decision** — approve, adjust or reject (when an implementation will follow).

### Report

Files changed (one line each); every check run with its result; what was not verified and why; follow-ups.

## Human approval points

- `approval`: before changing any file.
- During `implement`: any deviation that changes behavior, scope or a contract; adding a dependency; removing or renaming something users rely on (skill, agent, activity, command, field, fixed phrase); destructive operations (deleting files, discarding the user's uncommitted changes).
- Commit, push, release or version bump: only on explicit request.

## Error handling

- Baseline already failing: report it as pre-existing; fix it only if asked or if the change cannot be verified otherwise (then say so in the proposal).
- Check failing after the change: diagnose from the full output; fix the cause, not the check; after 3 failed attempts on the same cause stop, report the output and ask whether to keep or revert.
- `ERR_UNKNOWN_FILE_EXTENSION` for `.ts`: Node older than 22.18 — switch Node; not a code problem.
- The code moved since an approved proposal: present the delta and wait for approval again.
- Request conflicts with an invariant or a policy: explain which and why, offer the safe alternative.

## Completion criteria

- Read-only work: proposal (or review findings) delivered.
- Implementation: approved changes made, checks run and passing (or failures reported with output), report delivered.

## Persistence

No run folder: framework work is not a project activity. The proposal and the report live in the conversation; the change lives in the Git working tree of `<target-repo>/` (this repository), uncommitted unless the user asks. To continue in another session or tool, pass the proposal text again, or read the current diff (`git diff`) and compare it with the plan.
