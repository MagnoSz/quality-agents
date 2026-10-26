// Extracts a .docx (Word, LibreOffice, WordCraft...) as Markdown, so any AI tool can
// read user stories written in Word and the desktop app can preview them. Keeps
// headings, bold/italic/strikethrough, bulleted and numbered lists, links, tables,
// footnotes, comments, header/footer text and (for the app preview) the images and merged cells. No dependencies.
// ponytail: fonts, colors, underline, alignment and merged-cell shapes are not kept (Markdown has none).

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, posix, resolve } from 'node:path';
import { unzip } from './zip.mjs';

const decode = (s: string): string => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');
const escXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Document text is escaped so "*", "`", "[" or a leading "#" show as written instead of formatting.
const escMd = (s: string): string => s.replace(/[\\`*[\]~|]/g, '\\$&');
const escBlock = (s: string): string => s.replace(/^(\s*)(#|>|[-*+](?=\s)|`{3}|-{3})/, '$1\\$2').replace(/^(\s*\d+)\.(?=\s)/, '$1\\.');
const sup = (n: number): string => String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
const attr = (xml: string, name: string): string | undefined => xml.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
// Wingdings/Symbol characters common in checklists.
const SYMBOLS: Record<string, string> = { F0FC: '✓', F0FB: '✗', F0FE: '☑', F0FD: '☒', F0A8: '☐', F06F: '☐', F0A7: '▪', F0B7: '•', F0D8: '➢', F0E0: '→' };
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };
const IMAGE_BUDGET = 20 * 1024 * 1024; // images embedded in one preview; the rest become placeholders

const plainText = (xml: string): string => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => decode(m[1])).join('');

interface Ctx {
  rel: (id: string) => { target: string; external: boolean } | undefined;
  file: (path: string) => Buffer | undefined;
  styles: Map<string, { name: string; numId?: string; ilvl?: number }>;
  ordered: (numId: string, ilvl: number) => boolean;
  noteText: (kind: string, id: string) => string;
  notes: string[];
  comments: Map<string, string>;
  commentOrder: string[];
  preview: boolean;
  imageBytes: number;
}

function image(xml: string, ctx: Ctx): string {
  const box = xml.match(/<qa:box>([\s\S]*?)<\/qa:box>/);
  if (box) return ` ${escMd(decode(box[1]))} `;
  const alt = escMd(attr(xml.match(/<wp:docPr\b[^>]*>/)?.[0] ?? '', 'descr') || attr(xml.match(/<wp:docPr\b[^>]*>/)?.[0] ?? '', 'name') || '');
  const target = ctx.rel(attr(xml, 'r:embed') ?? attr(xml, 'r:id') ?? '')?.target ?? '';
  const type = IMAGE_TYPES[posix.extname(target).toLowerCase()];
  const data = ctx.preview && type ? ctx.file(target) : undefined;
  if (data && ctx.imageBytes + data.length <= IMAGE_BUDGET) {
    ctx.imageBytes += data.length;
    return `![${alt}](data:${type};base64,${data.toString('base64')})`;
  }
  return ` [image${alt ? `: ${alt}` : ''}] `;
}

