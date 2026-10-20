# Workflow: quality-lifecycle

End-to-end quality cycle for a change. Steps that depend on planned skills are optional and are skipped (with a notice) until those skills exist.

```json workflow
{
  "id": "quality-lifecycle",
  "title": "Quality lifecycle for a change",
  "status": "draft",
  "steps": [
    { "id": "context", "skill": "project-context", "description": "Identify project, load or build context.", "gate": "none" },
    { "id": "review", "skill": "requirements-review", "description": "Preventive review of the stories.", "dependsOn": ["context"], "gate": "approval" },
    { "id": "test-design", "skill": "test-design", "description": "Scenario mapping and test cases.", "dependsOn": ["review"], "gate": "approval" },
    { "id": "documentation", "skill": "documentation", "description": "Propose updates to the official scenario base (planned).", "dependsOn": ["test-design"], "gate": "approval", "optional": true },
    { "id": "automation", "skill": "automation", "description": "Implement the approved scenarios in the target automation repository (pending migration).", "dependsOn": ["test-design"], "gate": "approval", "optional": true },
    { "id": "smoke-test", "skill": "smoke-test", "description": "Targeted pre-validation of the delivered change (planned).", "dependsOn": ["test-design"], "gate": "approval", "optional": true },
    { "id": "failure-analysis", "skill": "failure-analysis", "description": "Pre-analysis of failures found in any execution.", "dependsOn": ["test-design"], "gate": "input", "optional": true },
    { "id": "context-update", "skill": "project-context", "description": "Promote confirmed general definitions.", "dependsOn": ["review"], "gate": "approval", "optional": true }
  ]
}
```

## Notes

- `failure-analysis` runs only when an execution produced a failure and the user provides the mandatory information.
- A passing smoke test never means the change is fully validated; it is reported with its coverage limits.
