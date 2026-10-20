# Workflow: failure-investigation

Pre-analyze an observed failure so developers can investigate quickly.

```json workflow
{
  "id": "failure-investigation",
  "title": "Failure pre-analysis",
  "status": "draft",
  "steps": [
    {
      "id": "context",
      "skill": "project-context",
      "description": "Identify the project; load log locations, affected module and integrations.",
      "gate": "none"
    },
    {
      "id": "pre-analysis",
      "skill": "failure-analysis",
      "description": "Validate mandatory information, analyze the log, deliver the pre-analysis.",
      "dependsOn": ["context"],
      "gate": "input",
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/"]
    }
  ]
}
```

## Gates

- **`pre-analysis` (input)**: if any mandatory field is missing, the skill asks for exactly the missing fields and waits. Nothing is analyzed until they arrive.

## Future integrations

Automatic log retrieval (log platforms, CI artifacts, MCP servers) is not implemented. When added, it will be an optional step before `pre-analysis` that writes the retrieved log to the run's `inputs/` folder; the mandatory-information check stays unchanged.
