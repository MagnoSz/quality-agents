// Writes .docx deliverables (test evidence) from a list of blocks: headings,
// paragraphs, tables and images. With --template, the user's Word model is
// kept (styles, header/footer, logo, page setup): {{placeholders}} are filled
// and the blocks go where the {{content}} paragraph is; a model without any
// placeholder is treated as an example, so its body is replaced by the blocks.
// URLs in any text become clickable links. No dependencies.
//
// Usage:
//   node scripts/docx.mjs write --data <document.json> --out <file.docx> [--template <model.docx>]
//   node scripts/docx.mjs inspect <model.docx>      (outline, styles and placeholders of a model)
//
// document.json: { "fields": { "<placeholder>": "value" }, "blocks": [
//   { "type": "heading", "level": 0-3, "text": "..." },          (level 0 = document title)
//   { "type": "paragraph", "text": "...", "bold": false },
//   { "type": "table", "rows": [["Field", "Value"], ["a", "b"]], "header": true, "labels": false },
//   { "type": "image", "path": "<file.png|jpg>", "caption": "...", "width": 16 },   (cm; default = page text width)
//   { "type": "pageBreak" } ] }
// Image paths are relative to document.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zip, unzip } from './lib/zip.mjs';
import { parseArgs } from './lib/repo.mjs';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

