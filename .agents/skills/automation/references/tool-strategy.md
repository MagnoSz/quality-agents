# Tool selection strategy

## 1. Discover before planning

At the start of each run, check which capabilities this environment actually has and record them in `state.json` (`results` → `capabilities`):

| Category | How to check |
|---|---|
| Knowledge MCP | Tools exposed by connected MCP servers (wiki/documentation/drive). Also check `project.json` → `knowledgeSources` for the expected server name. |
| Browser / Playwright MCP | Browser automation tools exposed by an MCP server |
| Code tools | Ability to read/write files in the target repository path |
| Execution | Ability to run shell commands (`node`, `npx playwright test`...) in the target repository |

Tell the user which categories are available and which fallbacks will apply.

## 2. Knowledge sources

- Use the sources the user indicates (knowledge base, space/project, pages/folders, scenarios, reference documents). Defaults may come from `project.json` → `knowledgeSources`.
- Retrieve selectively: open the indicated pages; follow a link only when it is needed to understand a scenario, rule or oracle item. **Never crawl the whole base.**
- Record each source consulted (title, id/URL, section) in the run's inputs list.
- If a source is not accessible, say so and ask for the content. **Never claim to have read a source you could not access**, and never fill gaps with invented documentation.
- Data policy: knowledge retrieved via MCP stays in the run folder; nothing is sent to other external services without authorization.

## 3. Browser / Playwright MCP

Use for: locating elements, confirming dynamic behavior, checking states that documentation does not describe. Do not use it to decide expected results. Prefer the target project's existing page abstractions over newly discovered selectors.

## 4. Code tools

- Read the target repository selectively (structure first, then the files relevant to the plan).
- Write only files listed in the approved plan.

## 5. Execution

- Run the narrowest test selection that validates the change, then the affected suite.
- Capture evidence (reports, traces, screenshots) into the run's evidence folder.
- Never run against shared/production-like environments without approval.

## Fallbacks

| Missing | Fallback |
|---|---|
| Knowledge MCP | User exports/pastes the pages |
| Browser MCP | User provides screenshots/HTML; selectors marked "unverified" in the plan |
| Code tools | Deliver complete files or patches for the user to apply |
| Execution | User runs the given commands and shares the output; results reported as "executed by user" |
