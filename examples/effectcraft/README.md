# Example: effectcraft

Synthetic requests, run with the `effectcraft` skill loaded.

## Case 1 — product question

Request: "How do I render the EffectCraft demo project to MP4 without the app?"

- [ ] Names the repository https://github.com/storytold/effectcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for keyframe interpolation in EffectCraft."

- [ ] Loads `project-context` with project id `effectcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
