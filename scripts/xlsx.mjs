// Writes and reads .xlsx deliverables from a layout (sheets, columns, widths,
// allowed values) so every AI tool produces the same file. No dependencies.
//
// Usage:
//   node scripts/xlsx.mjs write --layout <layout.json> --data <data.json> --out <file.xlsx> [--lang en|pt-BR]  (default en)
//   node scripts/xlsx.mjs read <file.xlsx> --layout <layout.json> [--out <data.json>]
//
// data.json: { "<sheetKey>": [ { "<columnKey>": "value", ... }, ... ], ... }

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zip, unzip } from './lib/zip.mjs';
import { parseArgs } from './lib/repo.mjs';

const esc = (s) => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');

export function colName(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function colIndex(letters) {
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

const label = (obj, lang) => obj[lang] ?? obj.en ?? Object.values(obj)[0];

export function buildXlsx(layout, data, lang = 'en') {
  const files = [];
  const sheetEntries = layout.sheets.map((sheet, i) => {
    const rows = data[sheet.key] || [];
    const lastCol = colName(sheet.columns.length - 1);
    const lastRow = Math.max(rows.length + 1, 2);
    const cell = (c, r, value, style) => `<c r="${colName(c)}${r}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value ?? '')}</t></is></c>`;
    const header = `<row r="1">${sheet.columns.map((col, c) => cell(c, 1, label(col.label, lang), 1)).join('')}</row>`;
    const body = rows.map((row, r) => `<row r="${r + 2}">${sheet.columns.map((col, c) => cell(c, r + 2, row[col.key], 2)).join('')}</row>`).join('');
    const cols = sheet.columns.map((col, c) => `<col min="${c + 1}" max="${c + 1}" width="${col.width || 20}" customWidth="1"/>`).join('');
    const validations = sheet.columns
      .map((col, c) => ({ col, c, values: col.values && layout.enums?.[col.values]?.[lang] }))
      .filter((v) => v.values)
      .map(({ c, values }) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${colName(c)}2:${colName(c)}1000"><formula1>"${esc(values.join(','))}"</formula1></dataValidation>`);
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + `<cols>${cols}</cols>`
      + `<sheetData>${header}${body}</sheetData>`
      + `<autoFilter ref="A1:${lastCol}${lastRow}"/>`
      + (validations.length ? `<dataValidations count="${validations.length}">${validations.join('')}</dataValidations>` : '')
      + '</worksheet>';
    files.push([`xl/worksheets/sheet${i + 1}.xml`, xml]);
    const title = label(sheet.title, lang).slice(0, 31);
    return { title, ref: `A1:${lastCol}${lastRow}`, i };
  });

  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    + sheetEntries.map((s) => `<sheet name="${esc(s.title)}" sheetId="${s.i + 1}" r:id="rId${s.i + 1}"/>`).join('')
    + '</sheets><definedNames>'
    + sheetEntries.map((s) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${s.i}" hidden="1">'${esc(s.title.replace(/'/g, "''"))}'!$${s.ref.replace(':', ':$').replace(/([A-Z]+)(\d+)/g, '$1$$$2')}</definedName>`).join('')
    + '</definedNames></workbook>';
  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + sheetEntries.map((s) => `<Relationship Id="rId${s.i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${sheetEntries.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    + '</Relationships>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + sheetEntries.map((s) => `<Override PartName="/xl/worksheets/sheet${s.i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

  return zip([
    ['[Content_Types].xml', contentTypes],
    ['_rels/.rels', rootRels],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', workbookRels],
    ['xl/styles.xml', styles],
    ...files,
  ]);
}

// Reads any .xlsx (including files re-saved by Excel/LibreOffice/Google Sheets)
// and maps sheets/columns back to layout keys using labels in any language.
export function readXlsx(buf, layout) {
  const files = unzip(buf);
  const text = (name) => (files.has(name) ? files.get(name).toString('utf8') : '');
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unesc(t[1])).join(''));
  const rels = Object.fromEntries([...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => [m[0].match(/Id="([^"]+)"/)[1], m[0].match(/Target="([^"]+)"/)[1].replace(/^\/?(xl\/)?/, 'xl/')]));
  const sheets = [...text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: unesc(m[0].match(/name="([^"]*)"/)[1]),
    file: rels[m[0].match(/r:id="([^"]+)"/)[1]],
  }));

  const result = {};
  const warnings = [];
  for (const def of layout.sheets) {
    const titles = Object.values(def.title).map((t) => t.slice(0, 31));
    const sheet = sheets.find((s) => titles.includes(s.name));
    if (!sheet) { warnings.push(`missing sheet "${titles.join('" / "')}"`); continue; }
    const grid = [];
    for (const row of text(sheet.file).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const ref = attrs.match(/r="([A-Z]+)\d+"/);
        const idx = ref ? colIndex(ref[1]) : cells.length;
        const type = (attrs.match(/t="([^"]+)"/) || [])[1];
        const inner = c[2] || '';
        let value = '';
        if (type === 's') value = shared[Number((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1])] ?? '';
        else if (type === 'inlineStr') value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unesc(t[1])).join('');
        else value = unesc((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] ?? '');
        cells[idx] = value;
      }
      grid.push(cells);
    }
    const header = grid[0] || [];
    const keyByIndex = header.map((h) => def.columns.find((col) => Object.values(col.label).includes((h || '').trim()))?.key);
    for (const col of def.columns) {
      if (!keyByIndex.includes(col.key)) warnings.push(`sheet "${sheet.name}": missing column "${Object.values(col.label).join('" / "')}"`);
    }
    header.forEach((h, i) => { if (h && !keyByIndex[i]) warnings.push(`sheet "${sheet.name}": extra column "${h}" (kept under "_extra")`); });
    result[def.key] = grid.slice(1)
      .filter((cells) => cells.some((v) => v !== undefined && v !== ''))
      .map((cells) => {
        const row = {};
        cells.forEach((v, i) => {
          if (keyByIndex[i]) row[keyByIndex[i]] = v ?? '';
          else if (header[i]) (row._extra ??= {})[header[i]] = v ?? '';
        });
        return row;
      });
  }
  return { data: result, warnings };
}

