# Quality Agents

🇧🇷 [Leia em português](README.pt-BR.md)

<p align="center"><img src="app/public/hero.png" alt="Quality Agents" width="280" /></p>

A portable library of **AI agent skills for software quality engineering**. Clone it once, register each system you test, and run the same QA activities — requirements review, test design, failure analysis — with Claude Code, Cursor, Codex, ChatGPT, claude.ai, Gemini or other AI tools.

This guide is written for QA professionals. No programming knowledge is needed: you will copy a few commands, open a folder in your AI tool and talk to it in plain language.

---

## Contents

1. [What it is (and what it is not)](#1-what-it-is-and-what-it-is-not)
2. [Key concepts in 2 minutes](#2-key-concepts-in-2-minutes)
3. [Install (once per computer)](#3-install-once-per-computer)
4. [Choose how you will use it](#4-choose-how-you-will-use-it)
5. [Quick start: your first activity in 10 minutes](#5-quick-start-your-first-activity-in-10-minutes)
6. [Register a system you test (project)](#6-register-a-system-you-test-project)
7. [Skill guides, step by step](#7-skill-guides-step-by-step)
8. [Workflows: several activities in sequence](#8-workflows-several-activities-in-sequence)
9. [Stop and resume an activity](#9-stop-and-resume-an-activity)
10. [Tool-by-tool setup](#10-tool-by-tool-setup)
11. [Where every file goes](#11-where-every-file-goes)
12. [Privacy and isolation](#12-privacy-and-isolation)
13. [Command reference](#13-command-reference)
14. [Troubleshooting](#14-troubleshooting)
15. [Updating the framework](#15-updating-the-framework)
16. [Adding a new skill](#16-adding-a-new-skill)
17. [Contributing](#17-contributing)
18. [Repository map](#18-repository-map)

---

## 1. What it is (and what it is not)

**It is**

- A set of **skills**: written instructions, in the open [Agent Skills](https://agentskills.io) format, that tell an AI exactly how to perform a QA activity — the steps, the rules, the output format and where it must stop for your approval.
- A **project context** mechanism: each system you test gets its own folder with its glossary, business rules, modules and conventions. The same skills then work for any application.
- A **persistence** mechanism: every activity is recorded in files, so you can stop and resume later — even in a different AI tool.

**It is not**

- Not an application, chatbot, website, server or database. There is nothing to deploy or log into.
- Not tied to one AI vendor. The AI tool you already use does the work.
- Not a replacement for you. Decisions, approvals and responsibility stay with the QA professional.
- Not a place for your project data. Everything about your systems stays in the `workspace/` folder on your computer, which is never uploaded to this repository.

### Available skills

| Skill | What it does | Status |
|---|---|---|
| `requirements-review` | Reviews user stories before development: ambiguities, contradictions, gaps, rule interactions, risks. Interactive interview (one question at a time), QA Review Matrix (Excel), Final Definitions Report (PDF). Never writes test cases. | draft |
| `test-design` | Maps test scenarios, waits for your OK, then writes detailed manual test cases and exports them to Excel. | draft |
| `failure-analysis` | Short pre-analysis of an error from your description and the log, to point developers to the probable cause. | draft |
| `project-context` | Creates and maintains the knowledge about each system you test. | draft |
| `qa-orchestrator` | Chains activities ("review, then design the tests"), enforces approvals, resumes interrupted work. | draft |
| `automation` | Automation engineering: builds new automation projects (Playwright + TypeScript first) already documented and AI-ready, automates documented FLX scenarios in existing projects, and evolves existing projects. | pending migration |
| `documentation`, `smoke-test` | Planned for a future version. If you ask for them, the AI will tell you they are not available. | planned |

**draft** = complete and usable, still being validated across AI tools (see [docs/compatibility-tests.md](docs/compatibility-tests.md)). **pending migration** = fully defined, waiting for the team's reference material before it can run. **planned** = not available yet.

---

## 2. Key concepts in 2 minutes

| Term | Meaning |
|---|---|
| **Skill** | The instructions for one QA activity. You never need to open them — the AI reads them. |
| **Project** | One system you test (e.g. "Billing Portal"). Identified by a short id in lowercase with hyphens: `billing-portal`. |
| **Project context** | What the AI knows about a project: glossary, business rules, modules, flows, permissions, environments, conventions. Only definitions **you confirmed** are stored. |
| **Run** | One execution of an activity (e.g. "review of story US-310"). Each run has an id like `20261020-0930-requirements-review-us-310` and its own folder with inputs, outputs and a `state.json` file. |
| **state.json** | The "save game" of a run: current step, completed steps, pending questions, your approvals, files produced. It is what makes resuming possible. |
| **Approval gate** | A point where the AI must stop and wait for your explicit answer before continuing (e.g. "May I generate the QA Review Matrix?"). |
| **Workspace** | The `workspace/` folder on your computer where all project data and results live. Never versioned. |

### How it all fits together

```mermaid
flowchart TD
  U["QA (you)"] -->|"request in plain language"| T["AI tool<br/>Claude Code, Cursor, Codex, chat"]
  T -->|reads| A["AGENTS.md<br/>rules + skill catalog"]
  A --> O{"One activity<br/>or several?"}
  O -->|one| S["Activity skill<br/>requirements-review, test-design,<br/>failure-analysis, automation"]
  O -->|"several or resume"| W["qa-orchestrator<br/>workflow"]
  W --> S
  S <-->|"relevant context / proposals"| C["project-context<br/>workspace/projects/ID/context"]
  S -->|"state, outputs, evidence"| R["Run folder<br/>workspace/projects/ID/runs/RUN-ID"]
  S -.->|"approval gates"| U
```

> Diagrams in this README use [Mermaid](https://mermaid.js.org). GitHub renders them automatically; in VS Code install a Mermaid preview extension to see them.

---

## 3. Install (once per computer)

### 3.1 What you need

| Software | Why | Required? |
|---|---|---|
| **Git** | To download (clone) and update the framework | Yes |
| **Node.js 22.18 or newer** (LTS) | Runs the `qa` app and the helper commands: creating projects and runs, generating Excel and PDF, checking that no project data is committed | Strongly recommended (without it, the skills still work in your AI tool, but the app and those steps are not available) |
| **Microsoft Edge or Google Chrome** | Used in the background to create PDF reports | Only for PDF generation (Edge already comes with Windows) |
| An **AI tool** | Claude Code, Cursor, Codex, claude.ai, ChatGPT, Gemini... | Yes |

### 3.2 Install Git and Node.js

**Windows**
1. Git: download from https://git-scm.com/download/win and install with the default options.
2. Node.js: download the **LTS** installer from https://nodejs.org and install with the default options.
3. Close and reopen any terminal window.

**macOS**
1. Open the **Terminal** app and type `git --version`. If Git is missing, macOS offers to install it — accept.
2. Node.js: download the **LTS** installer from https://nodejs.org and install it.

**Linux**: install `git` and `nodejs` (version 22.18+) with your distribution's package manager.

Check the installation in a terminal (Windows: **PowerShell** or **Git Bash**; macOS/Linux: **Terminal**):

```bash
git --version
node --version
npm --version
```

Each command should print a version number. `node --version` must be `v22.18` or higher.

### 3.3 Download the framework

Choose a folder for it (for example your Documents folder) and run:

```bash
git clone https://github.com/Orsi88/quality-agents.git
cd quality-agents
```

If your team uses its own fork, clone that address instead (GitHub "Code" button → HTTPS).

### 3.4 Run the one-time setup

Still inside the `quality-agents` folder:

```bash
npm run setup
```

It takes about a minute. It:

1. installs the development tools (only inside this folder),
2. builds the desktop app,
3. creates your local `workspace/` folder,
4. turns on the protection that blocks accidental commits of project data or passwords.

It ends with `Done. Start Quality Agents with: npm run qa`. Run `npm run setup` again after each update (`git pull`).

### 3.5 Check that everything is fine

```bash
npm run check
```

Expected output ends with `Validation passed`, `Artifact check passed` and `Secret check passed`.

### 3.6 Install the `qa` command (recommended)

Still inside the `quality-agents` folder:

```bash
npm link
```

From now on you can type `qa` in **any** terminal folder to open the Quality Agents desktop app ([section 4.1](#41-the-desktop-app-qa)). If `npm link` fails with a permission error on macOS/Linux, use `sudo npm link`, or skip it and run `npm run qa` from the `quality-agents` folder instead.

> **Windows tip:** if PowerShell says *"running scripts is disabled on this system"* when you type `npm`, use **Git Bash** instead, or type `npm.cmd` instead of `npm`, or see [Troubleshooting](#14-troubleshooting).

---

## 4. Choose how you will use it

| If you use... | Mode | What changes |
|---|---|---|
| **Claude Code, Cursor or Codex** (tools that open a folder on your computer) | **Agent mode** — recommended | The AI reads the skills, your project context and your files directly, saves results in the right folders, and can create Excel/PDF. You only talk to it. |
| **claude.ai, ChatGPT, Gemini** (browser/desktop chat) | **Chat mode** | You upload the skills once, and in each activity you upload the needed files and save what the AI produces. See [10.4](#104-claudeai-chatgpt-gemini-and-other-chat-tools). |

And three ways to work, whatever the tool:

| Way | For whom |
|---|---|
| **The desktop app — `qa`**: a start screen with your projects, then an Obsidian-like workspace to browse, read and edit the project files and **open the project in your AI tool with the request ready**. | Everyone — the easiest way |
| **The terminal menu — `qa --terminal`**: project → activity → files → AI tool; prepares everything and opens your AI tool with the request ready. | Anyone who does not want to deal with folders and prompts |
| **Open the `quality-agents` folder** in your AI tool and ask in plain language | People comfortable with the AI tool |

### 4.1 The desktop app (`qa`)

Type `qa` (or use the shortcut, once the installer exists). Quality Agents opens in its own window — no browser, no server.

**Start screen** — your projects on the left; create a new one by just typing its name. The last project you used reopens automatically.

**Workspace** (like Obsidian):

| Area | What it does |
|---|---|
| **Left ribbon** | All projects · Open in your AI tool · Open the project folder · Refresh · Show/hide the side panel |
| **File tree** | *Context* (what the AI knows about the system), *Inbox* (files you give the AI), *Activities* (each review, test design or analysis, with date and a status dot), proposed updates and activity log |
| **Documents in tabs** | Markdown is shown formatted; **Ctrl+E** switches to editing, **Ctrl+S** saves, **Ctrl+W** closes. Word files show their text; JSON, text and images are previewed; Excel and PDF open in their own program |
| **Side panel** | For an activity: status, current step, pending items, approvals and the files produced, plus *Continue in your AI tool*. Otherwise: project overview and open activities |
| **Open in your AI tool** | Choose the activity and the inbox files, add a note, pick the tool: Claude Code, Codex, Gemini CLI or Cursor Agent open in a new terminal window; Cursor or VS Code open the folder with the request copied; ChatGPT / claude.ai / Gemini web get the request and the list of files to upload |

- **Live**: files the AI writes appear in the tree as soon as they are saved.
- **Word stories**: `.docx` files are converted to text automatically so any AI can read them.
- **Local and private**: everything comes from the files in `workspace/`; no account, no hosting, no database.
- How it is built (for contributors): [docs/desktop-app.md](docs/desktop-app.md).

Everything below describes **agent mode** first. Chat-mode differences are noted where relevant.

### 4.2 The terminal menu (`qa --terminal`)

`qa --terminal` is a small menu that runs in your terminal. **It has no AI of its own and calls no online service**: it only copies your files into the right project folder, writes the request for you, and opens the AI tool you already use.

```mermaid
flowchart TD
  START["Type qa --terminal in any terminal"] --> P{"Project"}
  P -->|existing| A
  P -->|new| NP["Asks id and name,<br/>creates the project folder"]
  NP --> A{"Activity<br/>unavailable skills are greyed out"}
  A -->|"review, tests, workflow,<br/>failure, context"| F["Files: type or drag paths<br/>copied to the project inbox"]
  A -->|"resume"| RUN["Pick an open run<br/>read from state.json"]
  F --> N["Optional extra instructions"]
  RUN --> N
  N --> L["Conversation language"]
  L --> T{"Open with<br/>tools not installed are greyed out"}
  T -->|"Claude Code, Codex,<br/>Cursor Agent, Gemini CLI"| OPEN["Opens the tool in quality-agents<br/>with the request already typed"]
  T -->|"Cursor editor"| CUR["Opens the folder,<br/>request copied to the clipboard"]
  T -->|"ChatGPT, claude.ai, Gemini web"| CHAT["Request copied,<br/>list of files to upload"]
  T -->|"Just show"| SHOW["Prints the request"]
```

Example session:

Use **↑/↓** to move, **Enter** to select (or type the option number), **Ctrl+C** to cancel. Each answer collapses after you choose it, so the screen stays clean. While a question is open it looks like this:

```text
┌  Quality Agents
│  Prepares your request and opens the AI tool you use. Your data stays in workspace/.
│
◇  Which project (system under test)?
│  billing-portal
│
◆  What do you want to do?
│  ● Review user stories  ambiguities, gaps, interview, matrix, report
│  ○ Design tests
│  ○ Review, then design tests
│  ○ Failure pre-analysis
│  ○ Project context
│  ○ Automation  (not available yet: pending-migration)
│  ○ Resume a run  (no open runs)
└  ↑/↓ move · Enter select · Ctrl+C cancel
```

A complete session, at the end:

```text
┌  Quality Agents
│
◇  Which project (system under test)?
│  billing-portal
│
◇  What do you want to do?
│  Review user stories
│
◇  Input file
│  C:\Users\me\Downloads\US-310.docx
│
│  ✔ File 1 → workspace/projects/billing-portal/inbox/US-310.docx
◇  Anything else the AI should know?
│  focus on permissions
│
◇  Conversation language
│  Portuguese (pt-BR)
│
◇  Open with
│  Claude Code
│
◇  Summary
│  Project   billing-portal
│  Activity  Review user stories
│  Files     workspace/projects/billing-portal/inbox/US-310.docx
│  Note      focus on permissions
│  Language  Portuguese (pt-BR)
│  Tool      Claude Code
│
◇  Open Claude Code now?
│  Yes
│
│  Request (also saved in workspace/temporary/last-prompt.txt):
│  Follow AGENTS.md. Project: billing-portal. Use the requirements-review skill to review the user stories in: ...
└  Opening Claude Code …
```

In terminals without color/arrow support (or when input is piped), `qa` automatically falls back to numbered menus. You can force it with `qa --plain`.

From there you continue the conversation in the AI tool as usual. `qa` remembers your last project, language and tool (stored in `workspace/`, never versioned). The last request is also saved in `workspace/temporary/last-prompt.txt`.

**Shortcut without menus** (all options on one line):

```bash
qa --project billing-portal --activity review --file ~/Downloads/US-310.docx --tool claude --lang "Portuguese (pt-BR)"
qa --project billing-portal --activity resume --run 20261020-0930-requirements-review-us-310 --tool codex
qa --help
```

| Option | Values |
|---|---|
| `--activity` | `review`, `tests`, `review-then-tests`, `failure`, `context`, `resume` |
| `--tool` | `claude`, `codex`, `cursor-agent`, `gemini`, `cursor`, `chat`, `print` |
| `--file` | Repeat for several files |
| `--run` | Run id, for `resume` |
| `--note` | Extra instructions |
| `--lang` | Conversation language, e.g. `English`, `"Portuguese (pt-BR)"` |

---

## 5. Quick start: your first activity in 10 minutes

This uses the fictional system **Acme Library** included in [examples/](examples/README.md).

> **Shortcut:** if you installed the `qa` command ([3.6](#36-install-the-qa-command-recommended)), type `qa --terminal` and follow the menu — it does steps 1 and 2 for you.

**Step 1 — Open the folder in your AI tool**
- Claude Code: in a terminal, `cd quality-agents` then `claude` (or open the folder in the VS Code extension / desktop app).
- Cursor: *File → Open Folder* → select `quality-agents`.
- Codex: in a terminal, `cd quality-agents` then `codex`.

**Step 2 — Ask for an activity in plain language**

Copy the example story into the project inbox (or simply ask the AI to read it from `examples/`), then type:

> Create the project Acme Library and run a failure analysis with the file examples/failure-analysis/complete-report.txt

**Step 3 — Watch what happens**

1. The AI confirms the project id (`acme-library`) and name, and creates `workspace/projects/acme-library/`.
2. It may ask one or two context questions — answer briefly or say "skip for now".
3. It creates a run, analyzes the report and answers with a block starting with `[PRE-ANALYSIS]` (or `[PRÉ-ANÁLISE]` if the project's deliverable language is `pt-BR`).
4. The result is saved in `workspace/projects/acme-library/runs/<run-id>/outputs/pre-analysis.txt`.

**Step 4 — Check the result objectively (optional)**

```bash
npm run check-output -- pre-analysis workspace/projects/acme-library/runs/<run-id>/outputs/pre-analysis.txt
```

You just used the framework. The next sections explain each part in detail.

---

## 6. Register a system you test (project)

### 6.1 Automatic (recommended)

Just mention the system when asking for an activity:

> Review this story for the **Billing Portal**.

If the project does not exist yet, the `project-context` skill:

1. Proposes an id (`billing-portal`) and asks you to confirm id and display name.
2. Creates the folder from the template.
3. Starts a **progressive interview**: one question at a time, starting with what the requested activity needs (for a review: what the system does, which modules are affected, whether it has multiple companies/tenants, multiple languages, configurable parameters, e-mails, audit trail...).
4. Stops as soon as the activity has the minimum it needs and tells you what is still missing. The rest is collected over time.

Tips for the interview:
- Answer "I don't know" freely — it is recorded as *unknown*, which is different from "not applicable".
- If you have documentation (functional manual, rule catalog), put it in the project's `inbox/` folder first. The AI reads it, proposes what it found, and asks you to confirm in batches instead of asking everything.
- The AI never asks for passwords. Never type one into the context.

### 6.2 Manual

```bash
npm run new-project -- billing-portal "Billing Portal"
```

Then fill in `workspace/projects/billing-portal/project.json` (or let the AI do it in the next activity).

### 6.3 What is inside a project folder

```text
workspace/projects/billing-portal/
├── project.json            # name, environments, repositories, tools, constraints, data-sharing policy
├── context/                # CONFIRMED knowledge only
│   ├── index.md            # list of context files (read first by the AI)
│   ├── overview.md         # purpose, users, scope
│   ├── glossary.md         # domain terms
│   ├── modules.md          # modules and screens
│   ├── actors-and-permissions.md
│   ├── business-rules.md   # rules with official ids and sources
│   ├── flows.md            # flows, states, transitions
│   ├── system-characteristics.md   # multi-company, languages, parameters, e-mails, audit... + team-specific checks
│   ├── integrations.md
│   ├── environments-and-tools.md   # URLs, repositories, where logs are (never credentials)
│   └── conventions.md      # deliverable language, id formats, templates, automation architecture
├── proposed-updates.md     # knowledge found during activities, waiting for your confirmation
├── activity-log.md         # one line per activity
├── inbox/                  # put your input files here
├── runs/                   # one folder per activity
└── temporary/
```

### 6.4 How the context grows

During any activity the AI may discover something that looks like a general rule of the system (for example, "only supervisors approve extensions"). It does **not** write it into `context/` directly. It adds it to `proposed-updates.md` and, at the end of the activity, asks you:

> Is this a general rule of the system, or specific to this story?

Only after your confirmation is it moved into the right `context/` file, with source and date. You can also ask at any time:

> Show me the pending context updates for Billing Portal.
> Add to the Billing Portal glossary: "Dunning" means the automated collection e-mail sequence.
> What do you know about Billing Portal permissions?

### 6.5 Team-specific checks

If your team always checks something particular to your system (for example a feature called "E-mail Accumulator"), record it in `context/system-characteristics.md` under **Project-specific review checks**. The review and test-design skills evaluate those checks every time, using your team's names.

### 6.6 Deliverable language

Deliverables are in **English** by default. To change it for one project, set in `workspace/projects/<project-id>/project.json`:

```json
"deliverableLanguage": "pt-BR"
```

Order of precedence: what you ask for in the activity → the project's `deliverableLanguage` → English. The conversation always follows the language you write in, and messages quoted from your documents stay in their original language. Available labels: `en` and `pt-BR` (the team's original process).

### 6.7 Sharing a project's context with your team (optional)

The context is plain Markdown and JSON. To share it, version **that project folder** in a separate **private** Git repository:

```bash
cd workspace/projects/billing-portal
git init
git add .
git commit -m "Billing Portal context"
git remote add origin <your-private-repository-url>
git push -u origin main
```

The project folder already contains a `.gitignore` that keeps `runs/`, `inbox/` and `temporary/` out, so activity results stay private and unversioned. Teammates clone that private repository into their own `workspace/projects/billing-portal/`. Never put project context in the public Quality Agents repository.

---

## 7. Skill guides, step by step

All skills share the same habits:

- The AI **identifies the project first** and loads only the context the activity needs.
- It creates a **run** and saves everything under `workspace/projects/<project-id>/runs/<run-id>/`.
- It **stops at approval gates** and waits. Words like "ok", "approved", "go ahead", "pode seguir" approve the gate in question; anything else is not approval.
- It **never invents** requirements, rules, messages or data — missing information becomes a pending item.
- It **talks to you in your language**, but **deliverables are in English by default** (the framework is international). To get deliverables in another language, set it per project — `"deliverableLanguage": "pt-BR"` in `project.json` — or ask for it in the activity ("generate the matrix in Portuguese"). Messages quoted from your documents are never translated. See [6.6](#66-deliverable-language).

### 7.1 Requirements review (`requirements-review`)

**When:** before development and before test design, to make sure a user story is clear, consistent and testable.

**You provide:** one or more user stories, plus anything related — business rules, acceptance criteria, screenshots, prototypes, flows. Put the files in the project's `inbox/`.

**How to start:**

> Review the user story workspace/projects/billing-portal/inbox/us-310.md of project billing-portal.

(In Claude Code you can also type `/requirements-review`. You can write the request in any language.)

**How it works:**

```mermaid
flowchart TD
  IN["User stories + related documents"] --> CHK{"Story provided?"}
  CHK -->|no| ASK["Ask for the story"]
  ASK --> IN
  CHK -->|yes| S1["Stage 1 - Static review<br/>reads everything, asks nothing yet"]
  S1 --> S2["Stage 2 - Initial diagnosis<br/>REV items, systemic checklist,<br/>impacts, prototyping need"]
  S2 --> S3["Stage 3 - Interview<br/>ONE question at a time"]
  S3 --> ANS["Incorporate the answer, cross-check<br/>all artifacts, update checklist"]
  ANS --> MORE{"More relevant<br/>questions?"}
  MORE -->|yes| S3
  MORE -->|no| S4["Stage 4 - Cross-validation"]
  S4 --> NEW{"New issue found?"}
  NEW -->|yes| S3
  NEW -->|no| G1{{"G1 - May I consolidate<br/>and generate the matrix?"}}
  G1 -->|approved| S5["Stage 5 - Consolidation + QA verdict<br/>QA Review Matrix.xlsx"]
  S5 --> G2{{"G2 - Wait for the team<br/>to return the matrix"}}
  G2 -->|"matrix returned"| S6["Stage 6 - Analyze returned matrix<br/>never alters team definitions"]
  S6 --> SUF{"Sufficiently<br/>defined?"}
  SUF -->|"no: conflict or gap"| S3
  SUF -->|yes| G3{{"G3 - May I generate the<br/>Final Definitions Report?"}}
  G3 -->|approved| S7["Stage 7 - QA Final Definitions Report.pdf"]
  S7 --> CLOSED(["Review formally closed"])
```

Hexagons are approval gates: the AI stops and waits for you.

**What happens, stage by stage:**

| Stage | What the AI does | What you do |
|---|---|---|
| 1. Static review | Reads everything before asking anything | Wait |
| 2. Initial diagnosis | Presents: stories analyzed, understanding, problems (`[REV-001]`, `[REV-002]`...), systemic checklist, apparent impacts, prototyping need. No verdict yet. | Read it |
| 3. Interview | Asks **one question at a time**, starting with contradictions, then ambiguities, fundamental rules, rule interactions, permissions... | Answer each question. Be specific: "whoever has permission" will be challenged ("which permission?"). If you don't know, say so. If you have a screenshot or prototype, attach it. |
| 4. Cross-validation | Re-checks everything with your answers; returns to the interview if something new appears | Answer remaining questions |
| **Gate G1** | Asks: *"I have completed the cross-validation and found no other relevant issues. May I consolidate the review and generate the QA Review Matrix?"* | Answer "yes" (or ask for changes) |
| 5. Consolidation | Summary, definitions, impacts, changes needed in the stories, pending items, **QA verdict** (READY / READY WITH CAVEATS / NOT READY), and the file **QA Review Matrix.xlsx** with 7 sheets | Download/open the Excel |
| **Gate G2** | Waits for the matrix to come back | Share the Excel with your team (PO, dev, analyst). Fill in answers for pending/blocked points. Save it in the run's `inputs/` folder or the project's `inbox/`, and tell the AI: "Here is the returned matrix." |
| 6. Returned matrix analysis | Reads all sheets, finds what changed, checks for new contradictions. Never alters your team's definitions. Returns to one-question interview if needed. | Answer if asked |
| **Gate G3** | Asks: *"The matrix is sufficiently consolidated for formalization. May I generate the Final Definitions Report in PDF?"* | Answer "yes" |
| 7. Final report | Generates **QA Final Definitions Report.pdf**: a consolidated specification (not meeting minutes) | Share with the team |

The review is formally closed only after the PDF. You can stop at any point and resume later ([section 9](#9-stop-and-resume-an-activity)).

**Results** (in `workspace/projects/<project-id>/runs/<run-id>/outputs/`): `review-matrix.json`, `QA Review Matrix.xlsx`, `final-report.md`, `QA Final Definitions Report.pdf`. With `deliverableLanguage: pt-BR` you get the team's original labels and names: *Matriz de Revisão QA.xlsx*, *Relatório Final de Definições QA.pdf*, verdicts APTA / APTA COM RESSALVAS / NÃO APTA.

**Check the matrix objectively:**

```bash
npm run check-output -- review-matrix workspace/projects/<project-id>/runs/<run-id>/outputs/review-matrix.json
```

### 7.2 Test design (`test-design`)

**When:** you need manual test cases for a story or change — ideally after the review.

**You provide:** user stories, business rules, acceptance criteria, screenshots, tables, flowcharts, notes. If a review was done, the AI uses its final definitions.

**How to start:**

> Map the test scenarios for workspace/projects/billing-portal/inbox/us-310.md

**How it works:**

```mermaid
flowchart TD
  IN["Stories, rules, criteria,<br/>screenshots, review outputs"] --> A["Analyze documents<br/>+ project context"]
  A --> M["Stage 1 - Scenario mapping"]
  M --> T["Consider ALL techniques<br/>EP, BVA, decision tables, risk,<br/>positive/negative, alternative and exception flows,<br/>acceptance-criteria coverage, ISO 25010"]
  T --> AP{"Applicable<br/>to this case?"}
  AP -->|yes| USE["Apply it: derive scenarios"]
  AP -->|no| REC["Record why not"]
  USE --> MAP["Mapping with sources<br/>+ pending items"]
  REC --> MAP
  MAP --> G{{"Gate - your OK"}}
  G -->|"adjust"| M
  G -->|OK| D["Stage 2 - Detailed test cases<br/>Source, Context, Scenario, Steps, Expected Result"]
  D --> MSG{"Exact message<br/>documented?"}
  MSG -->|yes| Q["Quote it exactly"]
  MSG -->|no| PEND["Mark MESSAGE TO CONFIRM"]
  Q --> X["Export Test Cases.xlsx"]
  PEND --> X
```

**What happens:**

1. **Stage 1 — Scenario mapping.** The AI lists scenarios grouped by story/rule, each with its origin:

   ```text
   ### 🔸 US:310 / RN.004 – Late fee calculation
   🔹 Scenario: Fee applied on the first day after due date – (Source: US:310 / RN.004)
   🔹 Scenario: No fee on the due date itself – (Source: Acceptance Criterion)
   ```

   It also lists which test techniques it applied (equivalence partitioning, boundary values, decision tables, risk, positive/negative, alternative/exception flows, acceptance-criteria coverage, ISO 25010) and why any did not apply, plus pending items (e.g. a message whose exact text is not documented).
2. **Gate — your OK.** Review the mapping. Ask for additions/removals, or say "OK, detail the test cases."
3. **Stage 2 — Detailed test cases** with the columns **Source | Context | Scenario | Steps | Expected Result**, concrete values (e.g. `17`, `18`, `19` around a limit of 18), exact messages in quotes when documented (kept in their original language), and `[MESSAGE TO CONFIRM]` when the text is not documented.
4. **Export** to `Test Cases.xlsx` (`Casos de Teste.xlsx` with pt-BR columns Origem | Contexto | Cenário | Passo a Passo | Resultado Esperado when the project's deliverable language is pt-BR).

**Check the test cases objectively** (verifies required fields, numbered steps, duplicates, and that every quoted message really exists in your documents):

```bash
npm run check-output -- test-cases workspace/projects/<project-id>/runs/<run-id>/outputs/test-cases.json --source workspace/projects/<project-id>/inbox/us-310.md
```

If your project uses a different test-case template, describe it in the project's `context/conventions.md`.

### 7.3 Failure analysis (`failure-analysis`)

**When:** you found an error and want to give developers a quick, focused direction.

**You provide** — copy the [input template](skills/failure-analysis/references/input-template.md) and fill it in:

| Field | Mandatory |
|---|---|
| Item description: flow, action executed, expected result, obtained result | Yes |
| Moment of failure (which step) | Yes |
| Date/time of the evidence (approximate) | Yes |
| Log: relevant excerpt with the error and stack trace | Yes |
| Observations: does it always happen? variations? | No |

**How to start:** paste the filled template (or save it in `inbox/` and point to it).

**How it works:**

```mermaid
flowchart TD
  IN["Filled input template"] --> V{"All 4 mandatory items?<br/>description, moment of failure,<br/>date/time, log"}
  V -->|no| MISS["Reply ONLY with the<br/>missing-information message"]
  MISS --> WAIT(["Wait for the missing fields"])
  WAIT --> IN
  V -->|yes| AN["Analyze, using the log<br/>as the main evidence"]
  AN --> TS{"Log time matches<br/>the reported time?"}
  TS -->|no| FLAG["Flag the mismatch<br/>under Evidence"]
  TS -->|yes| OUT["PRE-ANALYSIS block<br/>Summary, Failure point, Evidence,<br/>Hypothesis, Direction, Impact"]
  FLAG --> OUT
```

**What happens:**

- If any mandatory field is missing, the AI does **not** analyze. It answers only:

  ```text
  To start the pre-analysis, I need the following information:
  - [only the missing fields]
  ```

  (in your language — e.g. "Para iniciar a pré-análise, preciso das seguintes informações:")

- With everything provided, it returns a short notepad-style block:

  ```text
  [PRE-ANALYSIS]

  Summary:
  - ...
  Failure point:
  - ...
  Evidence:
  - ...
  Hypothesis:
  - ... (always as a probability, never as certainty)
  Direction:
  - ...
  Impact:
  - ...
  ```

  (pt-BR deliverables use the original labels: [PRÉ-ANÁLISE], Resumo, Ponto da falha, Evidência, Hipótese, Direcionamento, Impacto.)

Copy it into the defect or send it to the developer. Tip: record where your system's logs are in the project's `context/environments-and-tools.md` so the AI can point developers to the right place.

### 7.4 Project context (`project-context`)

Used automatically at the start of every activity.

```mermaid
flowchart TD
  R["Activity requested"] --> ID{"Project identified<br/>without ambiguity?"}
  ID -->|no| ASKP["Ask which project"]
  ASKP --> ID
  ID -->|yes| EX{"Project folder<br/>exists?"}
  EX -->|no| NEW["Confirm id and name,<br/>create folder from template"]
  NEW --> INT["Progressive interview<br/>one question at a time,<br/>prioritized by the activity"]
  INT --> MIN{"Minimum context<br/>for this activity?"}
  MIN -->|no| INT
  MIN -->|yes| HAND
  EX -->|yes| LOAD["Read project.json + context/index.md,<br/>load only the relevant files"]
  LOAD --> HAND["Hand relevant excerpts + gaps<br/>to the activity skill"]
  HAND --> ACT["Activity runs"]
  ACT --> PROP["New general knowledge goes to<br/>proposed-updates.md"]
  PROP --> CONF{{"You confirm?"}}
  CONF -->|yes| CTX["Written to context/<br/>with source and date"]
  CONF -->|no| REJ["Marked rejected,<br/>never recorded"]
```

Projects never mix: the AI reads and writes only inside the active project's folder.

You can also call it directly:

| You want to... | Say |
|---|---|
| See what is known | "What do you know about Billing Portal?" |
| Complete the onboarding | "Continue the Billing Portal onboarding." |
| Add a definition | "Add to Billing Portal business rules: RN.012 — ..." |
| Review pending proposals | "Show pending context updates for Billing Portal." |
| Fix a definition | "Change the Billing Portal glossary entry for 'Dunning' to ..." (the AI shows the old and new text and asks for confirmation) |

### 7.5 Orchestrator (`qa-orchestrator`)

Used when you ask for more than one activity, when you want to resume, or when it is not clear which skill applies. See [section 8](#8-workflows-several-activities-in-sequence).

### 7.6 Automation (`automation`) — pending migration

Defined, but not runnable until the team's reference material is migrated (reference automation project, FLX scenario template, reference implementation plan). Until then the AI explains this and stops. What it will do:

| Mode | You ask | It delivers |
|---|---|---|
| **Construction** | "Create an automation project for Billing Portal" | Architecture proposal for your approval → project structure in your automation repository → **documentation of the architecture and of how/why it was built** (`docs/architecture.md`, `docs/decisions.md`, `docs/how-to.md`) → **AI guidance files** (`AGENTS.md`, `CLAUDE.md`) so anyone can keep working on that project directly with any AI tool → minimal example test, validated by running it |
| **Implementation** | "Automate scenarios FLX-012 and FLX-013 from page X of our wiki" | Reads only the indicated documentation (via MCP when available) → implementation plan with oracle → assertion mapping for your approval → code reusing existing components → execution with real results → delivery and traceability report |
| **Evolution** | "Review our automation project" / "why are these tests flaky?" | Evidence-based findings (duplication, coupling, fragile selectors, shared data, diagnostics, missing docs) → incremental proposals with benefit and risk, one approval each → applied and verified one at a time |

```mermaid
flowchart TD
  REQ["Automation request"] --> CTX["Load project context<br/>+ discover available tools<br/>knowledge MCP, browser MCP, code, execution"]
  CTX --> MODE{"Which mode?<br/>request + repository state"}
  MODE -->|"no automation project"| C["Construction"]
  MODE -->|"scenarios to automate"| I["Implementation"]
  MODE -->|"review or improve"| E["Evolution"]
  C --> C1["Investigate needs,<br/>propose architecture"]
  C1 --> GC{{"Approve architecture"}}
  GC --> C2["Create structure + documentation<br/>architecture, decisions, how-to<br/>+ AGENTS.md and CLAUDE.md"]
  C2 --> C3["Minimal example,<br/>run and validate"]
  I --> I1["Read only the indicated docs, adapt to FLX,<br/>inspect repository, find reusable parts"]
  I1 --> I2["Plan: files, data strategy,<br/>oracle item to assertion mapping"]
  I2 --> GI{{"Approve plan"}}
  GI --> I3["Implement, run, diagnose<br/>never weaken assertions"]
  E --> E1["Inspect: duplication, coupling,<br/>fragile selectors, shared data, docs"]
  E1 --> E2["Incremental proposals<br/>with benefit and risk"]
  E2 --> GE{{"Approve each proposal"}}
  GE --> E3["Apply one at a time,<br/>run before and after"]
  C3 --> REP["Delivery + traceability report"]
  I3 --> REP
  E3 --> REP
```

Rules it always follows: plan and approval before changing code; never weakens assertions to make tests pass; expected behavior comes from documentation, not from what the screen shows; test code lives only in your automation repository, never in Quality Agents. Configure where your documentation lives in `project.json` → `knowledgeSources`.

### 7.7 Planned skills

`documentation` and `smoke-test` are not available yet. If you ask for them, the AI explains this and stops — it will not improvise.

---

## 8. Workflows: several activities in sequence

Describe the chain in one sentence:

> Review this story, identify the gaps and, once approved, map the test scenarios.

The orchestrator recognizes the workflow, shows you the plan with its gates, and runs:

```text
project-context → requirements-review (with its gates G1, G2, G3) → YOUR APPROVAL → test-design (mapping → YOUR OK → test cases)
```

```mermaid
sequenceDiagram
  actor QA
  participant O as qa-orchestrator
  participant PC as project-context
  participant RR as requirements-review
  participant TD as test-design
  QA->>O: Review this story and, once approved, map the scenarios
  O->>QA: Plan with steps and gates
  O->>PC: Identify project, load context
  PC-->>O: Relevant context + gaps
  O->>RR: Run the review
  RR-->>QA: Diagnosis, questions, matrix, report (gates G1, G2, G3)
  RR-->>O: QA verdict + open items
  O->>QA: Approve moving to test design?
  QA->>O: Approved
  O->>TD: Run test design
  TD-->>QA: Scenario mapping, asks for OK
  QA->>TD: OK
  TD-->>QA: Test cases + Excel
  O->>PC: Offer confirmed definitions as proposals
```

Rules:
- It never starts a step that depends on approval before you approve.
- At the review → test-design gate it shows the QA verdict and open items. If the verdict is NOT READY, it recommends not proceeding; it proceeds only if you explicitly decide so, and records your reason.

Available workflows:

| Workflow | Use when |
|---|---|
| [requirements-to-tests](skills/qa-orchestrator/references/workflows/requirements-to-tests.md) | Review a story, then design its tests |
| [failure-investigation](skills/qa-orchestrator/references/workflows/failure-investigation.md) | Pre-analyze a failure |
| [quality-lifecycle](skills/qa-orchestrator/references/workflows/quality-lifecycle.md) | Full cycle for a change (steps for planned skills are skipped for now) |

You can also ask for a custom sequence; the orchestrator shows it to you and asks for approval before starting.

---

## 9. Stop and resume an activity

You can stop at any moment — close the session, go home, switch tools. The AI keeps `state.json` updated at every step and every gate.

**See your activities:**

```bash
npm run runs -- billing-portal
```

```text
billing-portal  (2 runs)
  20261020-0930-requirements-review-us-310  status=awaiting-approval  step=cross-validation  pending=2  approvals=0
  20261021-1400-test-design-us-310          status=in-progress        step=mapping           pending=1  approvals=0
```

`status` tells you what the run is waiting for: `awaiting-approval` (your answer to a gate), `awaiting-input` (a file or information, e.g. the returned matrix), `blocked`, `in-progress`, `completed`, `cancelled`.

**Resume** — in the same tool or a different one:

> Resume run 20261020-0930-requirements-review-us-310 of billing-portal.

or simply:

> Continue the US-310 review of Billing Portal.

The AI reads `state.json`, reloads only the context needed, summarizes where you stopped (current step, pending items, last approval) and continues — without redoing finished steps.

**Life cycle of a run** (the `status` in `state.json`):

```mermaid
stateDiagram-v2
  state "in-progress" as in_progress
  state "awaiting-approval" as awaiting_approval
  state "awaiting-input" as awaiting_input
  [*] --> in_progress: run created
  in_progress --> awaiting_approval: gate reached
  awaiting_approval --> in_progress: approved or adjust requested
  in_progress --> awaiting_input: file or information needed
  awaiting_input --> in_progress: provided
  in_progress --> blocked: 3 failed attempts or no access
  blocked --> in_progress: unblocked
  in_progress --> completed: completion criteria met
  in_progress --> cancelled: stopped for good
  completed --> [*]
  cancelled --> [*]
```

**How resuming works across tools:**

```mermaid
flowchart LR
  T1["Tool A session<br/>e.g. Claude Code"] -->|"writes at every step and gate"| ST["state.json + outputs<br/>+ project context"]
  ST -->|"read explicitly on resume"| T2["Tool B session<br/>e.g. Cursor, Codex, or a chat with uploads"]
  T2 -->|"continues from currentStep"| ST
```

**Important:** AI tools do not share memory with each other. Resuming works because the AI **reads the files**. In chat tools, upload the run's `state.json` and the relevant context files, then ask to resume.

---

## 10. Tool-by-tool setup

### 10.1 Claude Code

1. Open the `quality-agents` folder: `cd quality-agents` then `claude`, or open it in the VS Code / JetBrains extension or the desktop app.
2. Everything loads automatically: `CLAUDE.md` (which includes `AGENTS.md`) and all skills from `.claude/skills/`.
3. Ask in plain language, or invoke a skill directly: `/requirements-review`, `/test-design`, `/failure-analysis`, `/project-context`, `/qa-orchestrator`.
4. To work with your system's code repository at the same time, add it as an extra folder: `claude --add-dir ../billing-portal-repo` (or `/add-dir ../billing-portal-repo` inside a session).

More: [adapters/claude-code.md](adapters/claude-code.md).

### 10.2 Cursor

1. *File → Open Folder* → `quality-agents`.
2. Cursor reads `AGENTS.md` and the skills automatically.
3. Use the Agent chat in plain language.
4. To include your system's repository: *File → Add Folder to Workspace*.
5. Known point to verify: Cursor may list each skill twice (it reads both `.agents/skills/` and `.claude/skills/`); they are identical.

More: [adapters/cursor/README.md](adapters/cursor/README.md).

### 10.3 OpenAI Codex (CLI / IDE / app)

1. `cd quality-agents` then `codex` (or open the folder in the Codex IDE extension/app).
2. Codex reads `AGENTS.md` and the skills in `.agents/skills/` automatically.
3. Ask in plain language, or mention the skill by name.
4. If Codex's sandbox asks permission to run a command (e.g. `npm run xlsx`), approve it.

More: [adapters/codex.md](adapters/codex.md).

### 10.4 claude.ai, ChatGPT, Gemini and other chat tools

Chat tools cannot open folders on your computer, so you prepare a package once and then exchange files manually.

**Once (per framework version):** in the `quality-agents` folder, run

```bash
npm run bundle
```

This creates a `dist/` folder (never versioned):

| File | Use it for |
|---|---|
| `dist/claude-ai/<skill>.zip` | Uploading skills to claude.ai (and ChatGPT plans that support Skills) |
| `dist/chat/<skill>.md` | One self-contained file per skill, for any chat tool |
| `dist/chat/quality-agents-all.md` | All instructions and usable skills in a single file |

**claude.ai (Pro, Max, Team, Enterprise)**
1. Settings → enable code execution / file creation.
2. Settings → Skills → *Upload skill* → upload the zips you need (at least `qa-orchestrator`, `project-context` and the activity skills).
3. Optional: create a Project and paste the content of `AGENTS.md` into the project instructions.

**ChatGPT**
- Plans with Skills (Business, Enterprise, Edu; may require admin enablement): upload the zips from `dist/claude-ai/`.
- Other plans: create a **Project** (or custom GPT), paste `AGENTS.md` into the instructions and upload `dist/chat/quality-agents-all.md` as a file.

**Gemini:** create a **Gem**, paste `AGENTS.md` into the instructions and add the `dist/chat/<skill>.md` files you need under *Knowledge*.

**Every activity in chat mode:**
1. Upload the project context files the activity needs (`project.json`, `context/index.md` and the relevant `context/*.md`). For a new project, the AI interviews you and gives you the files to save.
2. Upload the inputs (story, log, screenshots).
3. Save everything the AI produces — deliverables and the `state.json` content shown at each gate — into `workspace/projects/<project-id>/runs/<run-id>/` on your computer.
4. If the tool cannot create the Excel/PDF, ask for the JSON/Markdown and run locally:

   ```bash
   npm run xlsx -- write --layout skills/requirements-review/assets/review-matrix.layout.json --data review-matrix.json --lang en --out "QA Review Matrix.xlsx"
   npm run pdf -- final-report.md "QA Final Definitions Report.pdf"
   ```

**Data policy:** uploading documents to an online AI sends them to that provider. Do it only if your organization allows it for that project.

More: [adapters/chat/README.md](adapters/chat/README.md) · other tools: [adapters/generic/README.md](adapters/generic/README.md) · differences and limitations: [docs/compatibility.md](docs/compatibility.md).

---

## 11. Where every file goes

| What | Where |
|---|---|
| Files you give the AI for a project | `workspace/projects/<project-id>/inbox/` |
| Confirmed knowledge about the system | `workspace/projects/<project-id>/context/` |
| Knowledge waiting for your confirmation | `workspace/projects/<project-id>/proposed-updates.md` |
| History of activities | `workspace/projects/<project-id>/activity-log.md` |
| Everything about one activity | `workspace/projects/<project-id>/runs/<run-id>/` |
| — its progress | `.../state.json` |
| — files used | `.../inputs/` |
| — deliverables (Excel, PDF, reports, test cases) | `.../outputs/` |
| — screenshots, traces | `.../evidence/` |
| — logs | `.../logs/` |
| Chat-tool packages | `dist/` |

The AI never writes results into the framework folders (`skills/`, `core/`, `templates/`, `docs/`...). If you see a result somewhere else, ask it to move it to the run folder.

**Exception:** if a future automation skill is authorized to change your system's code repository, that code goes into **that** repository and follows its own Git rules. Reports about it still go to the run folder.

---

## 12. Privacy and isolation

- **Your data never leaves your computer through this repository.** `workspace/` and `dist/` are ignored by Git.
- **A second barrier:** after `npm run setup`, every commit is checked. Commits containing workspace files, documents/images/evidence, `.env` files, known password/token formats or outdated skill copies are blocked. The same checks run on GitHub for every push.
- **Projects are isolated.** Each system has its own folder; the AI reads only the active project's folder and never mixes systems. Comparisons between projects happen only if you explicitly ask and name both.
- **No credentials anywhere.** Never put passwords or tokens in any file — not in the framework, not in project context. Refer to them by the name of an environment variable.
- **External services:** the AI asks before sending project data to any external service. Uploading files to a chat AI is your decision; follow your organization's policy (record it in `project.json` → `externalDataSharingAllowed`).
- `.gitignore` is a convenience, not a security control. Treat project files as confidential regardless.

Details: [docs/privacy-and-isolation.md](docs/privacy-and-isolation.md).

---

## 13. Command reference

Run all commands from the `quality-agents` folder. On Windows PowerShell, use `npm.cmd` if `npm` is blocked.

| Command | What it does |
|---|---|
| `qa` (after `npm link`) or `npm run qa` | Open the desktop app ([4.1](#41-the-desktop-app-qa)) |
| `qa --terminal` | Terminal menu that prepares the request and opens your AI tool ([4.2](#42-the-terminal-menu-qa---terminal)) |
| `npm run setup` | One-time setup: workspace folders + commit protection |
| `npm run new-project -- <id> "<Name>"` | Create a project folder from the template |
| `npm run new-run -- --project <id> --skill <skill> --slug <short-name>` | Create a run (the AI usually does this for you). Use `--workflow <id>` instead of `--skill` for workflows. |
| `npm run runs` | List all projects and runs, and validate every `state.json` |
| `npm run runs -- <id>` | Only one project |
| `npm run xlsx -- write --layout <layout.json> --data <data.json> --out <file.xlsx> [--lang en\|pt-BR]` | Create an Excel deliverable (English labels by default) |
| `npm run xlsx -- read <file.xlsx> --layout <layout.json> --out <data.json>` | Read an Excel file returned by the team |
| `npm run pdf -- <report.md> <report.pdf>` | Create a PDF from a Markdown report |
| `npm run check-output -- <kind> <file> [options]` | Objective checks of a deliverable: `pre-analysis`, `missing-info --expect "a,b"`, `test-cases --source <doc>`, `review-matrix` |
| `npm run bundle` | Create packages for chat tools in `dist/` |
| `npm run check` | Validate the framework and check for artifacts/secrets |
| `npm test` | Run the framework's own tests |
| `npm run build` | Regenerate `.agents/skills/` and `.claude/skills/` after editing `skills/` or `core/` (contributors only) |

---

## 14. Troubleshooting

| Problem | Solution |
|---|---|
| `git` / `node` / `npm` "is not recognized" | Install it ([3.2](#32-install-git-and-nodejs)) and **reopen** the terminal. |
| PowerShell: *"running scripts is disabled on this system"* | Use Git Bash, or type `npm.cmd` instead of `npm`, or run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `qa` "is not recognized" / "command not found" | Run `npm link` inside the `quality-agents` folder and open a new terminal, or use `npm run qa` from that folder. |
| `qa` says the app is not installed yet | Run `npm run setup` in the `quality-agents` folder (also needed after each `git pull`). |
| `qa` shows your AI tool as "not installed" | The tool's command (`claude`, `codex`, `cursor-agent`, `gemini`, `cursor`) is not on your PATH. Install the tool's CLI, or choose "Just show the request" and paste it yourself. |
| The AI does not seem to know the skills | Make sure you opened the **`quality-agents` folder itself** (not a parent folder). Start a new session after cloning or updating. In chat tools, check that you uploaded the skills. |
| The AI answers generically instead of following the process | Name the skill explicitly ("use the requirements-review skill") or, in Claude Code, type `/requirements-review`. |
| The AI asks which project | Expected when the project is ambiguous. Tell it the project id or name. |
| The AI saved a file in the wrong place | Ask it to move it to the run folder; the rules forbid writing outside `workspace/projects/<id>/`. |
| Excel not generated | Node.js missing, or the tool could not run commands. Ask the AI for `review-matrix.json` / `test-cases.json` and run the `npm run xlsx -- write ...` command yourself ([13](#13-command-reference)). |
| `npm run pdf` says no browser found | Install Edge or Chrome, or set the variable `QA_AGENTS_BROWSER` to the browser's path. The `.html` file is still created — open it and print to PDF. |
| A commit was blocked | Read the message: it lists the file and reason. Move project files to `workspace/`, remove secrets. Never bypass with `--no-verify`. |
| `npm run runs` shows lines with `!` | That run's `state.json` is invalid or points to another project. Ask the AI to fix the state of that run. |
| Cursor shows each skill twice | Known; both copies are identical. Disable one set in Cursor's skills settings if it bothers you. |
| Chat tool "forgot" everything | Expected — chat tools have no memory between conversations. Upload `state.json` and the context files again and ask to resume. |

---

## 15. Updating the framework

```bash
cd quality-agents
git pull
```

Your `workspace/` (projects, context, runs) is not touched by updates. After updating:
- Agent tools: start a new session so the updated skills are loaded.
- Chat tools: run `npm run bundle` again and re-upload the skills.

---

## 16. Adding a new skill

For people maintaining the framework:

1. Create `skills/<new-name>/SKILL.md` following [docs/skill-standard.md](docs/skill-standard.md) (required sections, metadata, status). Copying an existing skill folder is the easiest start.
2. Put long procedures in `skills/<new-name>/references/` and templates in `assets/`.
3. Add synthetic inputs and an acceptance checklist in `examples/<new-name>/`.
4. Add the skill to the catalog table in `AGENTS.md` and, if it needs project knowledge, to the retrieval map in `skills/project-context/references/context-files.md`.
5. Run:

   ```bash
   npm run build
   npm run check
   npm test
   ```

6. Test it with the example in at least two AI tools and record the result in [docs/compatibility-tests.md](docs/compatibility-tests.md) before marking it `stable`.

---

## 17. Contributing

1. Create a branch.
2. Edit only `skills/`, `core/`, `docs/`, `templates/`, `schemas/`, `adapters/`, `examples/`, `scripts/`, `desktop/`, `app/` and `tests/`. Never edit `.agents/skills/` or `.claude/skills/` by hand.
   - Working on the desktop app: `npm run app:dev` rebuilds it and opens it.
3. Run `npm run build`, `npm run typecheck`, `npm run check` and `npm test` — all must pass.
4. Never include real project data; examples must be synthetic.
5. Changes to the rules of the migrated skills need team agreement: propose them in [docs/proposed-improvements.md](docs/proposed-improvements.md) first. The origin of each rule is documented in [docs/migration/](docs/migration/README.md).
6. When you change this guide, update both versions: `README.md` (English) and `README.pt-BR.md` (Portuguese).

---

## 18. Repository map

| Path | Contents |
|---|---|
| `AGENTS.md` | Entry point read by AI tools: rules, skill catalog, routing, approvals, resume |
| `CLAUDE.md` | Makes Claude Code load `AGENTS.md` |
| `skills/` | Skill definitions (source — edit here) |
| `core/` | Policies shared by all skills: isolation, approval, persistence, traceability, principles |
| `.agents/skills/`, `.claude/skills/` | Generated copies so each AI tool finds the skills — do not edit |
| `templates/project-context/` | Template for new project folders |
| `schemas/` | Formats of `state.json`, `project.json` and workflows |
| `adapters/` | Setup guides per AI tool |
| `examples/` | Fictional inputs and acceptance checklists |
| `docs/` | Skill standard, compatibility, privacy, prompt migration, proposed improvements |
| `app/` | Desktop app interface (React + TypeScript), built into `app/dist/` by `npm run setup` |
| `desktop/` | Desktop app main process (Electron, TypeScript): file access rules, AI tool launcher — see [docs/desktop-app.md](docs/desktop-app.md) |
| `scripts/`, `tests/` | `qa` command, helper commands and the framework's own tests |
| `workspace/` | Your local project data — never versioned |

## License

[MIT](LICENSE)