// Markdown of the runs of a paragraph (or note, comment, cell paragraph).
function inline(xml: string, ctx: Ctx): string {
  type Seg = { text: string; b: boolean; i: boolean; s: boolean; link?: string; raw?: boolean };
  const segs: Seg[] = [];
  let link: string | undefined;
  for (const m of xml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').matchAll(/<w:hyperlink\b([^>]*)>|<\/w:hyperlink>|<w:(?:del|moveFrom)\b[^>]*>[\s\S]*?<\/w:(?:del|moveFrom)>|<w:r\b[^>]*>([\s\S]*?)<\/w:r>|<m:t(?:\s[^>]*)?>([\s\S]*?)<\/m:t>/g)) {
    if (m[0].startsWith('<w:hyperlink')) {
      const target = ctx.rel(attr(m[1], 'r:id') ?? '')?.target ?? '';
      link = /^(https?:|mailto:)/i.test(target) ? target.replace(/[\s()]/g, encodeURIComponent) : undefined;
    } else if (m[0] === '</w:hyperlink>') link = undefined;
    else if (m[3] !== undefined) segs.push({ text: escMd(decode(m[3])), b: false, i: false, s: false, link });
    else if (m[2] !== undefined) {
      const rPr = m[2].match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
      const on = (tag: string) => new RegExp(`<w:${tag}(?:\\s+w:val="(?:1|true|on)")?\\s*/>`).test(rPr);
      if (on('vanish')) continue;
      const fmt = { b: on('b'), i: on('i'), s: on('strike') || on('dstrike'), link };
      for (const t of m[2].replace(rPr, '').matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)\b[^>]*\/>|<w:noBreakHyphen\s*\/>|<w:sym\b[^>]*\/>|<w:(footnote|endnote|comment)Reference\b[^>]*\/>|<w:(drawing|pict|object)\b[\s\S]*?<\/w:\3>/g)) {
        const tag = t[0];
        if (t[1] !== undefined) segs.push({ text: escMd(decode(t[1])), ...fmt });
        else if (tag.startsWith('<w:tab')) segs.push({ text: '\t', ...fmt });
        else if (/^<w:(br|cr)\b/.test(tag)) { if (!/w:type="(page|column)"/.test(tag)) segs.push({ text: '\n', ...fmt }); }
        else if (tag.startsWith('<w:noBreakHyphen')) segs.push({ text: '-', ...fmt });
        else if (tag.startsWith('<w:sym')) segs.push({ text: SYMBOLS[(attr(tag, 'w:char') ?? '').toUpperCase()] ?? '', ...fmt });
        else if (t[2] === 'comment') {
          const id = attr(tag, 'w:id') ?? '';
          if (!ctx.commentOrder.includes(id)) ctx.commentOrder.push(id);
          segs.push({ text: `[comment ${ctx.commentOrder.indexOf(id) + 1}]`, b: false, i: false, s: false, raw: true });
        } else if (t[2]) {
          ctx.notes.push(ctx.noteText(t[2], attr(tag, 'w:id') ?? ''));
          segs.push({ text: sup(ctx.notes.length), b: false, i: false, s: false, raw: true });
        } else segs.push({ text: image(tag, ctx), b: false, i: false, s: false, link, raw: true });
      }
    }
  }
  // Consecutive runs with the same formatting are wrapped once; spaces stay outside the markers.
  let out = '';
  for (let k = 0; k < segs.length;) {
    const first = segs[k];
    let text = '';
    for (; k < segs.length && segs[k].b === first.b && segs[k].i === first.i && segs[k].s === first.s && segs[k].link === first.link; k++) text += segs[k].text;
    const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    let md = core;
    if (core && first.s) md = `~~${md}~~`;
    if (core && first.i) md = `*${md}*`;
    if (core && first.b) md = `**${md}**`;
    if (core && first.link) md = `[${md}](${first.link})`;
    out += lead + md + trail;
  }
  return out.replace(/[ \t]+/g, (w) => (w.includes('\t') ? ' ' : w.length > 1 ? ' ' : w)).replace(/ *\n */g, '\n').trim();
}

function paragraph(xml: string, ctx: Ctx): string {
  const text = inline(xml, ctx);
  if (!text) return '';
  const pPr = xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
  const styleId = pPr.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? '';
  const style = ctx.styles.get(styleId);
  const name = style?.name.toLowerCase() ?? '';
  const oneLine = text.replace(/\n/g, ' ');
  const heading = name.match(/^heading (\d)$/) ?? styleId.match(/^(?:Heading|T[ií]tulo|Titulo|Ttulo)(\d)$/i);
  if (heading) return `${'#'.repeat(Math.min(Number(heading[1]) + 1, 6))} ${oneLine}`;
  if (name === 'title' || /^(Title|T[ií]tulo|Ttulo)$/i.test(styleId)) return `# ${oneLine}`;
  const numId = pPr.match(/<w:numId w:val="(\d+)"/)?.[1] ?? style?.numId;
  // Level: from the paragraph, else from the style ("List Bullet 2" is level 2).
  const ilvl = Number(pPr.match(/<w:ilvl w:val="(\d+)"/)?.[1] ?? (Number(name.match(/^list \w+ (\d)$/)?.[1] ?? 1) - 1 || style?.ilvl || 0));
  if ((numId && numId !== '0') || /^list (bullet|number)/.test(name) || /^(List|Lista|P[aá]?rgrafodaLista|ListParagraph)/i.test(styleId)) {
    const ordered = numId && numId !== '0' ? ctx.ordered(numId, ilvl) : /number|numera/i.test(name || styleId);
    return `${ilvl > 0 ? '  ' : ''}${ordered ? '1.' : '-'} ${oneLine}`;
  }
  if (/quote|cita/.test(name)) return `> ${oneLine}`;
  return escBlock(text).replace(/\n/g, '  \n');
}

