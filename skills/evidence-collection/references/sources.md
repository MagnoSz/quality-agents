# Evidence sources

## Test description (tracker)

1. Check the project's `context/environments-and-tools.md` and `project.json` (`tools`) for the tracker and whether an MCP server is configured for it. Use only that one.
2. With an id (for example `142`, `LIB-142`, a work item URL) and an MCP available, read the item and, when present, its linked test cases with their steps and expected results, acceptance criteria and attachments list. Read-only: never update the item, add comments or change states.
3. Without MCP, ask the QA to paste the item or attach its export (Azure DevOps "Export to CSV/Excel" of a query, Jira "Export Word/XML", a `.docx`/`.pdf`, or a screenshot). Word files in the inbox may already have a text copy in `inbox/.extracted/`.
4. Save what was used as `inputs/work-item.md`: system, id, type, title, URL, state, description, steps with expected results, acceptance criteria. Keep the original wording.

Azure DevOps test case steps often come as HTML or XML (`<steps><step><parameterizedString>…`): keep the text, drop the markup.

## Jam

A Jam link looks like `https://jam.dev/c/<id>`.

Always record the link. With a Jam MCP server available, read for each recording:

| Data | Use |
|---|---|
| Title, creation date/time, author, page URL, browser/OS, device | `execution` fields and notes; cross-check with the reported date and environment |
| User events (clicks, inputs, navigation) with timestamps | Steps actually performed; map them to the source steps |
| Console logs (errors and warnings) | `consoleErrors`, with time and step |
| Network requests (failed or 4xx/5xx) | `networkErrors`: method, path, status, time — never headers, cookies or bodies with personal data |
| Screenshots (when the server offers them) | Download to `evidence/` as `<tc-id>-jam-<nn>.png` |
| Transcript / description written by the author | Notes |

Save a summary per recording as `inputs/jam-<first 8 chars of the id>.md`: link, metadata, mapped steps, masked errors.

Without the MCP, ask the QA for the actual result of each case; the link stays as the recording evidence. Do not describe a recording you could not read.

## Prints

- Accept `.png` and `.jpg`/`.jpeg` (the Word export embeds only these). Other formats: ask the QA to convert them.
- Association order: name of the file → QA's statement → proposal from reading the image (marked `proposed`, confirmed at the gate).
- Keep the original file untouched in the inbox; the run gets a renamed copy.

## Masking

Before saving any log line or request: replace values of `Authorization`, `Cookie`, `Set-Cookie`, `token`, `password`, `secret`, `apiKey`, CPF/SSN, e-mails and phone numbers with `***`.
