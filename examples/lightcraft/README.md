# Example: lightcraft

Synthetic requests, run with the `lightcraft` skill loaded.

## Case 1 — product question

Request: "How do I render a photo with a changed exposure using the LightCraft CLI?"

- [ ] Names the repository https://github.com/storytold/lightcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for non-destructive exposure adjustment in LightCraft."

- [ ] Loads `project-context` with project id `lightcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
