// Extracts the text of a .docx (Word) file as Markdown, so any AI tool can read
// user stories written in Word. Keeps paragraphs, headings, list items and
// tables (where acceptance criteria and rules often live). No dependencies.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { unzip } from './zip.mjs';

const decode = (s: string): string => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');

function paragraphText(xml: string): string {
  let out = '';
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:drawing>|<w:pict>/g)) {
    if (m[0].startsWith('<w:t')) out += decode(m[1]);
    else if (m[0] === '<w:tab/>') out += '\t';
    else if (m[0] === '<w:br/>') out += ' ';
    else out += ' [image] ';
  }
  return out.replace(/[ \t]+/g, (w) => (w.includes('\t') ? ' ' : ' ')).trim();
}

function paragraph(xml: string): string {
  const text = paragraphText(xml);
  if (!text) return '';
  const style = xml.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? '';
  const heading = style.match(/^(?:Heading|T[ií]tulo|Titulo|Ttulo)(\d)$/i);
  if (heading) return `${'#'.repeat(Math.min(Number(heading[1]) + 1, 6))} ${text}`;
  if (/^(Title|T[ií]tulo|Ttulo)$/i.test(style)) return `# ${text}`;
  // Lists: direct numbering, or list styles (English and Portuguese style ids).
  if (xml.includes('<w:numPr>') || /^(List|Lista|P[aá]?rgrafodaLista|ListParagraph)/i.test(style)) return `- ${text}`;
  return text;
}

function table(xml: string): string {
  const rows = [...xml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((r) =>
    [...r[0].matchAll(/<w:tc[\s>][\s\S]*?<\/w:tc>/g)].map((cell) =>
      [...cell[0].matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((p) => paragraphText(p[0])).filter(Boolean).join(' ').replace(/\|/g, '\\|')));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
}

export function docxToMarkdown(buffer: Buffer): string {
  const files = unzip(buffer) as Map<string, Buffer>;
  const doc = files.get('word/document.xml');
  if (!doc) throw new Error('Not a Word document (word/document.xml missing).');
  const body = doc.toString('utf8').match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? '';
  const blocks: string[] = [];
  // Top-level tables and paragraphs, in document order (tables contain paragraphs, so match tables first).
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    const block = m[0].startsWith('<w:tbl>') ? table(m[0]) : paragraph(m[0]);
    if (block) blocks.push(block);
  }
  return `${blocks.join('\n\n')}\n`;
}

// For each repo-relative path, returns what the AI should read: Word files are
// converted once (and again when the .docx changes) into inbox/.extracted/.
export function readableInputs(files: string[], root: string): string[] {
  return files.map((rel) => {
    if (!/\.docx$/i.test(rel)) return rel;
    const source = join(root, rel);
    const outRel = `${dirname(rel)}/.extracted/${basename(rel)}.md`;
    const out = join(root, outRel);
    try {
      if (!existsSync(out) || statSync(out).mtimeMs < statSync(source).mtimeMs) {
        mkdirSync(dirname(out), { recursive: true });
        const header = `<!-- Text extracted automatically from ${basename(rel)} by Quality Agents. Check the original for images and formatting. -->\n\n`;
        writeFileSync(out, header + docxToMarkdown(readFileSync(source)));
      }
      return `${outRel} (text extracted from ${rel})`;
    } catch {
      return `${rel} (could not extract text automatically; ask the user to paste it)`;
    }
  });
}
