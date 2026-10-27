# Example: soundcraft

Synthetic requests, run with the `soundcraft` skill loaded.

## Case 1 — product question

Request: "How do I check the audio health of the SoundCraft demo session?"

- [ ] Names the repository https://github.com/storytold/soundcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for bouncing a mix in SoundCraft."

- [ ] Loads `project-context` with project id `soundcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
