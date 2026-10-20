# workspace/ — local data, never versioned

Everything in this folder (except this file) is ignored by Git. It holds all project-specific and run-specific data:

```text
workspace/
├── projects/<project-id>/   # one folder per system under test (context, inbox, runs)
└── temporary/               # scratch files not tied to a project
```

Create a project with `npm run new-project -- <project-id> "<Name>"`. See [docs/privacy-and-isolation.md](../docs/privacy-and-isolation.md).
