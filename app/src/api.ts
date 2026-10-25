// Client for the desktop app's main process (see desktop/preload.ts and
// desktop/service.ts). Every call goes through one validated IPC channel.

import { t } from './i18n';

export interface ProjectSummary {
  id: string; name: string; description: string; onboardingStatus: string; deliverableLanguage: string; runs: number; openRuns: number;
  repository: string; // folder linked to the project ('' when none)
  linkedSkills: string[]; // global skills this project uses, by name
  starter: Starter;
}
// How a new project starts: with the QA context files, or blank (the AI interviews and proposes a plan).
export type Starter = 'qa' | 'blank';
// The AI's recommendation for a blank project (plan.json), reviewed in "Set up project".
export interface Plan {
  approved: boolean; skills: string[]; agents: string[]; searchSkills: string[];
  contextFiles: { path: string; contains: string }[];
}
export interface SkillInfo { name: string; status: string; description: string }
export type ToolKind = 'terminal' | 'editor' | 'chat' | 'print';
export interface ToolInfo { id: string; label: string; hint: string; command: string; kind: ToolKind; available: boolean }
export interface ActivityInfo { id: string; label: string; hint: string; skill: string; needsFiles: boolean; available: boolean; status: string }
export interface InboxFile { name: string; size: number; modified: string }
export interface OpenRun { id: string; status: string; currentStep: string }

export interface TreeNode {
  name: string; path: string; type: 'dir' | 'file'; size?: number; children?: TreeNode[];
  run?: { status: string; skill: string; currentStep: string };
  mcp?: string; // MCP server row: where it is configured
}

export type FileContent =
  | { kind: 'markdown'; path: string; text: string; html: string; editable: boolean }
  | { kind: 'text'; path: string; text: string; editable: boolean }
  | { kind: 'json'; path: string; text: string }
  | { kind: 'docx'; path: string; html: string }
  | { kind: 'xlsx'; path: string; sheets: {
    name: string; hidden: boolean; drawing: boolean; rows: (string | { n: string })[][]; truncated: boolean;
    merges: number[][]; widths: number[]; hiddenRows: number[]; hiddenCols: number[]; align: Record<string, { h?: string; v?: string; wrap?: boolean }>;
  }[] }
  | { kind: 'image'; path: string; dataUrl: string }
  | { kind: 'binary'; path: string; size: number; openable: boolean; reason?: string };

export interface RunState {
  id: string; status: string; currentStep?: string; skill?: string; workflow?: string; createdAt?: string; updatedAt?: string;
  completedSteps?: string[];
  pending?: { id: string; description: string; owner?: string }[];
  approvals?: { step: string; decision: string; by?: string; at: string; notes?: string }[];
  inputs?: { path: string; description?: string }[];
  artifacts?: string[];
}

export interface AgentInfo {
  name: string; description: string; category: string; skills: string[]; access: string; version: string; status: string;
  basedOn: string; source: 'builtin' | 'custom'; path: string; usable: boolean;
}
export interface AgentDetail extends AgentInfo { text: string; html: string }
export interface Category { id: string; label: string; description: string; source: 'builtin' | 'custom' }

