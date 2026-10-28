# Example: vectorcraft

Synthetic requests, run with the `vectorcraft` skill loaded.

## Case 1 — product question

Request: "How do I export a VectorCraft file to PDF headless?"

- [ ] Names the repository https://github.com/storytold/vectorcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for path editing in VectorCraft."

- [ ] Loads `project-context` with project id `vectorcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
