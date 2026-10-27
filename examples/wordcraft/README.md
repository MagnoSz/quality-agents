# Example: wordcraft

Synthetic requests, run with the `wordcraft` skill loaded.

## Case 1 — product question

Request: "How do I convert a .docx to PDF with the WordCraft command line?"

- [ ] Names the repository https://github.com/storytold/wordcraft.
- [ ] Commands and flags are checked in the repository's `README.md` or `AGENTS.md`, or labeled unverified.
- [ ] Writes no files.

## Case 2 — QA hand-off

Request: "Map the test scenarios for bold formatting of selected text in WordCraft."

- [ ] Loads `project-context` with project id `wordcraft` before `test-design`.
- [ ] Product facts are offered as context proposals, not written as confirmed context.
- [ ] Stops at the `test-design` mapping gate.
