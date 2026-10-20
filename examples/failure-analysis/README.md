# Example: failure-analysis

Two synthetic inputs:

- [incomplete-report.txt](incomplete-report.txt) — missing **moment of failure** and **evidence date/time**.
- [complete-report.txt](complete-report.txt) — all mandatory information.

## Case 1 — incomplete

Request: paste the content of `incomplete-report.txt`.

- [ ] No analysis at all.
- [ ] Reply is exactly the missing-information message listing only the two missing fields. Save the reply as `response.txt` and run:
  `npm run check-output -- missing-info response.txt --expect "moment,date"`
  (use `--expect "momento,data"` if the reply is in pt-BR).

## Case 2 — complete

Request: paste the content of `complete-report.txt`.

- [ ] Output starts with `[PRE-ANALYSIS]` and has Summary, Failure point, Evidence, Hypothesis, Direction, Impact in order. Save as `pre-analysis.txt` and run:
  `npm run check-output -- pre-analysis pre-analysis.txt`
- [ ] Failure point: `RenewalService.adjustForHolidays` (RenewalService.java:118).
- [ ] Evidence quotes the `NullPointerException` and the time `2026-10-14 10:42:07`, consistent with the reported 14/10/2026 10:42.
- [ ] Hypothesis worded as probable (e.g. holiday lookup returns null when the date is only in the "municipal" calendar), **not** as a confirmed cause.
- [ ] Direction tells the developer what to check (calendar selection in `HolidayRepository`, null handling at line 118).
- [ ] Short — no long explanations, no repetition of the input.
