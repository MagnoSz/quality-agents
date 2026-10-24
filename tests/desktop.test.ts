import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, symlinkSync, existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { createService, ServiceError, type FileContent, type TreeNode } from '../desktop/service.ts';
import { PathError, resolveInside, isEditable, isOpenable } from '../desktop/fs-guard.ts';
import { launchInTerminal, pluginArgs, scriptFor, windowsStartArgs, type LaunchResult } from '../desktop/launcher.ts';
import type { TermSpec } from '../desktop/terminals.ts';
import { docxToMarkdown, readableInputs } from '../scripts/lib/docx.ts';
import { syncFramework } from '../desktop/framework.ts';
import { markdownToHtml } from '../scripts/lib/markdown.mjs';
import { zip } from '../scripts/lib/zip.mjs';
import { ROOT } from '../scripts/lib/repo.mjs';
import { createProject, slugify, windowsSafePrompt, type ToolKey } from '../scripts/lib/core.ts';

// Fixture: a framework root with a few skills, the project template and one project.
const root = mkdtempSync(join(tmpdir(), 'qa-desktop-'));
const RUN = '20261020-0900-failure-analysis-x';
const launched: { tool: ToolKey; prompt: string }[] = [];
const folders: string[] = [];
const opened: string[] = [];
let service: ReturnType<typeof createService>;

function makeDocx(): Buffer {
  const p = (text: string, style = '') => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t>${text}</w:t></w:r></w:p>`;
  const cell = (text: string) => `<w:tc>${p(text)}</w:tc>`;
  const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${p('US-1 Renovação', 'Heading1')}${p('Item A', 'ListBullet')}`
    + `<w:tbl><w:tr>${cell('AC')}${cell('Rule')}</w:tr><w:tr>${cell('AC1')}${cell('a | b &amp; c')}</w:tr></w:tbl>${p('Fim')}</w:body></w:document>`;
  return zip([['word/document.xml', xml]]);
}

before(() => {
  for (const s of ['failure-analysis', 'automation', 'project-context', 'requirements-review']) {
    cpSync(join(ROOT, 'skills', s), join(root, 'skills', s), { recursive: true });
  }
  cpSync(join(ROOT, 'templates'), join(root, 'templates'), { recursive: true });
  cpSync(join(ROOT, 'agents'), join(root, 'agents'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '9.9.9' }));
  createProject('acme', 'Acme', root);
  const project = join(root, 'workspace', 'projects', 'acme');
  mkdirSync(join(project, 'runs', RUN, 'outputs'), { recursive: true });
  writeFileSync(join(project, 'runs', RUN, 'state.json'), JSON.stringify({ status: 'awaiting-approval', currentStep: 'interview', skill: 'failure-analysis' }));
  writeFileSync(join(project, 'runs', RUN, 'outputs', 'report.md'), '# Report\n\nSee [the story](../../../inbox/us-1.md).');
  writeFileSync(join(project, 'inbox', 'us-1.md'), '# US-1');
  writeFileSync(join(project, 'inbox', 'us-2.docx'), makeDocx());
  writeFileSync(join(project, 'inbox', 'tool.exe'), 'MZ');
  writeFileSync(join(root, 'secret.txt'), 'outside');
  service = createService(root, {
    launch: (tool, prompt): LaunchResult => { launched.push({ tool, prompt }); return { opened: true, message: 'fake' }; },
    openFolder: (f) => { folders.push(f); },
    openPath: (f) => { opened.push(f); },
  });
});

after(() => rmSync(root, { recursive: true, force: true }));

const flatten = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);

test('projects and project creation', () => {
  assert.deepEqual(service.projects().map((p) => p.id), ['acme']);
  const created = service.createProject('Billing Portal — Fase 2');
  assert.equal(created.id, 'billing-portal-fase-2');
  assert.equal(created.name, 'Billing Portal — Fase 2');
  assert.ok(existsSync(join(root, 'workspace', 'projects', 'billing-portal-fase-2', 'context', 'index.md')));
  assert.throws(() => service.createProject('Billing Portal — Fase 2'), /already exists/);
  assert.throws(() => service.createProject('   '), ServiceError);
  assert.equal(slugify('Ação & Crítica!'), 'acao-critica');
});

test('tree lists the project, hides dot files and annotates activities', () => {
  const tree = service.tree('acme');
  assert.deepEqual(tree.slice(0, 3).map((n) => n.name), ['context', 'inbox', 'runs']);
  const all = flatten(tree);
  assert.equal(all.some((n) => n.name.startsWith('.')), false);
  const run = all.find((n) => n.path === `runs/${RUN}`);
  assert.equal(run?.run?.status, 'awaiting-approval');
  assert.throws(() => service.tree('../..'), /Unknown project/);
});

