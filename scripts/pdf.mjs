// Renders a Markdown report to PDF using a locally installed Chromium-based
// browser (Edge ships with Windows; Chrome/Chromium elsewhere). No dependencies.
//
// Usage: node scripts/pdf.mjs <report.md> <report.pdf>
// Browser override: set QA_AGENTS_BROWSER to the browser executable path.
// Exit code 2 = no browser found; the HTML is still written next to the PDF path.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markdownToHtml, escHtml } from './lib/markdown.mjs';

export { markdownToHtml };

const CSS = `
@page { size: A4; margin: 18mm 16mm; }
body { font-family: "Segoe UI", Calibri, Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.45; }
h1 { font-size: 20pt; color: #1F4E78; border-bottom: 2px solid #1F4E78; padding-bottom: 4px; }
h2 { font-size: 14pt; color: #1F4E78; margin-top: 18pt; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin-top: 12pt; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; page-break-inside: auto; }
th { background: #1F4E78; color: #fff; text-align: left; }
th, td { border: 1px solid #bfbfbf; padding: 4px 6px; vertical-align: top; }
tr { page-break-inside: avoid; }
code { background: #f2f2f2; padding: 0 3px; }
blockquote { border-left: 3px solid #1F4E78; margin: 6pt 0; padding: 2pt 8pt; color: #333; }
`;

export function renderHtml(md, title) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${CSS}</style></head><body>${markdownToHtml(md)}</body></html>`;
}

function findBrowser() {
  if (process.env.QA_AGENTS_BROWSER) return process.env.QA_AGENTS_BROWSER;
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim(); } catch { /* next */ }
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) { console.error('Usage: node scripts/pdf.mjs <report.md> <report.pdf>'); process.exit(1); }
  const md = readFileSync(input, 'utf8');
  const title = (md.match(/^#\s+(.+)$/m) || [, 'Report'])[1];
  const pdfPath = resolve(output);
  const htmlPath = pdfPath.replace(/\.pdf$/i, '') + '.html';
  mkdirSync(dirname(pdfPath), { recursive: true });
  writeFileSync(htmlPath, renderHtml(md, title));
  const browser = findBrowser();
  if (!browser) {
    console.error(`No Edge/Chrome/Chromium found. HTML written to ${htmlPath}; open it and print to PDF, or set QA_AGENTS_BROWSER.`);
    process.exit(2);
  }
  const profile = join(tmpdir(), `qa-agents-pdf-${process.pid}`);
  try {
    execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: 'ignore', timeout: 120000 });
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
  if (!existsSync(pdfPath)) { console.error(`Browser did not produce ${pdfPath}. HTML is at ${htmlPath}.`); process.exit(1); }
  console.log(`Wrote ${pdfPath} (source HTML: ${htmlPath})`);
}
