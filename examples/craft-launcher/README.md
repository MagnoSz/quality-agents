# Example: craft-launcher

Synthetic requests, run with the `craft-launcher` skill loaded.

## Case 1 — product question

Request: "Where does ArtCraft Launcher install WordCraft on Linux?"

- [ ] Names the repository https://github.com/storytold/craft-launcher.
- [ ] Answer comes from the README's install locations (or `crates/native/src/install.rs`), checked or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for updating an installed app in ArtCraft Launcher."

- [ ] Loads `project-context` with project id `craft-launcher` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