test('readFile renders each kind of file', () => {
  const md = service.readFile('acme', `runs/${RUN}/outputs/report.md`) as Extract<FileContent, { kind: 'markdown' }>;
  assert.equal(md.kind, 'markdown');
  assert.match(md.html, /<h1>Report<\/h1>/);
  assert.equal(service.readFile('acme', 'project.json').kind, 'json');
  const docx = service.readFile('acme', 'inbox/us-2.docx') as Extract<FileContent, { kind: 'docx' }>;
  assert.match(docx.html, /US-1 Renovação/);
  const exe = service.readFile('acme', 'inbox/tool.exe') as Extract<FileContent, { kind: 'binary' }>;
  assert.equal(exe.kind, 'binary');
  assert.equal(exe.openable, false);
});

test('file access never leaves the project folder', () => {
  for (const p of ['../../../secret.txt', '..\\..\\..\\secret.txt', 'C:\\Windows\\win.ini', '/etc/passwd', 'a\0b']) {
    assert.throws(() => service.readFile('acme', p), ServiceError, p);
  }
  assert.throws(() => service.readFile('ghost', 'project.json'), /Unknown project/);
});

test('editing is limited to existing Markdown/text files', () => {
  const saved = service.writeFile('acme', 'context/glossary.md', '# Glossary\n\n| Term | Meaning |') as Extract<FileContent, { kind: 'markdown' }>;
  assert.match(saved.text, /Term/);
  assert.throws(() => service.writeFile('acme', 'project.json', '{}'), /Only Markdown and text/);
  assert.throws(() => service.writeFile('acme', 'context/new.md', 'x'), /not found/);
  assert.throws(() => service.writeFile('acme', '../../../secret.txt', 'x'), ServiceError);
});

test('open folder / open with default program are confined and filtered', () => {
  service.openFolder('acme', 'inbox');
  assert.ok(folders[0].endsWith(join('acme', 'inbox')));
  assert.throws(() => service.openFolder('acme', '../..'), ServiceError);
  service.openExternal('acme', 'inbox/us-1.md');
  assert.equal(opened.length, 1);
  assert.throws(() => service.openExternal('acme', 'inbox/tool.exe'), /not opened from the app/);
});

test('run details and open activities', () => {
  assert.equal(service.run('acme', RUN).currentStep, 'interview');
  assert.throws(() => service.run('acme', 'nope'), /Unknown activity/);
  assert.throws(() => service.run('../..', RUN), /Unknown project/);
  assert.deepEqual(service.openRuns('acme').map((r) => r.id), [RUN]);
});

test('launch validates every choice against fixed lists', () => {
  const base = { project: 'acme', activity: 'review', tool: 'claude', files: ['us-1.md'], language: 'English', note: '' };
  assert.throws(() => service.launch({ ...base, project: '../acme' }), /Unknown project/);
  assert.throws(() => service.launch({ ...base, activity: 'rm -rf' }), /Unknown activity/);
  assert.throws(() => service.launch({ ...base, tool: 'powershell' }), /Unknown tool/);
  assert.throws(() => service.launch({ ...base, files: ['../../secret.txt'] }), /Not in the project inbox/);
  assert.throws(() => service.launch({ ...base, files: [] }), /needs at least one file/);
  assert.throws(() => service.launch({ ...base, activity: 'automation' }), /not available yet/);
  assert.throws(() => service.launch({ ...base, activity: 'resume', run: 'x' }), /open activity/);
  assert.equal(launched.length, 0);
});

test('launch builds the request; Word files are extracted', () => {
  const r = service.launch({ project: 'acme', activity: 'review', tool: 'claude', files: ['us-1.md', 'us-2.docx'], language: 'Portuguese (pt-BR)', note: 'line1\nline2' });
  assert.equal(r.opened, true);
  assert.equal(launched.length, 1);
  assert.match(r.prompt, /requirements-review skill .*inbox\/us-1\.md.*\.extracted\/us-2\.docx\.md/);
  assert.match(r.prompt, /Additional instructions: line1 line2\. Talk to me in Portuguese \(pt-BR\)\.$/);
  const chat = service.launch({ project: 'acme', activity: 'resume', run: RUN, tool: 'chat', files: [], language: 'English', note: '' });
  assert.equal(chat.opened, false);
  assert.ok((chat as { upload: string[] }).upload.some((u) => u.endsWith('state.json')));
  assert.equal(launched.length, 1, 'chat does not launch anything');
});

