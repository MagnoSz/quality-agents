// Client for the desktop app's main process (see desktop/preload.ts and
// desktop/service.ts). Every call goes through one validated IPC channel.

export interface ProjectSummary {
  id: string; name: string; description: string; onboardingStatus: string; deliverableLanguage: string; runs: number; openRuns: number;
  repository: string; // folder linked to the project ('' when none)
  linkedSkills: string[]; // global skills this project uses, by name
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
}

export type FileContent =
  | { kind: 'markdown'; path: string; text: string; html: string; editable: boolean }
  | { kind: 'text'; path: string; text: string; editable: boolean }
  | { kind: 'json'; path: string; text: string }
  | { kind: 'docx'; path: string; html: string }
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

interface Bridge {
  call(method: string, ...args: unknown[]): Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  watch(project: string | null): Promise<boolean>;
  onChanged(callback: (project: string) => void): () => void;
  openLink(url: string): Promise<void>;
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
  if (!window.qa) throw new Error('Quality Agents must be opened with the qa command.');
  const res = await window.qa.call(method, ...args);
  if (!res.ok) throw new Error(res.error);
  return res.value as T;
}

export const api = {
  session: () => call<{ version: string; platform: string }>('session'),
  projects: () => call<ProjectSummary[]>('projects'),
  createProject: (name: string) => call<ProjectSummary>('createProject', name),
  skills: () => call<SkillInfo[]>('skills'),
  activities: () => call<{ activities: ActivityInfo[]; languages: string[] }>('activities'),
  integrations: () => call<ToolInfo[]>('integrations'),
  tree: (project: string) => call<TreeNode[]>('tree', project),
  readFile: (project: string, path: string) => call<FileContent>('readFile', project, path),
  writeFile: (project: string, path: string, text: string) => call<FileContent>('writeFile', project, path, text),
  run: (project: string, runId: string) => call<RunState>('run', project, runId),
  inbox: (project: string) => call<InboxFile[]>('inbox', project),
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
  scopeAgents: (project: string, scope: SkillScope) => call<ScopeAgents>('scopeAgents', project, scope),
  createScopeAgent: (project: string, req: ScopeAgentRequest, allowClaudeWrite = false) => call<{ name: string; file: string; backup?: string }>('createScopeAgent', project, req, allowClaudeWrite),
  projectItems: (project: string) => call<ProjectItems>('projectItems', project),
  removeProjectItem: (project: string, kind: 'skill' | 'agent', name: string, allowClaudeWrite = false) => call<{ backup?: string }>('removeProjectItem', project, kind, name, allowClaudeWrite),
  globalItems: () => call<GlobalItems>('globalItems'),
  setupProject: (project: string, req: { description: string; linkedSkills: string[] }) => call<ProjectSummary>('setupProject', project, req),
  openGlobal: (kind: 'skill' | 'agent', name: string) => call<boolean>('openGlobal', kind, name),
  removeGlobal: (kind: 'skill' | 'agent', name: string) => call<boolean>('removeGlobal', kind, name),
  watch: (project: string | null) => window.qa?.watch(project ?? '') ?? Promise.resolve(false),
  onChanged: (cb: (project: string) => void) => window.qa?.onChanged(cb) ?? (() => {}),
  openLink: (url: string) => window.qa?.openLink(url),
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

export const statusLabel: Record<string, string> = {
  'in-progress': 'In progress', 'awaiting-approval': 'Waiting for your approval', 'awaiting-input': 'Waiting for input',
  blocked: 'Blocked', completed: 'Completed', cancelled: 'Cancelled',
};
