// Opens the built Moki window and checks the settings we use by hand:
// the Models screen scrolls and accepts a logo and a watermark, and
// Create skill lives only under Add a skill.

import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../../scripts/lib/repo.mjs';

const require = createRequire(import.meta.url);
const electronPath = require('electron') as string;

// 1×1 PNG. The window accepts data: images; this is enough to prove the logo landed.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let app: ElectronApplication;
let page: Page;
let scratch = '';

function addProject(root: string, id: string, name: string, extra: Record<string, unknown> = {}): void {
  const project = join(root, 'workspace', 'projects', id);
  cpSync(join(ROOT, 'templates', 'project-context'), project, { recursive: true });
  renameSync(join(project, 'gitignore.txt'), join(project, '.gitignore'));
  for (const dir of ['inbox', 'runs', 'temporary']) mkdirSync(join(project, dir), { recursive: true });
  const file = join(project, 'project.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  writeFileSync(file, `${JSON.stringify({ ...data, project: id, name, ...extra }, null, 2)}\n`);
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'moki-ui-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.0.0-test' }));
  cpSync(join(ROOT, 'skills'), join(root, 'skills'), { recursive: true });
  cpSync(join(ROOT, 'agents'), join(root, 'agents'), { recursive: true });
  cpSync(join(ROOT, 'templates'), join(root, 'templates'), { recursive: true });
  addProject(root, 'acme', 'Acme Library');
  return root;
}

// Opens the app in Portuguese on a project of `root` (acme), or on the workspace picker (null).
async function openApp(root: string, userData: string, project: string | null = 'acme'): Promise<{ app: ElectronApplication; page: Page }> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  env.QA_ROOT = root;
  env.QA_USER_DATA = userData;
  if (project) env.QA_OPEN_PROJECT = project; else delete env.QA_OPEN_PROJECT;
  delete env.QA_SCREENSHOT;
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: electronPath, cwd: ROOT, args: [ROOT], env, timeout: 60_000 });
  const page = await app.firstWindow();
  page.on('pageerror', (err) => console.error('pageerror', err.message));
  await page.evaluate(() => {
    localStorage.setItem('qa-ui-language', 'pt-BR');
    localStorage.setItem('qa-language', 'Portuguese (pt-BR)');
  });
  const reloaded = page.waitForEvent('load');
  await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].webContents.reload(); });
  await reloaded;
  return { app, page };
}

async function cssSize(selector: string): Promise<{ height: number; fontSize: string }> {
  return page.locator(selector).first().evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { height: box.height, fontSize: getComputedStyle(el).fontSize };
  });
}