test('agent library: built-in agents are read-only, copies are editable and validated', () => {
  const names = service.agents().map((a) => a.name);
  assert.ok(names.includes('requirements-analyst') && names.includes('automation-engineer'));
  assert.equal(service.agents().find((a) => a.name === 'automation-engineer')?.usable, false);
  assert.ok(service.categories().some((c) => c.id === 'quality'));
  assert.throws(() => service.saveAgent('requirements-analyst', 'x'), /cannot be edited/);
  assert.throws(() => service.deleteAgent('requirements-analyst'), /cannot be deleted/);
  assert.throws(() => service.agent('../secret'), /Unknown agent/);

  const copy = service.duplicateAgent('requirements-analyst');
  assert.equal(copy.name, 'requirements-analyst-custom');
  assert.equal(copy.source, 'custom');
  assert.equal(copy.basedOn, 'requirements-analyst');
  const file = join(root, 'workspace', 'library', 'agents', 'quality', 'requirements-analyst-custom.md');
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^# Requirements Analyst \(custom\)$/m);

  assert.throws(() => service.saveAgent(copy.name, text.replace('name: requirements-analyst-custom', 'name: other')), /must match the file name/);
  assert.throws(() => service.saveAgent(copy.name, text.replace('skills: requirements-review', 'skills: made-up')), /unknown skill "made-up"/);
  assert.throws(() => service.saveAgent(copy.name, text.replace('access: project-write', 'access: root')), /access must be one of/);
  assert.equal(service.saveAgent(copy.name, text.replace('## Boundaries', '## Boundaries\n\nAlways cite the rule id.')), true);
  assert.match(service.agent(copy.name).html, /Always cite the rule id/);
  assert.match(readFileSync(join(root, 'agents', 'quality', 'requirements-analyst.md'), 'utf8'), /^# Requirements Analyst$/m, 'the original never changes');

  assert.equal(service.deleteAgent(copy.name), true);
  assert.ok(!existsSync(file));
});

test('agents per project: enabled list in project.json gates the launch', () => {
  const all = service.projectAgents('acme');
  assert.ok(all.includes('requirements-analyst') && !all.includes('automation-engineer'), 'absent list = every usable agent');
  assert.throws(() => service.setProjectAgents('acme', ['automation-engineer']), /Unknown or unavailable/);
  assert.deepEqual(service.setProjectAgents('acme', ['requirements-analyst']), ['requirements-analyst']);
  const stored = JSON.parse(readFileSync(join(root, 'workspace', 'projects', 'acme', 'project.json'), 'utf8')) as { agents: string[]; project: string };
  assert.deepEqual(stored.agents, ['requirements-analyst']);
  assert.equal(stored.project, 'acme');

  const base = { project: 'acme', activity: 'review', tool: 'print', files: ['us-1.md'], language: 'English', note: '' };
  assert.throws(() => service.launch({ ...base, agent: 'failure-analyst' }), /not enabled in this project/);
  assert.throws(() => service.launch({ ...base, agent: 'automation-engineer' }), /not available yet/);
  assert.throws(() => service.launch({ ...base, agent: 'nobody' }), /Unknown agent/);
  const r = service.launch({ ...base, agent: 'requirements-analyst' });
  assert.match(r.prompt, /Act as the requirements-analyst agent: read agents\/quality\/requirements-analyst\.md and follow it\./);
  assert.doesNotMatch(service.launch(base).prompt, /Act as/);
  service.setProjectAgents('acme', all);
});

test('linked folder: linking records it and backs up its AI settings without touching it', async () => {
  createProject('linked', 'Linked', root);
  const project = join(root, 'workspace', 'projects', 'linked');
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'qa-repo-')));
  mkdirSync(join(repo, '.claude', 'worktrees', 'copy'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'settings.json'), '{"a":1}');
  mkdirSync(join(repo, '.agents'));
  writeFileSync(join(repo, '.agents', 'x.md'), 'x');
  writeFileSync(join(repo, 'AGENTS.md'), '# repo');
  const prompts: string[] = [];
  const opened: string[] = [];
  let pick: string | null = null;
  const svc = createService(root, {
    launch: (_t, prompt): LaunchResult => { prompts.push(prompt); return { opened: true, message: 'fake' }; },
    openFolder: (f) => { opened.push(f); },
    openPath: () => {},
    pickFolder: async () => pick,
  });
  try {
    assert.equal(svc.projects().find((p) => p.id === 'linked')?.repository, '');
    assert.throws(() => svc.openLinkedFolder('linked'), /No folder is linked/);
    assert.equal(await svc.linkRepository('linked'), null, 'cancelled dialog');
    for (const [bad, msg] of [[join(repo, 'nope'), /not found/], [root, /outside Quality Agents/], [join(root, 'skills'), /outside Quality Agents/], [homedir(), /user folder/]] as const) {
      pick = bad;
      await assert.rejects(svc.linkRepository('linked'), msg);
    }
    const file = join(project, 'project.json');
    writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), repositories: [{ name: 'app', localPath: repo, writeAllowed: true }] }));
    assert.equal(svc.projects().find((p) => p.id === 'linked')?.repository, '', 'a localPath alone is not the linked folder');
    pick = repo;
    const r = await svc.linkRepository('linked');
    assert.equal(r?.repository, repo);
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).repositories, [{ name: 'app', localPath: repo, writeAllowed: true, linkedFolder: true }]);
    assert.match(String(r?.backup), /[\\/]backups[\\/]link-\d{8}-\d{6}$/);
    assert.equal(readFileSync(join(String(r?.backup), '.claude', 'settings.json'), 'utf8'), '{"a":1}');
    assert.ok(existsSync(join(String(r?.backup), '.agents', 'x.md')) && existsSync(join(String(r?.backup), 'AGENTS.md')));
    assert.ok(!existsSync(join(String(r?.backup), '.claude', 'worktrees')), 'worktrees are not copied');
    assert.deepEqual(readdirSync(repo).sort(), ['.agents', '.claude', 'AGENTS.md'], 'the folder is not changed');
    assert.ok(svc.openLinkedFolder('linked') && opened[0] === repo);
    svc.launch({ project: 'linked', activity: 'open', tool: 'claude', files: [], language: 'English', note: '' });
    assert.match(prompts[0], new RegExp(`Linked folder \\(the system's repository\\): ${repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
    const empty = realpathSync(mkdtempSync(join(tmpdir(), 'qa-repo-')));
    pick = empty;
    const r2 = await svc.linkRepository('linked');
    assert.equal(r2?.backup, undefined, 'nothing to back up');
    const repos = JSON.parse(readFileSync(file, 'utf8')).repositories;
    assert.deepEqual(repos.map((x: { linkedFolder?: boolean }) => x.linkedFolder), [true, undefined], 'only the new folder is linked');
    rmSync(empty, { recursive: true });
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

// ------------------------------------------------------------- Skills & agents dialog

const b64 = (s: string) => Buffer.from(s).toString('base64');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const noLaunch = { launch: () => ({ opened: true, message: '' }), openFolder: () => {}, openPath: () => {} };
const openAcme = { project: 'acme', activity: 'open', tool: 'print', files: [], language: 'English', note: '' };

test('skill registry: paged search, verified install per project or global, prompt names project skills', async () => {
  const bundles: Record<string, unknown> = {
    'good/lint': { files: [{ path: 'SKILL.md', content_base64: b64('---\nname: lint\n---') }, { path: 'refs/a.md', content_base64: b64('A'), sha256: sha('A') }] },
    'bad/hash': { files: [{ path: 'SKILL.md', content_base64: b64('x') }, { path: 'a.md', content_base64: b64('A'), sha256: sha('B') }] },
    'bad/escape': { files: [{ path: 'SKILL.md', content_base64: b64('x') }, { path: '../../evil.md', content_base64: b64('A'), sha256: sha('A') }] },
  };
  const urls: string[] = [];
  const fakeFetch = (async (url: string) => {
    urls.push(url);
    const slug = url.match(/\/api\/skills\/(.+)\/bundle/)?.[1];
    const body = slug ? bundles[slug] : { items: [{ slug: 'good/lint', title: 'lint', verdict: 'pass', avg_rating: 4 }, { slug: '../x', title: 'bad' }], total: 45 };
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 });
  }) as typeof fetch;
  const home = join(root, 'home');
  const svc = createService(root, { ...noLaunch, home, fetch: fakeFetch });

  const found = await svc.searchSkills('quero skills para programar', 'coding', 2);
  assert.deepEqual(found.items.map((s) => s.slug), ['good/lint'], 'invalid slugs are dropped');
  assert.deepEqual({ page: found.page, pages: found.pages, total: found.total }, { page: 2, pages: 3, total: 45 });
  assert.match(urls[0], /api\/search\?q=quero\+skills\+para\+programar&limit=20&offset=20&category=coding$/);
  assert.throws(() => svc.searchSkills('', 'nope'), /Unknown category/);
  assert.throws(() => svc.searchSkills('', ''), /choose a category/);
  assert.throws(() => svc.searchSkills('x', '', 0), /Invalid page/);

  const project = join(root, 'workspace', 'projects', 'acme');
  await assert.rejects(svc.installSkill('acme', 'bad/hash', 'project'), /Integrity check failed/);
  await assert.rejects(svc.installSkill('acme', 'bad/escape', 'project'), /outside/);
  assert.equal(existsSync(join(project, 'skills', 'escape')), false, 'failed installs leave nothing behind');
  await assert.rejects(svc.installSkill('acme', '../../x', 'project'), /Invalid skill id/);
  assert.throws(() => svc.installSkill('acme', 'good/lint', 'root'), /Choose where/);

  const r = await svc.installSkill('acme', 'good/lint', 'project');
  assert.equal(r.files, 2);
  assert.equal(readFileSync(join(project, 'skills', 'lint', 'refs', 'a.md'), 'utf8'), 'A');
  await assert.rejects(svc.installSkill('acme', 'good/lint', 'project'), /already installed/);
  await svc.installSkill('acme', 'good/lint', 'global');
  assert.ok(existsSync(join(home, '.claude', 'skills', 'lint', 'SKILL.md')) && existsSync(join(home, '.agents', 'skills', 'lint', 'SKILL.md')));
  assert.deepEqual(svc.installedSkills('acme'), { project: ['lint'], global: ['lint'] });

  assert.match(svc.launch(openAcme).prompt, /Skills installed for this project \(read workspace\/projects\/acme\/skills\/<name>\/SKILL\.md when one fits the task\): lint\./);
  rmSync(join(project, 'skills'), { recursive: true, force: true });
  assert.doesNotMatch(svc.launch(openAcme).prompt, /Skills installed/, 'requests are unchanged without project skills');
  rmSync(home, { recursive: true, force: true });
});

test('agents created from Skills & agents only use skills installed in their own folder', () => {
  const home = join(root, 'home-agents');
  const svc = createService(root, { ...noLaunch, home });
  const project = join(root, 'workspace', 'projects', 'acme');
  for (const dir of [join(project, 'skills', 'lint'), join(home, '.agents', 'skills', 'shared')]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), '---\nname: x\n---');
  }
  const scoped = svc.scopeAgents('acme', 'project');
  assert.deepEqual({ ...scoped, builtin: [] }, { skills: ['lint'], builtin: [], agents: [], folder: 'workspace/projects/acme/skills', agentsFolder: 'workspace/projects/acme/agents' });
  assert.ok(scoped.builtin.length > 0 && !scoped.builtin.some((b) => b.name === 'automation'), 'project agents may also use the framework\'s usable skills (not pending ones)');
  assert.deepEqual(svc.scopeAgents('acme', 'global').builtin, [], 'global agents only use global skills');

  const req = { name: 'API Tester', description: 'Act as a senior API tester: use @lint.\nList breaking changes.', skills: ['lint'], scope: 'project' };
  assert.throws(() => svc.createScopeAgent('acme', { ...req, skills: ['shared'] }), /"shared" is not installed in workspace\/projects\/acme\/skills/);
  assert.throws(() => svc.createScopeAgent('acme', { ...req, skills: ['../skills/lint'] }), /not installed/);
  assert.throws(() => svc.createScopeAgent('acme', { ...req, skills: [] }), /at least one skill/);
  assert.throws(() => svc.createScopeAgent('acme', { ...req, name: '!!' }), /name/);
  assert.throws(() => svc.createScopeAgent('acme', { ...req, scope: 'root' }), /Choose where/);
  assert.throws(() => svc.createScopeAgent('acme', { ...req, name: 'auto', skills: ['automation'] }), /not installed/, 'pending skills are not offered');

  assert.equal(svc.createScopeAgent('acme', req).name, 'api-tester');
  const text = readFileSync(join(project, 'agents', 'api-tester.md'), 'utf8');
  assert.match(text, /^---\nname: api-tester\ndescription: "Act as a senior API tester: use @lint\."\n---\n\nAct as a senior API tester/);
  assert.match(text, /Use only these skills \(read the SKILL\.md when one fits the task\)\. Do not use or install any other skill/);
  assert.match(text, /- `lint`: `workspace\/projects\/acme\/skills\/lint\/SKILL\.md`/);
  assert.doesNotMatch(text, /Quality Agents skills follow/, 'no framework note without framework skills');
  assert.throws(() => svc.createScopeAgent('acme', req), /already exists/);
  assert.match(svc.launch(openAcme).prompt, /Agents defined for this project \(.*agents\/<name>\.md and use only the skills it lists\): api-tester\./);

  const global = svc.createScopeAgent('acme', { ...req, name: 'helper', skills: ['shared'], scope: 'global' });
  assert.equal(global.file, join(home, '.claude', 'agents', 'helper.md'));
  assert.ok(readFileSync(global.file, 'utf8').includes(`\`${join(home, '.agents', 'skills', 'shared', 'SKILL.md')}\``));

  rmSync(join(project, 'skills'), { recursive: true, force: true });
  rmSync(join(project, 'agents'), { recursive: true, force: true });
  assert.doesNotMatch(svc.launch(openAcme).prompt, /Skills installed|Agents defined/, 'requests are unchanged without project skills or agents');
  rmSync(home, { recursive: true, force: true });
});

