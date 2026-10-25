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

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'moki-ui-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.0.0-test' }));
  cpSync(join(ROOT, 'skills'), join(root, 'skills'), { recursive: true });
  cpSync(join(ROOT, 'agents'), join(root, 'agents'), { recursive: true });
  cpSync(join(ROOT, 'templates'), join(root, 'templates'), { recursive: true });
  const project = join(root, 'workspace', 'projects', 'acme');
  cpSync(join(ROOT, 'templates', 'project-context'), project, { recursive: true });
  renameSync(join(project, 'gitignore.txt'), join(project, '.gitignore'));
  for (const dir of ['inbox', 'runs', 'temporary']) mkdirSync(join(project, dir), { recursive: true });
  const file = join(project, 'project.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  writeFileSync(file, `${JSON.stringify({ ...data, project: 'acme', name: 'Acme Library' }, null, 2)}\n`);
  return root;
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
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
    env.QA_ROOT = root;
    env.QA_USER_DATA = userData;
    env.QA_OPEN_PROJECT = 'acme';
    delete env.QA_SCREENSHOT;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({
      executablePath: electronPath,
      cwd: ROOT,
      args: [ROOT],
      env,
      timeout: 60_000,
    });
    page = await app.firstWindow();
    page.on('pageerror', (err) => console.error('pageerror', err.message));
    await page.evaluate(() => {
      localStorage.setItem('qa-ui-language', 'pt-BR');
      localStorage.setItem('qa-language', 'Portuguese (pt-BR)');
    });
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.webContents.reload();
    });
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
