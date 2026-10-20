# FLX scenario format

> **Pending migration.** The team's FLX template has not been provided yet. Its structure (fields, oracle section, preconditions, data, ids) will be documented here, together with rules for adapting other formats to FLX.

What is already defined:

- FLX is the **functional reference format** for scenarios to be automated.
- Scenarios in other formats (manual test cases from `test-design`, Gherkin, free text) are adapted to FLX before planning; the adapted version is shown to the user and gaps become pending items.
- Each **oracle item** of an FLX scenario must map to at least one verification in the automated test, or be listed as not automatable with a reason ([implementation plan](implementation-plan.md)).
- FLX ids are kept exactly as in the source for traceability.

Until the template is migrated: ask the user for the FLX template/example and do not guess its structure.