test('global tab and start screen: lists, opens and removes (to the trash) only what is installed for all projects', async () => {
  const home = join(root, 'home-global');
  const trashed: string[] = [];
  const openedFolders: string[] = [];
  const openedFiles: string[] = [];
  const svc = createService(root, {
    launch: () => ({ opened: true, message: '' }), openFolder: (f) => { openedFolders.push(f); }, openPath: (f) => { openedFiles.push(f); }, home,
    trash: async (p) => { trashed.push(p); rmSync(p, { recursive: true, force: true }); },
  });
  for (const dir of [join(home, '.claude', 'skills', 'shared'), join(home, '.agents', 'skills', 'shared')]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), '---\nname: shared\ndescription: Shared helper\n---');
  }
  mkdirSync(join(home, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(home, '.claude', 'agents', 'helper.md'), '---\nname: helper\ndescription: "Helps"\n---\n');
  svc.setupProject('acme', { description: '', linkedSkills: ['shared'] });

  const items = svc.globalItems();
  assert.deepEqual(items.skills, [{ name: 'shared', description: 'Shared helper', folders: [join(home, '.claude', 'skills', 'shared'), join(home, '.agents', 'skills', 'shared')], linkedBy: ['Acme'] }]);
  assert.deepEqual(items.agents, [{ name: 'helper', description: 'Helps', file: join(home, '.claude', 'agents', 'helper.md') }]);

  svc.openGlobal('skill', 'shared');
  svc.openGlobal('agent', 'helper');
  assert.deepEqual([openedFolders, openedFiles], [[join(home, '.claude', 'skills', 'shared')], [join(home, '.claude', 'agents', 'helper.md')]]);
  assert.throws(() => svc.openGlobal('skill', '../agents'), /not installed/);
  await assert.rejects(svc.removeGlobal('agent', '../../x'), /not installed/);
  await assert.rejects(svc.removeGlobal('file', 'helper'), /Unknown kind/);

  await svc.removeGlobal('skill', 'shared');
  await svc.removeGlobal('agent', 'helper');
  assert.equal(trashed.length, 3, 'a skill leaves every global folder');
  assert.deepEqual(svc.globalItems(), { skills: [], agents: [] });
  svc.setupProject('acme', { description: '', linkedSkills: [] });
  rmSync(home, { recursive: true, force: true });
});

