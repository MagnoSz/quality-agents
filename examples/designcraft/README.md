# Example: designcraft

Synthetic requests, run with the `designcraft` skill loaded.

## Case 1 — product question

Request: "How do I render every page of the DesignCraft sample magazine headless?"

- [ ] Names the repository https://github.com/storytold/designcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for text frames flowing across pages in DesignCraft."

- [ ] Loads `project-context` with project id `designcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
