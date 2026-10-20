# Example: test-design

Input: [user-story.md](user-story.md) (en, synthetic).

Request:

> Design the tests for workspace/projects/acme-library/inbox/user-story.md (project acme-library).

## Acceptance checklist

Stage 1 (mapping):

- [ ] Uses the mapping format (`### 🔸 US:... / BR...` headers and `🔹 Scenario: ... – (Source: ...)` lines) with real ids (US-LIB-205, AC1–AC6, BR.020); no invented ids.
- [ ] Every AC and BR.020 maps to at least one scenario.
- [ ] Technique record present, each technique applied or "not applicable" with a reason.
- [ ] BVA scenarios around the lengths: 9, 10, 11, 12, 13, 14 digits.
- [ ] EP scenarios: digits only, with hyphens, with letters, with other symbols; X as last ISBN-10 character (valid) and X elsewhere (invalid).
- [ ] Notices the possible conflict **AC3 × BR.020** (AC3 rejects any non-digit, BR.020 allows X) and lists it as pending instead of choosing.
- [ ] AC4 message flagged as **not documented** (pending), not invented.
- [ ] Stops and asks for the OK; **no test cases yet**.

Stage 2 (after OK):

- [ ] Table with columns Source | Context | Scenario | Steps | Expected Result (en input → en labels).
- [ ] AC3 expected result quotes exactly "Invalid ISBN. Enter 10 or 13 digits."
- [ ] AC4 expected result contains **[MESSAGE TO CONFIRM]** instead of an invented text.
- [ ] Concrete values (e.g. `978316148410`, 12 digits), not "an invalid ISBN".
- [ ] `test-cases.json` passes `npm run check-output -- test-cases <run>/outputs/test-cases.json --source examples/test-design/user-story.md`.
- [ ] The exported xlsx opens with one sheet "Test Cases" and the five columns.
