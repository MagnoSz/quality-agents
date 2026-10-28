# Example: filmcraft

Synthetic requests, run with the `filmcraft` skill loaded.

## Case 1 — product question

Request: "How do I list every FilmCraft engine command?"

- [ ] Names the repository https://github.com/storytold/filmcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for trimming clips on the timeline in FilmCraft."

- [ ] Loads `project-context` with project id `filmcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
