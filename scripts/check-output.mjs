// Deterministic checks on deliverables produced by an AI tool, so a skill is
// not considered validated just because an answer "looks right".
//
// Usage:
//   node scripts/check-output.mjs pre-analysis <pre-analysis.txt>
//   node scripts/check-output.mjs missing-info <response.txt> --expect "<field>,<field>"
//   node scripts/check-output.mjs test-cases <test-cases.json> --source <doc>[,<doc>...]
//   node scripts/check-output.mjs review-matrix <review-matrix.json>

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs } from './lib/repo.mjs';
import { checkValues } from './xlsx.mjs';

const SECTIONS = {
  'pt-BR': ['Resumo:', 'Ponto da falha:', 'Evidência:', 'Hipótese:', 'Direcionamento:', 'Impacto:'],
  en: ['Summary:', 'Failure point:', 'Evidence:', 'Hypothesis:', 'Direction:', 'Impact:'],
};
const MISSING_HEADER = {
  'pt-BR': 'Para iniciar a pré-análise, preciso das seguintes informações:',
  en: 'To start the pre-analysis, I need the following information:',
};

const strip = (t) => t.replace(/\r\n/g, '\n').replace(/^```[a-z]*\n|```\s*$/gm, '').trim();

export function checkPreAnalysis(text) {
  const t = strip(text);
  const problems = [];
  const lang = t.startsWith('[PRÉ-ANÁLISE]') ? 'pt-BR' : t.startsWith('[PRE-ANALYSIS]') ? 'en' : null;
  if (!lang) return ['must start with [PRÉ-ANÁLISE] or [PRE-ANALYSIS]'];
  let last = -1;
  const positions = SECTIONS[lang].map((s) => t.indexOf(`\n${s}`));
  SECTIONS[lang].forEach((s, i) => {
    if (positions[i] === -1) problems.push(`missing section "${s}"`);
    else if (positions[i] < last) problems.push(`section "${s}" out of order`);
    else last = positions[i];
  });
  SECTIONS[lang].forEach((s, i) => {
    if (positions[i] === -1) return;
    const next = positions.slice(i + 1).find((p) => p > positions[i]) ?? t.length;
    const body = t.slice(positions[i] + s.length + 1, next);
    if (!/^\s*-\s*\S/m.test(body)) problems.push(`section "${s}" has no "- " item`);
  });
  if (t.split('\n').length > 45) problems.push('too long for a short pre-analysis (> 45 lines)');
  return problems;
}

export function checkMissingInfo(text, expected) {
  const t = strip(text);
  const problems = [];
  const header = Object.values(MISSING_HEADER).find((h) => t.startsWith(h));
  if (!header) return [`must start exactly with "${MISSING_HEADER['pt-BR']}" (or the en equivalent)`];
  const items = t.slice(header.length).split('\n').map((l) => l.trim()).filter(Boolean);
  if (items.some((l) => !l.startsWith('- '))) problems.push('only "- <field>" lines are allowed after the header');
  const listed = items.map((l) => l.slice(2).toLowerCase());
  for (const field of expected) {
    if (!listed.some((l) => l.includes(field.toLowerCase()))) problems.push(`missing field not requested: "${field}"`);
  }
  if (listed.length !== expected.length) problems.push(`requested ${listed.length} field(s), expected exactly ${expected.length}`);
  return problems;
}

export function checkTestCases(data, sourceText) {
  const problems = [];
  const rows = data.testCases || [];
  if (!rows.length) problems.push('no test cases');
  const seen = new Set();
  rows.forEach((r, i) => {
    const where = `test case ${i + 1}`;
    for (const k of ['source', 'context', 'scenario', 'steps', 'expected']) {
      if (!String(r[k] ?? '').trim()) problems.push(`${where}: empty "${k}"`);
    }
    if (r.steps && !/^\s*1\./.test(r.steps)) problems.push(`${where}: steps must be numbered starting at "1."`);
    for (const [, quoted] of String(r.expected ?? '').matchAll(/["“]([^"”]{3,})["”]/g)) {
      if (!sourceText.includes(quoted)) problems.push(`${where}: quoted message "${quoted}" not found in the source documents`);
    }
    const key = `${r.scenario}|${r.steps}|${r.expected}`;
    if (seen.has(key)) problems.push(`${where}: duplicate of an earlier test case`);
    seen.add(key);
  });
  return problems;
}

export function checkReviewMatrix(data, layout) {
  const problems = checkValues(layout, data);
  const matrix = data.matrix || [];
  if (!matrix.length) problems.push('sheet "matrix" is empty');
  const ids = new Set();
  matrix.forEach((r, i) => {
    if (!r.id) problems.push(`matrix row ${i + 2}: missing ID`);
    else if (ids.has(r.id)) problems.push(`matrix row ${i + 2}: duplicate ID ${r.id}`);
    ids.add(r.id);
  });
  const toUpdate = matrix.filter((r) => /ATUALIZAR US|UPDATE STORY/.test(r.finalStatus || ''));
  const changes = data.usChanges || [];
  for (const r of toUpdate) {
    if (!changes.some((c) => c.id === r.id || (c.reference && c.reference.includes(r.id)))) {
      problems.push(`${r.id} is marked for story update but has no row in sheet "usChanges"`);
    }
  }
  (data.pending || []).forEach((p, i) => {
    if (!String(p.owner ?? '').trim()) problems.push(`pending row ${i + 2}: empty owner (use A DEFINIR)`);
  });
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const [kind, file] = args._;
  const fail = (msg) => { console.error(msg); process.exit(1); };
  if (!kind || !file) fail('Usage: node scripts/check-output.mjs <pre-analysis|missing-info|test-cases|review-matrix> <file> [options]');
  const text = readFileSync(file, 'utf8');
  let problems;
  if (kind === 'pre-analysis') problems = checkPreAnalysis(text);
  else if (kind === 'missing-info') problems = checkMissingInfo(text, String(args.expect || '').split(',').map((s) => s.trim()).filter(Boolean));
  else if (kind === 'test-cases') {
    if (!args.source) fail('--source <doc>[,<doc>] is required');
    const sources = String(args.source).split(',').map((p) => readFileSync(p.trim(), 'utf8')).join('\n');
    problems = checkTestCases(JSON.parse(text), sources);
  } else if (kind === 'review-matrix') {
    const layout = JSON.parse(readFileSync(join(ROOT, 'skills', 'requirements-review', 'assets', 'review-matrix.layout.json'), 'utf8'));
    problems = checkReviewMatrix(JSON.parse(text), layout);
  } else fail(`Unknown kind "${kind}"`);

  if (problems.length) {
    console.error(`${kind}: ${problems.length} problem(s)`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log(`${kind}: all checks passed`);
}
