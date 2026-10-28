# Moki for VS Code

The Moki window inside VS Code: projects, runs, context, notes, tags, search and the skills and agents library of the [Moki](https://github.com/Orsi88/moki) QA framework, with the AI tools (Claude Code, Codex, Gemini, Cursor Agent, Antigravity) opening in VS Code's own terminals with the request ready.

## Use it

1. Command Palette (Ctrl+Shift+P / Cmd+Shift+P) → **Moki: Open Moki**.
2. Pick a workspace and a project, as in the desktop app.
3. **Start** an activity: the AI tool opens in a VS Code terminal, in the Moki folder, with the request as its prompt.

The extension keeps the framework in `<Documents>/Moki`, the same folder as the Moki desktop app, so both show the same workspaces and projects. `QA_ROOT` chooses another folder. Updating the extension refreshes the framework files there; it never touches `workspace/` or `workspaces/`.

The AI tools are not part of the extension: install the ones you use. The helper commands the skills run (`npm run new-run`, `xlsx`, `docx`, `pdf`) need Node.js 22.18 or newer.

## Differences from the desktop app

| Desktop app | In VS Code |
|---|---|
| Terminal tabs inside the window | VS Code terminals ("Moki") |
| Note windows | Note editor tabs |
| Drop files on the project to add them to the inbox | Not available yet: copy them into the project's `inbox/` folder |
| Plan usage and memory in the status bar | Not shown |

## Security

The page is the desktop UI in a webview with scripts enabled and its own Content-Security-Policy: scripts, styles and images only from the extension's `dist/ui` folder, no network, no Node. Every request goes to the same service as the desktop app (`desktop/service.ts`, through `callService`), which validates each input; folders come only from VS Code's folder dialog; web links open after VS Code's link confirmation. AI tools start from the fixed tool list as a command plus arguments, never through a shell.

## Build it from the source

From the repository root, with Node.js 22.18 or newer:

```bash
npm install
npm run vscode:build     # the UI, the extension in ide/vscode/dist, the framework copy
npm run vscode:package   # release/moki-<version>.vsix
```

Try it without installing: `code --extensionDevelopmentPath="$PWD/ide/vscode"` opens an Extension Development Host that uses the repository as the Moki folder. Install the package with `code --install-extension release/moki-<version>.vsix`.

Keep `version` in `ide/vscode/package.json` equal to the root `package.json`; the build stops when they differ. How it fits the rest of Moki: `skills/moki-architecture/references/architecture.md` (layer 7b).