// Checks enum columns against the allowed values of either language.
export function checkValues(layout, data) {
  const problems = [];
  for (const sheet of layout.sheets) {
    (data[sheet.key] || []).forEach((row, r) => {
      for (const col of sheet.columns.filter((c) => c.values)) {
        const value = (row[col.key] ?? '').trim();
        const allowed = Object.values(layout.enums[col.values]).flat();
        if (value && !allowed.some((a) => value === a || value.endsWith(` ${a}`))) {
          problems.push(`${sheet.key} row ${r + 2}, ${col.key}: "${value}" is not an allowed value`);
        }
      }
    });
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const [command, input] = args._;
  const fail = (msg) => { console.error(msg); process.exit(1); };
  if (!args.layout) fail('Missing --layout <layout.json>');
  const layout = JSON.parse(readFileSync(args.layout, 'utf8'));

  if (command === 'write') {
    if (!args.data || !args.out) fail('Usage: write --layout <layout.json> --data <data.json> --out <file.xlsx> [--lang en|pt-BR]  (default en)');
    const data = JSON.parse(readFileSync(args.data, 'utf8'));
    const problems = checkValues(layout, data);
    problems.forEach((p) => console.warn(`warning: ${p}`));
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, buildXlsx(layout, data, args.lang || 'en'));
    console.log(`Wrote ${args.out}`);
  } else if (command === 'read') {
    if (!input) fail('Usage: read <file.xlsx> --layout <layout.json> [--out <data.json>]');
    const { data, warnings } = readXlsx(readFileSync(input), layout);
    warnings.concat(checkValues(layout, data)).forEach((w) => console.warn(`warning: ${w}`));
    const json = `${JSON.stringify(data, null, 2)}\n`;
    if (args.out) { mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(args.out, json); console.log(`Wrote ${args.out}`); } else process.stdout.write(json);
  } else fail('Command must be "write" or "read".');
}
