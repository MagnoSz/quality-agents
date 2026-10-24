// Search and install Agent Skills from the public SkillMD registry
// (api.skillmd.com, the same API the `skillmds` CLI uses). Runs in the main
// process — the UI has no network access. Installs verify every file against
// the registry's sha256 and write only inside the chosen skills folder.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveInside } from './fs-guard.ts';

const API = 'https://api.skillmd.com';
const TIMEOUT_MS = 20_000; // the registry sometimes takes 30 s and then fails; fail sooner and let the user retry
const PAGE_SIZE = 20;
export const MAX_PAGE = 500;
const MAX_FILES = 200;
const MAX_BYTES = 20 * 1024 * 1024;
const SLUG = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;
// Companion files not stored in the registry may only come from GitHub raw content.
const SOURCE_HOST = 'https://raw.githubusercontent.com/';

export const CATEGORIES = ['coding', 'design', 'web', 'ai-ml', 'devops', 'security', 'data', 'docs', 'productivity', 'product', 'research', 'integrations', 'marketing'];

export interface RegistrySkill {
  slug: string; title: string; description: string; category: string;
  verified: boolean; verdict: string | null; rating: number; installs: number;
}

export interface SearchPage { items: RegistrySkill[]; page: number; pages: number; total: number; capped: boolean }

export interface InstallResult { name: string; files: number; folders: string[]; unverified: string[] }

type Fetch = typeof fetch;

async function get(url: string, doFetch: Fetch): Promise<Response> {
  let res: Response;
  try {
    res = await doFetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new Error(e instanceof Error && e.name === 'TimeoutError'
      ? 'The skill registry did not answer in time. Try again in a moment.'
      : 'Could not reach the skill registry (api.skillmd.com). Check the internet connection.');
  }
  if (res.status === 404) throw new Error('Skill not found in the registry.');
  if (!res.ok) throw new Error(`The skill registry is unavailable right now (${res.status}). Try again in a moment.`);
  return res;
}

// The registry pages with limit/offset and reports the total (capped for very broad searches).
export async function searchSkills(query: string, category = '', page = 1, doFetch: Fetch = fetch): Promise<SearchPage> {
  const params = new URLSearchParams({ q: query, limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
  if (category) params.set('category', category);
  const data = await (await get(`${API}/api/search?${params}`, doFetch)).json() as { items?: Record<string, unknown>[]; total?: unknown; total_capped?: unknown };
  const total = Number(data.total) || 0;
  return { items: toSkills(data.items ?? []), page, pages: Math.min(MAX_PAGE, Math.max(1, Math.ceil(total / PAGE_SIZE))), total, capped: data.total_capped === true };
}

function toSkills(items: Record<string, unknown>[]): RegistrySkill[] {
  return items.filter((i) => typeof i.slug === 'string' && SLUG.test(i.slug)).map((i) => ({
    slug: String(i.slug), title: String(i.title ?? i.slug), description: String(i.description ?? ''),
    category: String(i.category ?? ''), verified: i.verified === true,
    verdict: typeof i.verdict === 'string' ? i.verdict : null,
    rating: Number(i.avg_rating) || 0, installs: Number(i.install_count) || 0,
  }));
}

// beforeWrite runs once everything is downloaded and verified, right before the first file is written.
export async function installSkill(slug: string, targets: string[], doFetch: Fetch = fetch, beforeWrite?: () => void): Promise<InstallResult> {
  if (!SLUG.test(slug)) throw new Error('Invalid skill id.');
  const name = slug.split('/')[1];
  for (const t of targets) if (existsSync(join(t, name))) throw new Error(`"${name}" is already installed in ${t}.`);

  const bundle = await (await get(`${API}/api/skills/${slug}/bundle?format=json`, doFetch)).json() as { files?: Record<string, unknown>[] };
  if (!Array.isArray(bundle.files)) throw new Error('The registry returned no files for this skill.');
  if (bundle.files.length > MAX_FILES) throw new Error(`This skill has more than ${MAX_FILES} files.`);

  const files: { path: string; data: Buffer }[] = [];
  const unverified: string[] = [];
  let bytes = 0;
  for (const f of bundle.files) {
    const path = String(f.path ?? '');
    const url = typeof f.source_url === 'string' ? f.source_url : '';
    let data: Buffer;
    if (typeof f.content_base64 === 'string') data = Buffer.from(f.content_base64, 'base64');
    else if (url.startsWith(SOURCE_HOST)) data = Buffer.from(await (await get(url, doFetch)).arrayBuffer());
    else continue;
    bytes += data.length;
    if (bytes > MAX_BYTES) throw new Error(`This skill is larger than ${MAX_BYTES / 1048576} MB.`);
    if (typeof f.sha256 === 'string') {
      if (createHash('sha256').update(data).digest('hex') !== f.sha256) throw new Error(`Integrity check failed for "${path}". Nothing was installed.`);
    } else if (url) unverified.push(path); // fetched from GitHub; the registry has no hash for it
    else if (path !== 'SKILL.md') throw new Error(`"${path}" has no checksum in the registry. Nothing was installed.`);
    files.push({ path, data });
  }
  if (!files.some((f) => f.path === 'SKILL.md')) throw new Error('This skill has no SKILL.md.');

  beforeWrite?.();
  const folders: string[] = [];
  try {
    for (const t of targets) {
      const dir = join(t, name);
      mkdirSync(dir, { recursive: true });
      folders.push(dir);
      for (const f of files) {
        const file = resolveInside(dir, f.path); // refuses ../ and absolute paths
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, f.data);
      }
    }
  } catch (e) {
    for (const dir of folders) rmSync(dir, { recursive: true, force: true });
    throw new Error(`Could not install "${name}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { name, files: files.length, folders, unverified };
}