test('set up: description and global skills linked by reference; requests name them', () => {
  const home = join(root, 'home-setup');
  const svc = createService(root, { launch: () => ({ opened: true, message: '' }), openFolder: () => {}, openPath: () => {}, home });
  const skill = join(home, '.claude', 'skills', 'react-dev');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), '---\nname: react-dev\n---');
  const setup = { project: 'acme', activity: 'setup', tool: 'print', files: [], language: 'English', note: '' };

  assert.throws(() => svc.setupProject('acme', { description: 'x', linkedSkills: ['ghost'] }), /Not installed for all projects: ghost/);
  const summary = svc.setupProject('acme', { description: 'quero iniciar um projeto com react\n', linkedSkills: ['react-dev', 'react-dev'] });
  assert.equal(summary.description, 'quero iniciar um projeto com react');
  assert.deepEqual(summary.linkedSkills, ['react-dev']);
  assert.ok(!existsSync(join(root, 'workspace', 'projects', 'acme', 'skills', 'react-dev')), 'nothing is copied');

  const prompt = svc.launch(setup).prompt;
  assert.match(prompt, /prepare this project for its goal: "quero iniciar um projeto com react"\./);
  assert.match(prompt, /proposed-updates\.md and wait for my approval/);
  assert.ok(prompt.includes(`Global skills linked to this project (read the SKILL.md when one fits the task): react-dev (${join(skill, 'SKILL.md')}).`));

  rmSync(skill, { recursive: true, force: true });
  assert.doesNotMatch(svc.launch(setup).prompt, /Global skills linked/, 'skills no longer installed are left out');
  svc.setupProject('acme', { description: '', linkedSkills: [] });
  rmSync(home, { recursive: true, force: true });
});

