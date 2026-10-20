# Workflow: requirements-to-tests

Review one or more user stories and, once the review is approved, design their tests.

Example request: "Review this story, identify gaps and, once approved, map the test scenarios."

```json workflow
{
  "id": "requirements-to-tests",
  "title": "Requirements review followed by test design",
  "status": "draft",
  "steps": [
    {
      "id": "context",
      "skill": "project-context",
      "description": "Identify the project; onboard or retrieve context for review and test design.",
      "gate": "none"
    },
    {
      "id": "review",
      "skill": "requirements-review",
      "description": "Full requirements review, including its own internal gates (consolidation, returned matrix, final report).",
      "dependsOn": ["context"],
      "gate": "approval",
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/"]
    },
    {
      "id": "test-design",
      "skill": "test-design",
      "description": "Scenario mapping, approval, detailed test cases, export.",
      "dependsOn": ["review"],
      "gate": "approval",
      "outputs": ["workspace/projects/<project-id>/runs/<run-id>/outputs/"]
    },
    {
      "id": "context-update",
      "skill": "project-context",
      "description": "Offer confirmed general definitions for promotion to project context.",
      "dependsOn": ["test-design"],
      "gate": "approval",
      "optional": true
    }
  ]
}
```

## Gates

- **After `review`**: test design starts only when the user explicitly approves moving on. Present the QA verdict (APTA / APTA COM RESSALVAS / NÃO APTA, or equivalents in the deliverable language) and the open items. If the verdict is NÃO APTA, recommend not proceeding; proceed only if the user explicitly decides so, and record that decision with its reason.
- The user may approve test design after the QA Review Matrix stage instead of waiting for the final report; record which review state was reached.
- **After `test-design`**: the skill's own gate (approval of the scenario mapping before detailing) still applies; the workflow gate is the user accepting the final test cases.

## Context handed to each step

- `review`: the stories and related documents, plus project context per the retrieval map.
- `test-design`: the stories, the review outputs (final definitions take precedence over the original story text where they differ, and are cited as the source), and project context.
