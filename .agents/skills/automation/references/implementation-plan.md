# Technical implementation plan

> **Pending migration.** The quality and depth of plans will be calibrated against the team's reference implementation plan (a real plan document provided by the team). Its generic structure and level of detail will be captured here — not its system-specific content.

Minimum content already required (from the skill's procedure):

1. **Scope** — scenarios (ids, sources), mode, target repository and branch.
2. **Context used** — rules, permissions, states, configurations involved, with sources; gaps.
3. **Repository analysis** — relevant existing structure and conventions.
4. **Reuse** — existing components used as-is; components extended (with consumers affected).
5. **Files and methods** — new/changed files, per layer, with the methods to create/change and their responsibility.
6. **Data strategy** — creation, isolation, cleanup, idempotency, per scenario.
7. **Oracle → verification mapping**:

   | Scenario | Oracle item | Verification (assertion) | Layer/file | Notes |
   |---|---|---|---|---|

8. **Execution** — how it will be run and validated (selection, environment, evidence).
9. **Risks and open points** — pending items needing confirmation.
10. **Out of scope** — what will not be done.

Save as `implementation-plan.md` in the run's outputs folder and present it for approval before coding.