test.describe.serial('Moki settings', () => {
  test.beforeAll(async () => {
    const root = fixture();
    const userData = mkdtempSync(join(tmpdir(), 'moki-profile-'));
    scratch = join(tmpdir(), 'moki-ui-keep');
    mkdirSync(scratch, { recursive: true });
    writeFileSync(join(scratch, 'root.txt'), `${root}\n${userData}\n`);
    ({ app, page } = await openApp(root, userData));
    await expect(page.getByRole('button', { name: 'Configurações' })).toBeVisible();
    await page.getByRole('button', { name: 'Configurações' }).click();
    await expect(page.getByRole('tab', { name: 'Modelos' })).toBeVisible();
  });

  test.afterAll(async () => {
    await app?.close();
    try {
      const [root, userData] = readFileSync(join(scratch, 'root.txt'), 'utf8').trim().split('\n');
      rmSync(root, { recursive: true, force: true });
      rmSync(userData, { recursive: true, force: true });
      rmSync(scratch, { recursive: true, force: true });
    } catch { /* the window may have exited before the paths were written */ }
  });

  test('Models scrolls and its controls share one size', async () => {
    await page.getByRole('tab', { name: 'Modelos' }).click();
    await expect(page.getByRole('heading', { name: 'Modelos' })).toBeVisible();
    const form = page.locator('.ds-form');
    const room = await form.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(room).toBeGreaterThan(40);
    await form.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar logo' })).toBeEnabled();
    await expect(page.getByPlaceholder('ex.: CONFIDENCIAL, RASCUNHO')).toBeEnabled();

    const empty = await cssSize('.ds-logo-empty');
    const button = await cssSize('.ds-logo .btn');
    const side = await cssSize('.ds-logo select');
    expect(button.fontSize).toBe(empty.fontSize);
    expect(side.fontSize).toBe(empty.fontSize);
    expect(Math.abs(button.height - empty.height)).toBeLessThan(1.5);
    expect(Math.abs(side.height - empty.height)).toBeLessThan(1.5);
  });

  test('a chosen logo shows in the form and in the preview', async () => {
    const logo = join(scratch, 'logo.png');
    writeFileSync(logo, PNG);
    await page.locator('.ds-logo input[type=file]').setInputFiles(logo);
    await expect(page.getByRole('img', { name: 'Logo' })).toBeVisible();
    await expect(page.locator('.ds-page img')).toBeVisible();
    await expect(page.getByText('Não foi possível ler esta imagem.')).toHaveCount(0);
  });

  test('a watermark text shows on the preview page', async () => {
    await page.getByPlaceholder('ex.: CONFIDENCIAL, RASCUNHO').fill('RASCUNHO');
    await expect(page.locator('.ds-page-mark')).toHaveText('RASCUNHO');
  });

  test('Create skill stays on Add a skill', async () => {
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: 'Nativas e criadas' }).click();
    await expect(page.getByRole('button', { name: 'Criar skill' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Adicionar skill' }).click();
    await expect(page.getByRole('tab', { name: 'Criar skill' })).toBeVisible();
  });
});

test.describe.serial('Moki tags', () => {
  let tagsApp: ElectronApplication;
  let tagsPage: Page;
  const dirs: string[] = [];

  test.beforeAll(async () => {
    const root = fixture();
    const userData = mkdtempSync(join(tmpdir(), 'moki-profile-'));
    dirs.push(root, userData);
    writeFileSync(join(root, 'workspace', 'tags.json'), JSON.stringify({ tags: [{ id: 'pagamentos', name: 'Pagamentos', color: '#3b82f6', description: '' }] }));
    addProject(root, 'docs', 'Docs', { tags: ['pagamentos'] });
    ({ app: tagsApp, page: tagsPage } = await openApp(root, userData));
  });

  test.afterAll(async () => {
    await tagsApp?.close();
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  test('a project tag brings the other project into the activity context', async () => {
    const input = tagsPage.locator('.sidebar-tags').getByRole('textbox', { name: 'Adicionar uma tag' });
    await input.fill('Pag');
    await tagsPage.getByRole('listbox').getByText('Pagamentos').click();
    await expect(tagsPage.locator('.sidebar-tags .tag-chip')).toHaveText('Pagamentos');

    await tagsPage.getByRole('button', { name: 'Abrir na sua ferramenta de IA' }).click();
    await tagsPage.getByRole('button', { name: /Só abrir o projeto/ }).click();
    await tagsPage.getByRole('button', { name: 'Continuar sem arquivos' }).click();
    await expect(tagsPage.getByRole('heading', { name: 'Qual contexto a IA deve considerar?' })).toBeVisible();
    const docs = tagsPage.locator('.context-source', { hasText: 'Docs' });
    await expect(docs.getByRole('checkbox')).toBeChecked();
    await docs.getByRole('checkbox').click();
    await expect(docs.getByRole('checkbox')).not.toBeChecked();
  });
});

test.describe.serial('Moki workspaces', () => {
  let wsApp: ElectronApplication;
  let wsPage: Page;
  const dirs: string[] = [];

  test.beforeAll(async () => {
    const root = fixture();
    const userData = mkdtempSync(join(tmpdir(), 'moki-profile-'));
    dirs.push(root, userData);
    ({ app: wsApp, page: wsPage } = await openApp(root, userData, null));
  });

  test.afterAll(async () => {
    await wsApp?.close();
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });

  test('the app starts on the workspace picker; a new workspace opens empty and can be switched back', async () => {
    await expect(wsPage.getByText('Escolha um workspace', { exact: false })).toBeVisible();
    await expect(wsPage.locator('.picker-cat')).toBeVisible();
    await wsPage.getByRole('button', { name: 'Criar' }).click();
    await wsPage.getByPlaceholder('ex.: Cliente X').fill('Cliente X');
    await wsPage.getByRole('button', { name: 'Criar workspace' }).click();
    await expect(wsPage.locator('.ws-switch-name')).toHaveText('Cliente X');
    await expect(wsPage.getByText('Nenhum projeto ainda.')).toBeVisible();

    await wsPage.locator('.ws-switch-btn').click();
    await wsPage.getByRole('menuitem', { name: 'Workspace', exact: true }).click();
    await expect(wsPage.locator('.ws-switch-name')).toHaveText('Workspace');
    await expect(wsPage.getByRole('button', { name: /Acme Library/ })).toBeVisible();
  });
});
