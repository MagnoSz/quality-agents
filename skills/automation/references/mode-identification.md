# Mode identification

Decide from the request **and** the state of the target repository.

| Signal | Construction | Implementation | Evolution |
|---|---|---|---|
| No automation repository exists / empty folder | ✔ | | |
| Request names scenarios, pages, FLX ids to automate | | ✔ | |
| Request asks to review, refactor, stabilize, speed up, reorganize | | | ✔ |
| Repository exists and request is "set up automation" | ask | | ask |
| Repository exists, scenarios requested, but its structure blocks the work (no fixtures, no data strategy) | | ✔ (+ propose minimal Evolution items in the plan) | |

Rules:
- Inspect the repository (top-level structure, config files, test folders) before deciding; do not rely on the request alone.
- When two modes are plausible and the choice changes the work significantly, ask one question: "I understood X because Y. Confirm, or do you want Z?"
- A request may combine modes (e.g. implement scenarios and fix a fixture). Treat the main goal as the mode and list the secondary items in the plan for separate approval.
