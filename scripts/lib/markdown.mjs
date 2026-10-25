// Small Markdown-to-HTML renderer shared by the PDF generator and the desktop
// app. HTML in the source is escaped, so the output never contains raw markup
// from the document. No dependencies.

export const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// A backslash keeps a punctuation character literal (\* is "*", not emphasis).
const hide = (text) => text.replace(/\\([!-/:-@[-`{-~])/g, (_, c) => String.fromCharCode(0xe000 + c.charCodeAt(0)));
const unhide = (html) => html.replace(/[\ue000-\ue07f]/g, (c) => escHtml(String.fromCharCode(c.charCodeAt(0) - 0xe000)));

function inline(text) {
  return unhide(escHtml(hide(text))
    // Only embedded raster images (Word previews); no remote or file images.
    .replace(/!\[([^\]]*)\]\((data:image\/(?:png|jpeg|gif|webp|bmp);base64,[A-Za-z0-9+/=]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>'));
}

// A cell that is just << joins the cell on its left and ^^ the cell above (merged cells in Word previews),
// so the merged area is drawn as one cell. "\<<" is a literal "<<".
function table(head, rows) {
  const grid = [head, ...rows].map((cells, r) => cells.map((text, c) => ({ text, r, c, colspan: 1, rowspan: 1, owner: null })));
  for (const row of grid) {
    for (const cell of row) {
      const near = cell.text === '<<' ? row[cell.c - 1] : cell.text === '^^' && cell.r > 1 ? grid[cell.r - 1][cell.c] : null; // no rowspan out of the header
      if (!near) continue;
      cell.owner = near.owner ?? near;
      if (cell.text === '<<' && cell.owner.r === cell.r) cell.owner.colspan++;
      if (cell.text === '^^' && cell.owner.c === cell.c) cell.owner.rowspan++;
    }
  }
  const tr = (row, tag) => `<tr>${row.filter((cell) => !cell.owner).map((cell) => `<${tag}${cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''}${cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''}>${/^(<<|\^\^)$/.test(cell.text) ? '' : inline(cell.text)}</${tag}>`).join('')}</tr>`;
  return `<table><thead>${tr(grid[0], 'th')}</thead><tbody>${grid.slice(1).map((row) => tr(row, 'td')).join('')}</tbody></table>`;
}

// Small Markdown subset: headings, paragraphs, lists (2 levels), tables,
// blockquotes, code blocks, horizontal rules. Enough for generated reports.
export function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isTableSep = (l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);
  const cells = (l) => l.trim().replace(/^\||(?<!\\)\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escHtml(buf.join('\n'))}</code></pre>`);
    } else if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inline(line.slice(level).trim())}</h${level}>`);
      i++;
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push('<hr>');
      i++;
    } else if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(table(head, rows));
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const html = [];
      const stack = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        const depth = m[1].length >= 2 ? 1 : 0;
        const tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        while (stack.length > depth + 1 || (depth === 0 && stack.length && stack[0] !== tag)) html.push(`</li></${stack.pop()}>`);
        if (stack.length === depth) { html.push(`<${tag}><li>`); stack.push(tag); } else html.push('</li><li>');
        html.push(inline(m[3]));
        i++;
      }
      while (stack.length) html.push(`</li></${stack.pop()}>`);
      out.push(html.join(''));
    } else if (!line.trim()) {
      i++;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*]|\d+\.)\s+)/.test(lines[i])) buf.push(lines[i++]);
      // A line ending in two spaces is a line break inside the paragraph.
      out.push(`<p>${inline(buf.join('\n')).replace(/ {2,}\n/g, '<br>').replace(/\n/g, ' ')}</p>`);
    }
  }
  return out.join('\n');
}
