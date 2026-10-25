// Document style: how the PDF, Word and Excel files that activities and agents
// generate look (font, colours, background, header, footer, logo, watermark).
// Set in the desktop app (Settings › Documents) for all projects and, optionally,
// per project. The scripts that write deliverables read it, so every AI tool gets
// the same result. No dependencies.
//
// Files:  <root>/workspace/document-style.json                (all projects)
//         <root>/workspace/projects/<id>/document-style.json  (one project; wins)
// Header and footer texts can use {project}, {title}, {date}, {page} and {pages}.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { ROOT } from './repo.mjs';

export const STYLE_FILE = 'document-style.json';

// The look the deliverables had before styles existed: nothing changes until the user sets one.
export const DEFAULT_STYLE = Object.freeze({
  font: { family: 'Calibri', size: 10.5, color: '#1A1A1A' },
  accent: '#1F4E78', // titles and rules
  table: { header: '#1F4E78', headerText: '#FFFFFF', border: '#BFBFBF' },
  background: '#FFFFFF',
  header: { left: '', center: '', right: '', logo: '', logoSide: 'left' },
  footer: { left: '', center: '', right: '' },
  watermark: { text: '', color: '#808080', opacity: 0.12 },
});

export const FONTS = ['Calibri', 'Arial', 'Segoe UI', 'Helvetica', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Cambria', 'Garamond', 'Consolas'];
const LOGO_MAX = 700 * 1024; // characters of the data: URL

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v, fallback) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toUpperCase() : fallback);
const text = (v, max = 120) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : '');
const number = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback);
const logo = (v) => (typeof v === 'string' && v.length <= LOGO_MAX && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '');

// Any input (a file, the app's form) becomes a complete, safe style. Unknown keys are dropped.
export function normalizeStyle(input, base = DEFAULT_STYLE) {
  const s = input && typeof input === 'object' ? input : {};
  const f = s.font ?? {}; const tb = s.table ?? {}; const h = s.header ?? {}; const ft = s.footer ?? {}; const w = s.watermark ?? {};
  return {
    font: {
      family: typeof f.family === 'string' && FONTS.includes(f.family) ? f.family : base.font.family,
      size: number(f.size, 8, 16, base.font.size),
      color: color(f.color, base.font.color),
    },
    accent: color(s.accent, base.accent),
    table: { header: color(tb.header, base.table.header), headerText: color(tb.headerText, base.table.headerText), border: color(tb.border, base.table.border) },
    background: color(s.background, base.background),
    header: {
      left: 'left' in h ? text(h.left) : base.header.left,
      center: 'center' in h ? text(h.center) : base.header.center,
      right: 'right' in h ? text(h.right) : base.header.right,
      logo: 'logo' in h ? logo(h.logo) : base.header.logo,
      logoSide: h.logoSide === 'right' ? 'right' : h.logoSide === 'left' ? 'left' : base.header.logoSide,
    },
    footer: {
      left: 'left' in ft ? text(ft.left) : base.footer.left,
      center: 'center' in ft ? text(ft.center) : base.footer.center,
      right: 'right' in ft ? text(ft.right) : base.footer.right,
    },
    watermark: { text: 'text' in w ? text(w.text, 40) : base.watermark.text, color: color(w.color, base.watermark.color), opacity: number(w.opacity, 0.03, 0.5, base.watermark.opacity) },
  };
}

const readJson = (file) => { try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null; } catch { return null; } };

// The project a file is written for, from its path (…/workspace/projects/<id>/…).
export function projectOf(path, root = ROOT) {
  const projects = resolve(root, 'workspace', 'projects') + sep;
  const full = resolve(path);
  if (!full.startsWith(projects)) return null;
  const id = full.slice(projects.length).split(sep)[0];
  return id && /^[\w.-]+$/.test(id) ? id : null;
}

// The style for a file: --style file > its project's style > the style for all projects > defaults.
// Also the values for {project} and {title}.
export function styleFor(outPath, { root = ROOT, styleFile, title = '' } = {}) {
  const project = outPath ? projectOf(outPath, root) : null;
  const global = normalizeStyle(readJson(join(root, 'workspace', STYLE_FILE)));
  let style = project ? normalizeStyle(readJson(join(root, 'workspace', 'projects', project, STYLE_FILE)), global) : global;
  if (styleFile) style = normalizeStyle(readJson(resolve(styleFile)), style);
  const name = project ? String(readJson(join(root, 'workspace', 'projects', project, 'project.json'))?.name ?? project) : '';
  return { style, vars: { project: name, title, date: new Date().toLocaleDateString('pt-BR') } };
}

// {project}, {title}, {date}; {page} and {pages} are left for each format to fill.
export const fillVars = (value, vars) => String(value ?? '').replace(/\{(project|title|date)\}/g, (_, k) => vars[k] ?? '');

export const hasHeader = (s) => Boolean(s.header.left || s.header.center || s.header.right || s.header.logo);
export const hasFooter = (s) => Boolean(s.footer.left || s.footer.center || s.footer.right);
