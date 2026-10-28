# Example: figcraft

Synthetic requests, run with the `figcraft` skill loaded.

## Case 1 — product question

Request: "How do I export a FigCraft file to SVG from the command line?"

- [ ] Names the repository https://github.com/storytold/figcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for auto layout in FigCraft."

- [ ] Loads `project-context` with project id `figcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