test('repository tab: installs, agents and removals in a linked .claude need confirmation and a backup; writeAllowed: false refuses', async () => {
  const fakeFetch = (async (url: string) => {
    const ok = url.includes('/api/skills/good/lint/bundle');
    return new Response(JSON.stringify(ok ? { files: [{ path: 'SKILL.md', content_base64: b64('---\nname: lint\ndescription: Lints\n---') }] } : {}), { status: ok ? 200 : 404 });
  }) as typeof fetch;
  const home = mkdtempSync(join(tmpdir(), 'qa-home-'));
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'qa-repo-')));
  const svc = createService(root, { ...noLaunch, home, fetch: fakeFetch, trash: async (p) => { rmSync(p, { recursive: true, force: true }); } });
  createProject('repo-tab', 'Repo tab', root);
  const project = join(root, 'workspace', 'projects', 'repo-tab');
  const backups = () => (existsSync(join(project, 'backups')) ? readdirSync(join(project, 'backups')).filter((n) => n.startsWith('claude-')) : []);

  // Without a linked folder, the project's own skills folder.
  mkdirSync(join(project, 'skills', 'old'), { recursive: true });
  writeFileSync(join(project, 'skills', 'old', 'SKILL.md'), '---\nname: old\ndescription: Old one\n---');
  assert.deepEqual(svc.projectItems('repo-tab').skills, [{ name: 'old', description: 'Old one' }]);
  await assert.rejects(svc.removeProjectItem('repo-tab', 'skill', '../skills'), /not installed/);
  await assert.rejects(svc.removeProjectItem('repo-tab', 'file', 'old'), /Unknown kind/);
  await svc.removeProjectItem('repo-tab', 'skill', 'old');
  assert.deepEqual(svc.projectItems('repo-tab').skills, []);

  const json = join(project, 'project.json');
  const setLink = (extra: Record<string, unknown>) => writeFileSync(json, JSON.stringify({ ...JSON.parse(readFileSync(json, 'utf8')), repositories: [{ name: 'app', localPath: repo, linkedFolder: true, ...extra }] }));
  setLink({});
  mkdirSync(join(repo, '.claude'));
  writeFileSync(join(repo, '.claude', 'settings.json'), '{"before":true}');

  assert.throws(() => svc.installSkill('repo-tab', 'good/lint', 'project'), /Confirm the install/);
  setLink({ writeAllowed: false });
  assert.throws(() => svc.installSkill('repo-tab', 'good/lint', 'project', true), /does not allow writing/);
  assert.deepEqual(backups(), []);
  setLink({});
  const installed = await svc.installSkill('repo-tab', 'good/lint', 'project', true);
  assert.ok(existsSync(join(repo, '.claude', 'skills', 'lint', 'SKILL.md')) && !existsSync(join(project, 'skills', 'lint')));
  assert.equal(readFileSync(join(installed.backup!, '.claude', 'settings.json'), 'utf8'), '{"before":true}');
  assert.equal(existsSync(join(installed.backup!, '.claude', 'skills')), false, 'the backup is the .claude from before the install');

  const label = `${repo.split(sep).join('/')}/.claude`;
  assert.deepEqual(svc.scopeAgents('repo-tab', 'project').folder, `${label}/skills`);
  const agent = { name: 'Repo Tester', description: 'Tests this repository with @lint.', skills: ['lint', 'failure-analysis'], scope: 'project' };
  assert.throws(() => svc.createScopeAgent('repo-tab', agent), /Confirm the agent/);
  const made = svc.createScopeAgent('repo-tab', agent, true);
  assert.equal(made.file, join(repo, '.claude', 'agents', 'repo-tester.md'));
  assert.ok(readFileSync(made.file, 'utf8').includes(`- \`failure-analysis\`: \`${root.split(sep).join('/')}/skills/failure-analysis/SKILL.md\``), 'framework skills get absolute paths in a repository');
  assert.ok(svc.launch({ ...openAcme, project: 'repo-tab' }).prompt.includes(`follow ${label}/agents/<name>.md and use only the skills it lists): repo-tester.`));

  assert.deepEqual(svc.projectItems('repo-tab'), {
    skillsFolder: `${label}/skills`, agentsFolder: `${label}/agents`,
    skills: [{ name: 'lint', description: 'Lints' }], agents: [{ name: 'repo-tester', description: 'Tests this repository with @lint.' }],
  });
  await assert.rejects(svc.removeProjectItem('repo-tab', 'agent', 'repo-tester'), /Confirm the removal/);
  const removed = await svc.removeProjectItem('repo-tab', 'agent', 'repo-tester', true);
  assert.ok(existsSync(join(removed.backup!, '.claude', 'agents', 'repo-tester.md')) && !existsSync(made.file));
  for (const dir of [repo, home, project]) rmSync(dir, { recursive: true, force: true });
});

