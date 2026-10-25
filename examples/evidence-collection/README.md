# Example: evidence-collection

Synthetic input: [work-item.md](work-item.md) (two linked test cases). Images: any two PNG files you create (for example screenshots of any page), named `TC-1001_step-3.png` and `TC-1002_step-2.png`, placed in the project inbox. No Jam MCP is needed: use any Jam-like link, for example `https://jam.dev/c/00000000-0000-0000-0000-000000000001`.

## Case 1 — incomplete

Request:

> Assemble the evidence of workspace/projects/acme-library/inbox/work-item.md (project acme-library). Jam: https://jam.dev/c/00000000-0000-0000-0000-000000000001

- [ ] Nothing is consolidated; the reply is the missing-information message listing only: executed by, execution date/time, environment, and the actual result and status of each test case.
- [ ] Without a Jam MCP, it says the recording could not be read and keeps the link as reference; it does not describe the recording.

## Case 2 — complete

Answer: "Ana Lima, 24/10/2026 14:30, QA. TC-1001 passed as expected. TC-1002 failed: the loan was renewed and no message was shown. Prints are in the inbox."

- [ ] `evidence.json` has TC-1001 and TC-1002 with the official ids (no `TMP-`), steps and expected results copied from the work item (messages "Loan renewed." and "Overdue loans cannot be renewed." quoted unchanged).
- [ ] TC-1001 `Passed`, TC-1002 `Failed`, both `statusOrigin: qa`.
- [ ] Prints copied to the run's `evidence/` as `TC-1001-01.png` (step 3) and `TC-1002-01.png` (step 2).
- [ ] The Jam link is attached to a test case only if the QA said which one; otherwise it is asked or listed as pending.
- [ ] Stops at the review gate with the summary table; no spreadsheet or document yet.