// How generated PDF, Word and Excel files look (scripts/lib/doc-style.mjs). Texts may use
// {project}, {title}, {date}, {page}, {pages}.
export interface DocumentStyle {
  font: { family: string; size: number; color: string };
  accent: string;
  table: { header: string; headerText: string; border: string };
  background: string;
  header: { left: string; center: string; right: string; logo: string; logoSide: 'left' | 'right' };
  footer: { left: string; center: string; right: string };
  watermark: { text: string; color: string; opacity: number };
}
export const DOCUMENT_FONTS = ['Calibri', 'Arial', 'Segoe UI', 'Helvetica', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Cambria', 'Garamond', 'Consolas'];

export interface LaunchRequest { project: string; activity: string; tool: string; files: string[]; note: string; language: string; run?: string; agent?: string }
export interface LaunchResult { opened: boolean; message?: string; copied?: boolean; prompt: string; upload?: string[]; bundleReady?: boolean; terminal?: TerminalRef }
export interface TerminalRef { id: string; title: string }

// Skills & agents dialog: skills installed from the SkillMD registry and Claude Code agents, per project or for all projects.
export interface RegistrySkill {
  slug: string; title: string; description: string; category: string; verified: boolean; verdict: string | null; rating: number; installs: number;
}
export interface SkillSearchPage { items: RegistrySkill[]; page: number; pages: number; total: number; capped: boolean }
export interface InstallResult { name: string; files: number; folders: string[]; unverified: string[]; backup?: string }
export type SkillScope = 'project' | 'global';
export interface ScopeAgents { skills: string[]; builtin: { name: string; description: string }[]; agents: string[]; folder: string; agentsFolder: string }
export interface ScopeAgentRequest { name: string; description: string; skills: string[]; scope: SkillScope }
export interface ProjectItems {
  skillsFolder: string; agentsFolder: string;
  skills: { name: string; description: string }[];
  agents: { name: string; description: string }[];
}
export interface GlobalItems {
  skills: { name: string; description: string; folders: string[]; linkedBy: string[] }[];
  agents: { name: string; description: string; file: string }[];
}
export interface GlobalAgentDetail { name: string; description: string; file: string; text: string; html: string }

interface Bridge {
  call(method: string, ...args: unknown[]): Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  filePath(file: File): string;
  watch(project: string | null): Promise<boolean>;
  onChanged(callback: (project: string) => void): () => void;
  openLink(url: string): Promise<void>;
  openNoteWindow(target: { project?: string | null; path?: string | null; loose?: string | null; theme?: string }): Promise<boolean>;
  notesChanged(): void;
  onNotesChanged(callback: () => void): () => void;
  noteMax(): void;
  showTerminal?(project: string, terminal: TerminalRef): void;
  openInMain?(project: string, path: string): void;
  onShowTerminal?(callback: (project: string, terminal: TerminalRef) => void): () => void;
  onOpenInMain?(callback: (project: string, path: string) => void): () => void;
  term: {
    create(tool: string): Promise<{ terminal?: TerminalRef; error?: string }>; // tool '' = the user's shell
    start(id: string, cols: number, rows: number): Promise<string>;
    input(id: string, data: string): void;
    resize(id: string, cols: number, rows: number): void;
    kill(id: string): void;
    on(event: 'data' | 'exit', callback: (id: string, payload: string | number) => void): () => void;
  };
}

declare global { interface Window { qa?: Bridge } }

export const hasBridge = (): boolean => Boolean(window.qa);

async function call<T>(method: string, ...args: unknown[]): Promise<T> {
  if (!window.qa) throw new Error(t('Moki must be opened with the qa command.'));
  const res = await window.qa.call(method, ...args);
  if (!res.ok) throw new Error(res.error);
  return res.value as T;
}

export const api = {
  session: () => call<{ version: string; platform: string }>('session'),
  projects: () => call<ProjectSummary[]>('projects'),
  createProject: (name: string, starter: Starter, folder?: string) => call<ProjectSummary & { backup?: string }>('createProject', name, starter, folder ?? null),
  pickFolder: () => call<{ folder: string; name: string } | null>('pickFolder'),
  skills: () => call<SkillInfo[]>('skills'),
  activities: () => call<{ activities: ActivityInfo[]; languages: string[] }>('activities'),
  integrations: () => call<ToolInfo[]>('integrations'),
  tree: (project: string) => call<TreeNode[]>('tree', project),
  readFile: (project: string, path: string) => call<FileContent>('readFile', project, path),
  writeFile: (project: string, path: string, text: string) => call<FileContent>('writeFile', project, path, text),
  renderMarkdown: (text: string) => call<string>('renderMarkdown', text),
  documentStyle: (project?: string | null) => call<{ global: DocumentStyle; project: DocumentStyle | null }>('documentStyle', project ?? null),
  saveDocumentStyle: (project: string | null, style: DocumentStyle | null) => call<boolean>('saveDocumentStyle', project, style),
  createNote: (project: string, title: string, text: string) => call<string>('createNote', project, title, text),
  run: (project: string, runId: string) => call<RunState>('run', project, runId),
  inbox: (project: string) => call<InboxFile[]>('inbox', project),
  importFiles: (project: string, paths: string[]) => call<{ saved: string[]; skipped: string[] }>('importFiles', project, paths),
  openRuns: (project: string) => call<OpenRun[]>('openRuns', project),
  openFolder: (project: string, path = '') => call<boolean>('openFolder', project, path),
  openExternal: (project: string, path: string) => call<boolean>('openExternal', project, path),
  linkRepository: (project: string) => call<(ProjectSummary & { backup?: string }) | null>('linkRepository', project),
  openLinkedFolder: (project: string) => call<boolean>('openLinkedFolder', project),
  launch: (req: LaunchRequest) => call<LaunchResult>('launch', req),
  categories: () => call<Category[]>('categories'),
  agents: () => call<AgentInfo[]>('agents'),
  agent: (name: string) => call<AgentDetail>('agent', name),
  duplicateAgent: (name: string) => call<AgentInfo>('duplicateAgent', name),
  saveAgent: (name: string, text: string) => call<boolean>('saveAgent', name, text),
  deleteAgent: (name: string) => call<boolean>('deleteAgent', name),
  projectAgents: (project: string) => call<string[]>('projectAgents', project),
  setProjectAgents: (project: string, names: string[]) => call<string[]>('setProjectAgents', project, names),
  searchSkills: (query: string, category = '', page = 1) => call<SkillSearchPage>('searchSkills', query, category, page),
  installedSkills: (project: string) => call<{ project: string[]; global: string[] }>('installedSkills', project),
  installSkill: (project: string, slug: string, scope: SkillScope, allowClaudeWrite = false) => call<InstallResult>('installSkill', project, slug, scope, allowClaudeWrite),
  proposeSkill: (project: string, req: { name: string; prompt: string; tool: string; language: string }) => call<LaunchResult>('proposeSkill', project, req),
  skillProposals: (project: string) => call<{ name: string; description: string }[]>('skillProposals', project),
  installProposal: (project: string, name: string, scope: SkillScope, allowClaudeWrite = false) => call<{ name: string; folders: string[]; backup?: string }>('installProposal', project, name, scope, allowClaudeWrite),
  scopeAgents: (project: string, scope: SkillScope) => call<ScopeAgents>('scopeAgents', project, scope),
  createScopeAgent: (project: string, req: ScopeAgentRequest, allowClaudeWrite = false) => call<{ name: string; file: string; backup?: string }>('createScopeAgent', project, req, allowClaudeWrite),
  projectItems: (project: string) => call<ProjectItems>('projectItems', project),
  removeProjectItem: (project: string, kind: 'skill' | 'agent', name: string, allowClaudeWrite = false) => call<{ backup?: string }>('removeProjectItem', project, kind, name, allowClaudeWrite),
  globalItems: () => call<GlobalItems>('globalItems'),
  setupProject: (project: string, req: { description: string; linkedSkills: string[]; agents?: string[]; contextFiles?: string[] }) => call<ProjectSummary>('setupProject', project, req),
  readPlan: (project: string) => call<Plan | null>('readPlan', project),
  globalAgent: (name: string) => call<GlobalAgentDetail>('globalAgent', name),
  saveGlobalAgent: (name: string, text: string) => call<boolean>('saveGlobalAgent', name, text),
  editGlobalAgent: (name: string, req: { prompt: string; tool: string; language: string }) => call<LaunchResult>('editGlobalAgent', name, req),
  openGlobal: (kind: 'skill' | 'agent', name: string) => call<boolean>('openGlobal', kind, name),
  removeGlobal: (kind: 'skill' | 'agent', name: string) => call<boolean>('removeGlobal', kind, name),
  watch: (project: string | null) => window.qa?.watch(project ?? '') ?? Promise.resolve(false),
  onChanged: (cb: (project: string) => void) => window.qa?.onChanged(cb) ?? (() => {}),
  openLink: (url: string) => window.qa?.openLink(url),
  openNoteWindow: (target: { project?: string | null; path?: string | null; loose?: string | null }) => window.qa?.openNoteWindow({ ...target, theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' }) ?? Promise.resolve(false),
  onNotesChanged: (cb: () => void) => window.qa?.onNotesChanged(cb) ?? (() => {}),
  // Embedded terminals (desktop/terminals.ts); only available inside the app.
  term: () => window.qa?.term ?? null,
};

// Run folders are named YYYYMMDD-HHMM-<skill or workflow>-<slug>.
export function describeRun(id: string): { date: string; title: string } {
  const m = id.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-(.+)$/);
  if (!m) return { date: '', title: id };
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return { date: date.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), title: m[6] };
}

export const statusLabel = (status: string): string => ({
  'in-progress': t('In progress'), 'awaiting-approval': t('Waiting for your approval'), 'awaiting-input': t('Waiting for input'),
  blocked: t('Blocked'), completed: t('Completed'), cancelled: t('Cancelled'),
} as Record<string, string>)[status] ?? status;