function table(xml: string, ctx: Ctx): string {
  const rows = [...xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((r) => [...r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].flatMap((cell) => {
    const tcPr = cell[0].match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? '';
    // A merged cell covers several grid cells. The preview marks them (<< merges into the cell on the left,
    // ^^ into the cell above) so it draws one cell; the AI text keeps them empty so the columns line up.
    const span = Number(tcPr.match(/<w:gridSpan w:val="(\d+)"/)?.[1] ?? 1);
    const continued = /<w:vMerge(?:\s+w:val="continue")?\s*\/>/.test(tcPr);
    const text = continued ? (ctx.preview ? '^^' : '') : [...cell[0].matchAll(/<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map((p) => inline(p[0], ctx).replace(/\n/g, ' ')).filter(Boolean).join(' ').replace(/^(<<|\^\^)$/, '\\$1');
    return [text, ...Array<string>(Math.max(0, span - 1)).fill(ctx.preview ? '<<' : '')];
  }));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
}

// preview: for the desktop app (images embedded, merged cells marked); the AI text leaves both out.
export function docxToMarkdown(buffer: Buffer, { preview = false }: { preview?: boolean } = {}): string {
  const files = unzip(buffer) as Map<string, Buffer>;
  const read = (name: string): string => files.get(name)?.toString('utf8') ?? '';
  const relsOf = (part: string) => {
    const dir = posix.dirname(part);
    const map = new Map<string, { target: string; external: boolean; type: string }>();
    for (const m of read(`${dir === '.' ? '' : `${dir}/`}_rels/${posix.basename(part)}.rels`).matchAll(/<Relationship\b[^>]*>/g)) {
      const target = decode(attr(m[0], 'Target') ?? '');
      const external = attr(m[0], 'TargetMode') === 'External';
      map.set(attr(m[0], 'Id') ?? '', { target: external ? target : target.startsWith('/') ? target.slice(1) : posix.join(dir, target), external, type: attr(m[0], 'Type') ?? '' });
    }
    return map;
  };
  const main = [...relsOf('').values()].find((r) => r.type.endsWith('/officeDocument'))?.target ?? 'word/document.xml';
  const doc = read(main);
  if (!doc) throw new Error('Not a Word document (word/document.xml missing).');
  const rels = relsOf(main);
  const partOf = (type: string) => [...rels.values()].filter((r) => r.type.endsWith(`/${type}`)).map((r) => r.target);

  const styles = new Map<string, { name: string; numId?: string; ilvl?: number }>();
  for (const m of read(partOf('styles')[0] ?? '').matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)) {
    const id = attr(m[0], 'w:styleId');
    if (id) styles.set(id, { name: m[0].match(/<w:name w:val="([^"]*)"/)?.[1] ?? '', numId: m[0].match(/<w:numId w:val="(\d+)"/)?.[1], ilvl: Number(m[0].match(/<w:ilvl w:val="(\d+)"/)?.[1] ?? 0) });
  }
  const numbering = read(partOf('numbering')[0] ?? '');
  const abstractOf = new Map([...numbering.matchAll(/<w:num\b[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId w:val="(\d+)"/g)].map((m) => [m[1], m[2]]));
  const formats = new Map([...numbering.matchAll(/<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g)].map((m) =>
    [m[1], new Map([...m[2].matchAll(/<w:lvl\b[^>]*w:ilvl="(\d+)"[^>]*>[\s\S]*?<w:numFmt w:val="([^"]+)"/g)].map((l) => [Number(l[1]), l[2]]))]));
  const notesXml: Record<string, string> = { footnote: read(partOf('footnotes')[0] ?? ''), endnote: read(partOf('endnotes')[0] ?? '') };

  const ctx: Ctx = {
    rel: (id) => rels.get(id),
    file: (path) => files.get(path),
    styles,
    ordered: (numId, ilvl) => !['bullet', 'none'].includes(formats.get(abstractOf.get(numId) ?? '')?.get(ilvl) ?? 'bullet'),
    noteText: (kind, id) => {
      const note = notesXml[kind].match(new RegExp(`<w:${kind}\\b[^>]*w:id="${id}"[^>]*>([\\s\\S]*?)</w:${kind}>`))?.[1] ?? '';
      return [...note.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map((p) => inline(p[0], ctx).replace(/\n/g, ' ')).filter(Boolean).join(' ');
    },
    notes: [],
    comments: new Map(),
    commentOrder: [],
    preview,
    imageBytes: 0,
  };
  for (const m of read(partOf('comments')[0] ?? '').matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
    const text = [...m[2].matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map((p) => inline(p[0], ctx).replace(/\n/g, ' ')).filter(Boolean).join(' ');
    ctx.comments.set(attr(m[1], 'w:id') ?? '', `${attr(m[1], 'w:author') ? `${escMd(decode(attr(m[1], 'w:author')!))}: ` : ''}${text}`);
  }

  let body = (doc.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? '')
    // Old-Word fallback copies of shapes would repeat their text.
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '')
    // Text boxes hold whole paragraphs inside a paragraph: keep their text, inline.
    .replace(/<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g, (_, inner: string) =>
      `<qa:box>${escXml([...inner.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map((p) => plainText(p[0])).filter(Boolean).join(' '))}</qa:box>`);
  // A table inside a table cell becomes a line of text in that cell (innermost first).
  for (;;) {
    let depth = 0;
    let start = -1;
    let found: [number, number] | null = null;
    for (const m of body.matchAll(/<w:tbl\b[^>]*>|<\/w:tbl>/g)) {
      if (m[0] !== '</w:tbl>') { depth++; if (depth >= 2) start = m.index!; } else if (depth >= 2 && start >= 0) { found = [start, m.index! + m[0].length]; break; } else depth--;
    }
    if (!found) break;
    const inner = body.slice(found[0], found[1]);
    const text = [...inner.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((r) => [...r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) => plainText(c[0])).join(' / ')).join(' ; ');
    body = `${body.slice(0, found[0])}<w:p><w:r><w:t>${escXml(text)}</w:t></w:r></w:p>${body.slice(found[1])}`;
  }

  let out = '';
  let prevList = false;
  // Top-level tables and paragraphs, in document order (tables contain paragraphs, so match tables first).
  for (const m of body.matchAll(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    const block = m[0].startsWith('<w:tbl') ? table(m[0], ctx) : paragraph(m[0], ctx);
    if (!block) continue;
    const isList = /^ {0,2}(-|1\.) /.test(block) && !m[0].startsWith('<w:tbl');
    out += out ? (isList && prevList ? '\n' : '\n\n') : '';
    out += block;
    prevList = isList;
  }

  // Notes, comments, header and footer go after the text, as Word shows them around it.
  const extra: string[] = [];
  ctx.notes.forEach((text, i) => extra.push(`${sup(i + 1)} ${text}`));
  ctx.commentOrder.forEach((id, i) => extra.push(`**Comment ${i + 1}** — ${ctx.comments.get(id) ?? ''}`));
  for (const kind of ['header', 'footer']) {
    const texts = [...new Set(partOf(kind).map((part) => [...read(part).matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].map((p) => inline(p[0], ctx).replace(/\n/g, ' ')).filter(Boolean).join(' ')).filter(Boolean))];
    if (texts.length) extra.push(`**${kind === 'header' ? 'Header' : 'Footer'}:** ${texts.join(' · ')}`);
  }
  return `${out}${extra.length ? `\n\n---\n\n${extra.join('\n\n')}` : ''}\n`;
}

// For each repo-relative path, returns what the AI should read: Word files are
// converted once (and again when the .docx changes) into inbox/.extracted/.
export function readableInputs(files: string[], root: string): string[] {
  return files.map((rel) => {
    if (!/\.docx$/i.test(rel)) return rel;
    const source = resolve(root, rel); // rel may be an absolute path (a workspace outside the framework)
    const outRel = `${dirname(rel)}/.extracted/${basename(rel)}.md`;
    const out = resolve(root, outRel);
    try {
      if (!existsSync(out) || statSync(out).mtimeMs < statSync(source).mtimeMs) {
        mkdirSync(dirname(out), { recursive: true });
        const header = `<!-- Text extracted automatically from ${basename(rel)} by Moki. Check the original for images and formatting. -->\n\n`;
        writeFileSync(out, header + docxToMarkdown(readFileSync(source)));
      }
      return `${outRel} (text extracted from ${rel})`;
    } catch {
      return `${rel} (could not extract text automatically; ask the user to paste it)`;
    }
  });
}