const esc = (s) => String(s ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const DEFAULT_STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + `<w:styles xmlns:w="${W}">`
  + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault>'
  + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
  + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
  + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="40"/></w:rPr></w:style>'
  + [32, 26, 22].map((sz, i) => `<w:style w:type="paragraph" w:styleId="Heading${i + 1}"><w:name w:val="heading ${i + 1}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${i ? 200 : 360}" w:after="120"/><w:outlineLvl w:val="${i}"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="${sz}"/></w:rPr></w:style>`).join('')
  + '<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:i/><w:color w:val="595959"/><w:sz w:val="18"/></w:rPr></w:style>'
  + '</w:styles>';

// A4, 2 cm side margins: 17 cm of text width.
const DEFAULT_SECTION = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';

export function imageInfo(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { ext: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { ext: 'jpeg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  throw new Error('unsupported image (use PNG or JPEG)');
}

// Style ids differ by Word language (Heading1 vs Ttulo1); the internal name does not.
function styleIds(stylesXml) {
  const ids = {};
  for (const m of stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const name = m[2].match(/<w:name w:val="([^"]+)"/)?.[1]?.toLowerCase();
    if (name && !ids[name]) ids[name] = m[1];
  }
  return ids;
}

function paragraphs(xml) {
  return [...xml.matchAll(/<w:p\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/w:p>)/g)].map((m) => m[0]);
}
const textOf = (p) => [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((t) => unesc(t[1])).join('');
const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function buildDocx(doc, { template, baseDir = '.' } = {}) {
  const files = template ? unzip(template) : new Map();
  const warnings = [];
  const text = (name) => files.get(name)?.toString('utf8') ?? '';
  let body = template ? text('word/document.xml') : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}"><w:body>${DEFAULT_SECTION}</w:body></w:document>`;
  if (!template) files.set('word/styles.xml', Buffer.from(DEFAULT_STYLES));
  const styles = styleIds(text('word/styles.xml'));
  let rels = text('word/_rels/document.xml.rels') || `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/></Relationships>`;
  const newRels = [];
  const media = new Set();

  const sect = [...body.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].pop()?.[0] ?? DEFAULT_SECTION;
  const pageW = Number(sect.match(/<w:pgSz\b[^>]*w:w="(\d+)"/)?.[1] ?? 11906);
  const margins = ['left', 'right'].map((side) => Number(sect.match(new RegExp(`<w:pgMar\\b[^>]*w:${side}="(\\d+)"`))?.[1] ?? 1134));
  const textWidth = pageW - margins[0] - margins[1]; // twips
  let drawingId = Math.max(0, ...[...body.matchAll(/<wp:docPr\b[^>]*\bid="(\d+)"/g)].map((m) => Number(m[1])));

  const runs = (value, rPr = '') => String(value ?? '').split(/(https?:\/\/[^\s<>"]+)/).map((part, i) => {
    if (!part) return '';
    const lines = part.split('\n').map((l) => `<w:t xml:space="preserve">${esc(l)}</w:t>`).join('<w:br/>');
    if (i % 2 === 0) return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}${lines}</w:r>`;
    const id = `rIdEv${newRels.length + 1}`;
    newRels.push(`<Relationship Id="${id}" Type="${R}/hyperlink" Target="${esc(part)}" TargetMode="External"/>`);
    return `<w:hyperlink r:id="${id}" w:history="1"><w:r><w:rPr>${rPr}<w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>${lines}</w:r></w:hyperlink>`;
  }).join('');
  const para = (value, { style, rPr = '', pPr = '' } = {}) => {
    const props = (style ? `<w:pStyle w:val="${style}"/>` : '') + pPr;
    return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs(value, rPr)}</w:p>`;
  };

  const block = (b) => {
    if (b.type === 'heading') {
      const level = Math.min(Math.max(Number(b.level ?? 1), 0), 3);
      const style = styles[level ? `heading ${level}` : 'title'];
      return para(b.text, style ? { style } : { rPr: `<w:b/><w:sz w:val="${[40, 32, 26, 22][level]}"/>` });
    }
    if (b.type === 'paragraph') return para(b.text, { rPr: b.bold ? '<w:b/>' : '' });
    if (b.type === 'pageBreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    if (b.type === 'table') {
      const rows = b.rows ?? [];
      const cols = Math.max(1, ...rows.map((r) => r.length));
      // Label column (key/value tables) gets 30% of the width; the rest share it equally.
      const widths = Array.from({ length: cols }, (_, c) => Math.floor(b.labels && cols > 1 ? (c ? textWidth * 0.7 / (cols - 1) : textWidth * 0.3) : textWidth / cols));
      const border = (side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`;
      const tr = (row, r) => {
        const head = b.header && r === 0;
        const cells = Array.from({ length: cols }, (_, c) => {
          const bold = head || (b.labels && c === 0);
          const shade = head ? '<w:shd w:val="clear" w:color="auto" w:fill="1F4E78"/>' : bold ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : '';
          const rPr = (bold ? '<w:b/>' : '') + (head ? '<w:color w:val="FFFFFF"/>' : '');
          return `<w:tc><w:tcPr><w:tcW w:w="${widths[c]}" w:type="dxa"/>${shade}</w:tcPr>${para(row[c], { rPr, pPr: '<w:spacing w:after="0"/>' })}</w:tc>`;
        }).join('');
        return `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells}</w:tr>`;
      };
      return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, w) => a + w, 0)}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders>`
        + `<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
        + `${rows.map(tr).join('')}</w:tbl><w:p/>`;
    }
    if (b.type === 'image') {
      const file = resolve(baseDir, b.path);
      const data = readFileSync(file);
      const info = imageInfo(data);
      const id = ++drawingId;
      const name = `media/evidence-${id}.${info.ext}`;
      files.set(`word/${name}`, data);
      media.add(info.ext);
      const rid = `rIdEv${newRels.length + 1}`;
      newRels.push(`<Relationship Id="${rid}" Type="${R}/image" Target="${name}"/>`);
      const maxCx = textWidth * 635; // twips -> EMU
      const cx = Math.round(Math.min(b.width ? b.width * 360000 : maxCx, maxCx, info.w * 9525));
      const cy = Math.round(cx * info.h / info.w);
      const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Evidence ${id}" descr="${esc(b.caption ?? '')}"/>`
        + `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${A}"><a:graphicData uri="${PIC}">`
        + `<pic:pic xmlns:pic="${PIC}"><pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
        + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
      const image = `<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr><w:r>${drawing}</w:r></w:p>`;
      const caption = styles.caption ? para(b.caption, { style: styles.caption }) : para(b.caption, { rPr: '<w:i/><w:sz w:val="18"/>', pPr: '<w:jc w:val="center"/>' });
      return image + (b.caption ? caption : '');
    }
    warnings.push(`unknown block type "${b.type}" skipped`);
    return '';
  };
  const content = (doc.blocks ?? []).map(block).join('');

  // ponytail: placeholders inside text boxes (nested paragraphs) are not filled; add when a model needs it.
  const fill = (xml, allowContent) => {
    let placed = false;
    const out = xml.replace(/<w:p\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/w:p>)/g, (p) => {
      const t = textOf(p);
      if (!t.includes('{{')) return p;
      if (allowContent && /^\s*\{\{\s*content\s*\}\}\s*$/.test(t)) { placed = true; return content; }
      const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
      const rPr = p.match(/<w:r\b[^>]*>\s*<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? '';
      const value = t.replace(PLACEHOLDER, (m, key) => {
        if (key in (doc.fields ?? {})) return doc.fields[key];
        warnings.push(`placeholder {{${key}}} has no value`);
        return m;
      });
      return `<w:p>${pPr}${runs(value, rPr)}</w:p>`;
    });
    return { out, placed };
  };

  if (!template) body = body.replace('<w:body>', `<w:body>${content}`);
  else {
    const hasPlaceholders = [...files.keys()].some((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n) && /\{\{/.test(paragraphs(text(n)).map(textOf).join('')));
    for (const name of [...files.keys()].filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))) files.set(name, Buffer.from(fill(text(name), false).out));
    if (hasPlaceholders) {
      const { out, placed } = fill(body, true);
      body = out;
      if (!placed) {
        // Before the final section properties, or at the end of the body.
        const sectAt = body.lastIndexOf('<w:sectPr');
        const at = sectAt > body.lastIndexOf('</w:p>') ? sectAt : body.lastIndexOf('</w:body>');
        body = body.slice(0, at) + content + body.slice(at);
      }
    } else {
      // An example document: keep page setup, header and footer; replace the body.
      body = body.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${content}${sect}</w:body>`);
    }
    body = body.replace(/<w:document\b([^>]*)>/, (tag, attrs) => `<w:document${attrs}${attrs.includes('xmlns:r=') ? '' : ` xmlns:r="${R}"`}${attrs.includes('xmlns:wp=') ? '' : ` xmlns:wp="${WP}"`}>`);
  }
  files.set('word/document.xml', Buffer.from(body));
  files.set('word/_rels/document.xml.rels', Buffer.from(rels.replace('</Relationships>', `${newRels.join('')}</Relationships>`)));

  let types = text('[Content_Types].xml') || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  for (const ext of media) {
    if (!new RegExp(`Extension="${ext}"`, 'i').test(types)) types = types.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext}"/></Types>`);
  }
  files.set('[Content_Types].xml', Buffer.from(types));
  if (!files.has('_rels/.rels')) files.set('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`));

  const order = ['[Content_Types].xml', ...[...files.keys()].filter((n) => n !== '[Content_Types].xml')];
  return { buffer: zip(order.map((n) => [n, files.get(n)])), warnings };
}

// What a model contains, so the AI can reproduce its structure.
export function inspectDocx(buf) {
  const files = unzip(buf);
  const text = (name) => files.get(name)?.toString('utf8') ?? '';
  const styles = styleIds(text('word/styles.xml'));
  const nameOf = Object.fromEntries(Object.entries(styles).map(([name, id]) => [id, name]));
  const lines = [];
  const body = text('word/document.xml').match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? '';
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/w:p>)/g)) {
    if (m[0].startsWith('<w:tbl>')) {
      const rows = [...m[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((r) => [...r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) => textOf(c[0]).trim()));
      lines.push(`[table ${rows.length}x${Math.max(0, ...rows.map((r) => r.length))}]`, ...rows.map((r) => `  | ${r.join(' | ')} |`));
      continue;
    }
    const t = textOf(m[0]).trim();
    const images = (m[0].match(/<w:drawing>|<w:pict>/g) ?? []).length;
    const style = m[0].match(/<w:pStyle w:val="([^"]+)"/)?.[1];
    if (t || images) lines.push(`${style ? `[${nameOf[style] ?? style}] ` : ''}${t}${images ? ` [image x${images}]` : ''}`);
  }
  const placeholders = [...new Set([...files.keys()].filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))
    .flatMap((n) => [...paragraphs(text(n)).map(textOf).join('\n').matchAll(PLACEHOLDER)].map((p) => p[1])))];
  const hf = [...files.keys()].filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))
    .map((n) => `${n.slice(5)}: ${paragraphs(text(n)).map(textOf).join(' ').trim() || '(no text)'}${/<w:drawing>|<w:pict>/.test(text(n)) ? ' [image]' : ''}`);
  return [
    `placeholders: ${placeholders.length ? placeholders.map((p) => `{{${p}}}`).join(', ') : 'none (the body will be replaced by the generated content)'}`,
    `styles: ${['title', 'heading 1', 'heading 2', 'heading 3', 'caption'].map((s) => `${s}=${styles[s] ?? 'missing'}`).join(', ')}`,
    ...hf,
    '--- body ---',
    ...lines,
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const [command, input] = args._;
  const fail = (msg) => { console.error(msg); process.exit(1); };
  if (command === 'inspect') {
    if (!input) fail('Usage: inspect <model.docx>');
    console.log(inspectDocx(readFileSync(input)));
  } else if (command === 'write') {
    if (!args.data || !args.out) fail('Usage: write --data <document.json> --out <file.docx> [--template <model.docx>]');
    const doc = JSON.parse(readFileSync(args.data, 'utf8'));
    const { buffer, warnings } = buildDocx(doc, { template: args.template ? readFileSync(args.template) : undefined, baseDir: dirname(resolve(args.data)) });
    warnings.forEach((w) => console.warn(`warning: ${w}`));
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, buffer);
    console.log(`Wrote ${args.out}`);
  } else fail('Command must be "write" or "inspect".');
}