test('non-ASCII prompts reach Windows tools through a UTF-8 request file', () => {
  const prompt = 'Review it. Additional instructions: permissões & ação "crítica".';
  assert.equal(windowsSafePrompt('plain ascii', 'acme', root, 'win32'), 'plain ascii');
  assert.equal(windowsSafePrompt(prompt, 'acme', root, 'linux'), prompt);
  const pointer = windowsSafePrompt(prompt, 'acme', root, 'win32');
  assert.match(pointer, /^[\x20-\x7e]+$/);
  const file = pointer.match(/workspace\/projects\/acme\/temporary\/request-[^ ]+\.md/)?.[0];
  assert.ok(file);
  assert.equal(readFileSync(join(root, file), 'utf8').trim(), prompt);
});

test('app plugins load only in app sessions: Claude by folder, Codex as one line of instructions', { skip: process.platform === 'win32' }, () => {
  const bin = mkdtempSync(join(tmpdir(), 'qa-bin-'));
  writeFileSync(join(bin, 'rtk'), '#!/bin/sh\n', { mode: 0o755 });
  const path = process.env.PATH;
  process.env.PATH = `${bin}:${path}`; // keeps node and which; rtk is the fake one, or none once removed
  try {
    const dir = join('/home/u/qa', 'adapters', 'app-plugins');
    assert.deepEqual(pluginArgs('claude', '/home/u/qa'), ['--plugin-dir', join(dir, 'ponytail'), '--plugin-dir', join(dir, 'rtk')]);
    const [flag, value] = pluginArgs('codex', '/home/u/qa');
    assert.equal(flag, '-c');
    assert.match(value, /^developer_instructions=Ponytail .*SKILL\.md.* rtk /);
    assert.doesNotMatch(value, /["\n%]/); // survives launcher scripts and cmd.exe quoting
    assert.deepEqual(pluginArgs('gemini', '/home/u/qa'), []);
    rmSync(join(bin, 'rtk'));
    process.env.PATH = (path ?? '').split(':').filter((d) => !existsSync(join(d, 'rtk'))).join(':');
    assert.deepEqual(pluginArgs('claude', '/home/u/qa'), ['--plugin-dir', join(dir, 'ponytail')]);
    assert.doesNotMatch(pluginArgs('codex', '/home/u/qa')[1], /rtk/);
  } finally {
    process.env.PATH = path;
    rmSync(bin, { recursive: true, force: true });
  }
});

test('launcher keeps user text out of any shell command line', () => {
  const sh = scriptFor('gemini', ['-i', "it's $(rm -rf ~) `x` ação"], '/home/u/qa', 'QA');
  assert.ok(sh.split('\n').includes("cd '/home/u/qa' || exit 1"));
  assert.ok(sh.split('\n').includes("gemini '-i' 'it'\\''s $(rm -rf ~) `x` ação'"));
  const win = windowsStartArgs('C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\Júlia\\qa\\run-tool.mjs', 'C:\\t\\open.json', 'Quality Agents - "X"');
  assert.equal(win, '/d /s /c "start "Quality Agents - X" "C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\Júlia\\qa\\run-tool.mjs" "C:\\t\\open.json""');
});

test('terminal tabs start only the chosen tool, in the framework root, with the prompt as one argument', { skip: process.platform === 'win32' }, () => {
  const bin = mkdtempSync(join(tmpdir(), 'qa-bin-'));
  writeFileSync(join(bin, 'claude'), '#!/bin/sh\n', { mode: 0o755 });
  const path = process.env.PATH;
  process.env.PATH = `${bin}:${path}`;
  try {
    const specs: TermSpec[] = [];
    const r = launchInTerminal('claude', "it's $(rm -rf ~)\nação", '/home/u/qa', (spec) => { specs.push(spec); return 't7'; });
    assert.deepEqual(r.terminal, { id: 't7', title: 'Claude Code' });
    const plugins = pluginArgs('claude', '/home/u/qa');
    assert.deepEqual(specs, [{ file: 'claude', args: [...plugins, "it's $(rm -rf ~) ação"], cwd: '/home/u/qa' }]);
    launchInTerminal('claude', '', '/home/u/qa', (spec) => { specs.push(spec); return 't8'; }); // "+" menu: the tool alone
    assert.deepEqual(specs[1], { file: 'claude', args: plugins, cwd: '/home/u/qa' });
    assert.throws(() => launchInTerminal('vscode', 'x', '/home/u/qa', () => 'never'), /does not run in a terminal/);
  } finally {
    process.env.PATH = path;
    rmSync(bin, { recursive: true, force: true });
  }
});

test('markdown rendering escapes HTML and attribute injection', () => {
  const html = markdownToHtml('[x](a"onmouseover="alert(1)) <img src=x onerror=alert(1)> **ok**');
  assert.doesNotMatch(html, /<img|"onmouseover|" onmouseover/);
  assert.match(html, /<strong>ok<\/strong>/);
});

test('docx extraction keeps headings, lists and tables', () => {
  const md = docxToMarkdown(makeDocx());
  assert.match(md, /^## US-1 Renovação$/m);
  assert.match(md, /^- Item A$/m);
  assert.match(md, /^\| AC1 \| a \\\| b & c \|$/m);
  assert.deepEqual(readableInputs(['workspace/x/inbox/a.md'], root), ['workspace/x/inbox/a.md']);
  assert.throws(() => docxToMarkdown(zip([['other.xml', '<x/>']])), /Not a Word document/);
});

test('installer framework sync refreshes framework files and never touches workspace/', () => {
  const bundled = mkdtempSync(join(tmpdir(), 'qa-bundle-'));
  const target = mkdtempSync(join(tmpdir(), 'qa-installed-'));
  try {
    mkdirSync(join(bundled, 'skills', 'a'), { recursive: true });
    writeFileSync(join(bundled, 'skills', 'a', 'SKILL.md'), 'v1');
    writeFileSync(join(bundled, 'AGENTS.md'), 'agents v1');
    mkdirSync(join(bundled, 'workspace'), { recursive: true });
    writeFileSync(join(bundled, 'workspace', 'README.md'), 'readme');

    assert.equal(syncFramework(bundled, target, 'build-1'), true);
    assert.equal(readFileSync(join(target, 'skills', 'a', 'SKILL.md'), 'utf8'), 'v1');
    assert.ok(existsSync(join(target, 'workspace', 'projects')));

    // The user's data, plus a stale framework file.
    mkdirSync(join(target, 'workspace', 'projects', 'p', 'runs'), { recursive: true });
    writeFileSync(join(target, 'workspace', 'projects', 'p', 'notes.md'), 'keep me');
    writeFileSync(join(target, 'skills', 'stale.md'), 'old');

    assert.equal(syncFramework(bundled, target, 'build-1'), false, 'same build: nothing to do');
    writeFileSync(join(bundled, 'skills', 'a', 'SKILL.md'), 'v2');
    assert.equal(syncFramework(bundled, target, 'build-2'), true);
    assert.equal(readFileSync(join(target, 'skills', 'a', 'SKILL.md'), 'utf8'), 'v2');
    assert.equal(existsSync(join(target, 'skills', 'stale.md')), false);
    assert.equal(readFileSync(join(target, 'workspace', 'projects', 'p', 'notes.md'), 'utf8'), 'keep me');
  } finally {
    rmSync(bundled, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test('fs-guard sandbox and file type rules', () => {
  const base = mkdtempSync(join(tmpdir(), 'qa-sandbox-'));
  try {
    mkdirSync(join(base, 'inbox'));
    writeFileSync(join(base, 'inbox', 'us.md'), 'x');
    assert.ok(resolveInside(base, 'inbox/us.md').endsWith('us.md'));
    assert.throws(() => resolveInside(base, 'inbox/../../outside.txt'), PathError);
    try {
      symlinkSync(tmpdir(), join(base, 'link'), 'junction');
      assert.throws(() => resolveInside(base, 'link'), PathError);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EPERM') throw e;
    }
  } finally { rmSync(base, { recursive: true, force: true }); }
  assert.equal(isEditable('a.md'), true);
  assert.equal(isEditable('state.json'), false);
  assert.equal(isOpenable('report.xlsx'), true);
  assert.equal(isOpenable('run.bat'), false);
});
