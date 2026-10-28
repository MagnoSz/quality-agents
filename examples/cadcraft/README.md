# Example: cadcraft

Synthetic requests, run with the `cadcraft` skill loaded.

## Case 1 — product question

Request: "How do I convert a DWG drawing to PNG with CADCraft?"

- [ ] Names the repository https://github.com/storytold/cadcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for layer visibility and object snaps in CADCraft."

- [ ] Loads `project-context` with project id `cadcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
