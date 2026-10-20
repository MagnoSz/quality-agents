# Proposed improvements

Suggestions **not applied** to the migrated skills. Each needs a team decision before it changes any skill.

| # | Skill | Proposal | Why |
|---|---|---|---|
| P1 | requirements-review | Add a stable id for each interview question (e.g. `Q-001`) linked to the REV item it resolves | Makes sheet 3 ↔ sheet 1 traceability checkable by script |
| P2 | requirements-review | Allow the team to return the matrix as Google Sheets/CSV export as well as xlsx | Teams that do not use Excel |
| P3 | requirements-review | Optional "short review" mode for trivial stories (static review + diagnosis only) | The full flow (matrix + returned matrix + PDF) is heavy for one-line changes |
| P4 | test-design | Add a priority column (risk) to the test-case template | The original applies risk-based testing in mapping but the export has no priority field |
| P5 | test-design | Add "Pré-condição" and "Dados de teste" columns | Independent cases usually need explicit preconditions and data |
| P6 | test-design | Accept the requirements-review Final Definitions Report as the primary input when available | Avoids designing tests from outdated story text |
| P7 | failure-analysis | Add an optional "Correlation id / request id" field to the input template | Speeds up locating the right log lines |
| P8 | failure-analysis | Optional output block formatted for the team's defect tracker | Reduces copy/paste into the tracker |
| P9 | framework | Pin a test-management integration (via MCP) for the planned documentation skill | Needed before the documentation skill can be implemented |
