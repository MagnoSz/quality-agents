# Workflow: test-evidence

Assemble the evidence of an executed test end to end: source item and Jam recordings, then the spreadsheet and the Word document in the project's models.

```json workflow
{
  "id": "test-evidence",
  "title": "Test evidence",
  "status": "draft",
  "steps": [
    {
      "id": "context",
      "skill": "project-context",
      "description": "Identify the project; load the tracker and MCP servers (environments-and-tools) and the evidence models (conventions).",
      "gate": "none"
    },
    {
      "id": "collection",
      "skill": "evidence-collection",
      "description": "Get the work item, the Jam recordings and the prints; consolidate evidence.json; the QA approves statuses and associations.",
      "dependsOn": ["context"],
      "gate": "approval",
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/evidence.json"]
    },
    {
      "id": "sheet",
      "skill": "evidence-sheet",
      "description": "Spreadsheet, one row per test case, in the attached model, the project standard or the default layout.",
      "dependsOn": ["collection"],
      "gate": "none",
      "optional": true,
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/"]
    },
    {
      "id": "document",
      "skill": "evidence-document",
      "description": "Word document with the images step by step, in the attached model, the project standard or the default structure.",
      "dependsOn": ["collection"],
      "gate": "none",
      "optional": true,
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/"]
    }
  ]
}
```

## Gates

- **`collection` (approval)**: the QA approves the consolidated evidence — statuses, image associations, divergences — before any deliverable is produced. Nothing is generated from unapproved evidence.
- **Inside `sheet` and `document`**: a new or changed model needs its mapping/outline approved once; an approved project standard skips it.

`sheet` and `document` are optional: the QA may ask for only one. By default both run, in this order.
