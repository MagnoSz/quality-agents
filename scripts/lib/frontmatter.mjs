// Minimal, dependency-free parser for the YAML subset allowed in SKILL.md
// frontmatter: top-level `key: value` pairs and one level of nested string
// maps (used by `metadata`). Anything else is reported as an error so that
// skills stay portable across tools with stricter parsers.

export function parseFrontmatter(text) {
  const errors = [];
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { data: null, body: normalized, errors: ['frontmatter must start on the first line with ---'] };
  }
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) {
    return { data: null, body: normalized, errors: ['frontmatter is not closed with ---'] };
  }
  const block = normalized.slice(4, end);
  const body = normalized.slice(end + 4).replace(/^\n/, '');
  const data = {};
  let currentMap = null;

  block.split('\n').forEach((line, i) => {
    const lineNo = i + 2;
    if (line.trim() === '' || line.trim().startsWith('#')) return;
    const nested = line.match(/^ {2}([A-Za-z0-9_-]+):\s*(.*)$/);
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (top) {
      const [, key, raw] = top;
      if (raw === '') {
        data[key] = {};
        currentMap = data[key];
      } else {
        data[key] = unquote(raw, lineNo, errors);
        currentMap = null;
      }
    } else if (nested && currentMap) {
      currentMap[nested[1]] = unquote(nested[2], lineNo, errors);
    } else {
      errors.push(`line ${lineNo}: unsupported frontmatter syntax (use single-line "key: value" or a two-space nested map)`);
    }
  });

  return { data, body, errors };
}

function unquote(raw, lineNo, errors) {
  const value = raw.trim();
  if (/^[>|]/.test(value)) {
    errors.push(`line ${lineNo}: multi-line YAML values are not allowed; keep the value on one line`);
    return '';
  }
  const quoted = value.match(/^"(.*)"$/) || value.match(/^'(.*)'$/);
  return quoted ? quoted[1] : value;
}
