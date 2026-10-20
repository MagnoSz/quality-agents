# Architecture principles

> **Pending migration.** This file will be completed with the generic principles extracted from the team's reference automation project (Playwright). Only **architecture** is extracted — never business rules, data, URLs or names of the reference system. The topics below are the agreed scope; their content must come from the reference project, not be invented.

Default stack: Playwright with TypeScript/JavaScript, organized so other frameworks can be added later.

| Topic | To be extracted from the reference project |
|---|---|
| Spec organization | Folder layout, naming, grouping by module/feature, tagging |
| Spec / Flow / Utils separation | Responsibility of each layer; what a spec may and may not contain; how flows compose actions; what belongs in utils |
| Component reuse | How shared components are discovered, named and extended |
| Fixtures | Which fixtures exist, scope (test/worker), composition |
| Data preparation | How test data is created (API, UI, seeds), ownership and isolation |
| Idempotent bootstrap | How environments/data are prepared so repeated runs give the same result |
| Scenario independence | How each test runs alone and in any order |
| Execution strategies | Projects, parallelism, sharding, retries policy, tags/grep |
| Diagnostics | Traces, screenshots, videos, logs, failure classification |
| Pipelines and reports | CI configuration, report formats, publishing, notifications |

Until this file is completed, Construction and Evolution must not present these topics as the "reference architecture".
