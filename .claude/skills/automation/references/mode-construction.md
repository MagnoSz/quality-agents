# Mode: Construction

Create an automation project from scratch. **Do not create unnecessary complexity:** start with the smallest structure that supports the known needs and grows cleanly.

## Procedure

1. **Investigate the system's needs**: what must be automated first (critical flows, regression pain), who will run it, where (local, CI), how often.
2. **Identify the technical and functional context**: application type (web, API), authentication, multi-tenant/multi-language traits, environments, test data availability — from project context first; ask only for gaps.
3. **Analyze the available documentation** (indicated sources only).
4. **Propose the automation architecture** based on the [architecture principles](architecture-principles.md), adapted to the real needs. Default stack: Playwright with TypeScript (or JavaScript if the team prefers), organized so other frameworks can be added later.
5. **Define file organization and responsibilities** (which layer holds what).
6. **Plan fixtures, data, environments and configuration** (config per environment, secrets via environment variables — never committed).
7. **Define the preparation and cleanup strategy** (idempotent bootstrap, data isolation per test).
8. **Plan execution, diagnostics and reports** (projects/browsers, parallelism, retries policy, traces/screenshots/videos on failure, report format, CI pipeline).
9. **Present the architectural project for approval** — structure tree, responsibilities, decisions with reasons, what was deliberately left out, and the documentation/AI-guidance files that will be created.
10. **Create the approved structure** in the target repository.
11. **Write the project documentation and AI guidance** ([target project docs](target-project-docs.md)): `README.md`, `docs/architecture.md`, `docs/decisions.md` (how it was built and why), `docs/how-to.md`, `docs/traceability.md`, `AGENTS.md`, `CLAUDE.md`. The repository must be usable with any AI tool on its own, without Moki.
12. **Implement minimal examples and checks**: one representative spec using the layers end to end, plus lint/type check if adopted.
13. **Validate that the structure works**: install, run the example locally (and in CI if configured), confirm reports and diagnostics are produced, and execute every command documented in `README.md`/`AGENTS.md`. Report real results.

## Approval

Step 9 is a gate. Nothing is created in the target repository before approval. Changes to the approved architecture during steps 10–13 require a new approval (and a new entry in `docs/decisions.md`).

The project is not complete without its documentation and AI guidance files — an undocumented structure fails validation.
