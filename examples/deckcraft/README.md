# Example: deckcraft

Synthetic requests, run with the `deckcraft` skill loaded.

## Case 1 — product question

Request: "How do I render the DeckCraft sample deck to images?"

- [ ] Names the repository https://github.com/storytold/deckcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for slide transitions in DeckCraft."

- [ ] Loads `project-context` with project id `deckcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
