# Example: evidence-document

Prerequisite: the approved `evidence.json` of [examples/evidence-collection](../evidence-collection/README.md), case 2, with its two prints.

## Case 1 — default structure

Request: "Generate the evidence document."

- [ ] Uses the default structure: title, identification table, summary table, one section per test case (new page), steps table, images with captions `Figure 1 — TC-1001, step 3: Confirm`, pending items.
- [ ] `npm run docx -- inspect` on the result shows 2 images, no placeholder and the Jam link.

## Case 2 — model with placeholders

Create a Word model with a logo in the header, a cover paragraph `Evidence of {{workItem}} — executed on {{executedAt}}`, a paragraph with only `{{content}}` and a signature line below it. Attach it.

- [ ] Shows the outline (placeholders mapped, test cases where `{{content}}` is) and waits for approval.
- [ ] The docx keeps the header logo, the cover and the signature line; the test cases are between them; no `{{` left.

## Case 3 — example document as model

Attach a filled evidence document from another delivery (no placeholders).

- [ ] Says the model has no placeholders, reproduces its sections and tables with the new evidence, keeps header, footer and styles; none of the old content remains.
