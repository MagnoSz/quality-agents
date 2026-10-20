import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, symlinkSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService, ServiceError, type FileContent, type TreeNode } from '../desktop/service.ts';
import { PathError, resolveInside, isEditable, isOpenable } from '../desktop/fs-guard.ts';
import { scriptFor, windowsStartArgs, type LaunchResult } from '../desktop/launcher.ts';
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

test('launcher keeps user text out of any shell command line', () => {
  const sh = scriptFor('gemini', ['-i', "it's $(rm -rf ~) `x` ação"], '/home/u/qa', 'QA');
  assert.ok(sh.split('\n').includes("cd '/home/u/qa' || exit 1"));
  assert.ok(sh.split('\n').includes("gemini '-i' 'it'\\''s $(rm -rf ~) `x` ação'"));
  const win = windowsStartArgs('C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\Júlia\\qa\\run-tool.mjs', 'C:\\t\\open.json', 'Quality Agents - "X"');
  assert.equal(win, '/d /s /c "start "Quality Agents - X" "C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\Júlia\\qa\\run-tool.mjs" "C:\\t\\open.json""');
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
