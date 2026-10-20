import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../scripts/lib/repo.mjs';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { validateSchema } from '../scripts/lib/schema.mjs';
import { validate } from '../scripts/validate.mjs';
import { build, findDrift } from '../scripts/build.mjs';
import { findViolations } from '../scripts/check-artifacts.mjs';
import { scanText } from '../scripts/check-secrets.mjs';
import { buildXlsx, readXlsx } from '../scripts/xlsx.mjs';
import { checkPreAnalysis, checkMissingInfo, checkTestCases, checkReviewMatrix } from '../scripts/check-output.mjs';
import { markdownToHtml } from '../scripts/pdf.mjs';
import { ACTIVITIES, buildPrompt, cleanPath, copyToInbox, isUsable } from '../scripts/qa.mjs';

// A temporary copy of the framework with one skill, to mutate safely.
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'qa-agents-test-'));
  for (const dir of ['core', 'schemas', 'skills/failure-analysis', 'examples/failure-analysis']) {
    cpSync(join(ROOT, dir), join(root, dir), { recursive: true });
  }
  writeFileSync(join(root, 'AGENTS.md'), '# Agents\n\n| `failure-analysis` | ok |\n');
  build(root);
  return root;
}
const skillFile = (root) => join(root, 'skills', 'failure-analysis', 'SKILL.md');
const edit = (file, from, to) => writeFileSync(file, readFileSync(file, 'utf8').replace(from, to));
const errorsOf = (root) => validate(root, { checkDrift: false });

test('real repository passes validation', () => {
  assert.deepEqual(validate(), []);
});

test('fixture passes validation, including mirrors', () => {
  const root = fixture();
  try { assert.deepEqual(validate(root), []); } finally { rmSync(root, { recursive: true, force: true }); }
});

test('validator rejects structural problems', async (t) => {
  const cases = [
    ['name mismatch', (r) => edit(skillFile(r), 'name: failure-analysis', 'name: failure-analyzer'), /must match folder name/],
    ['invalid name', (r) => edit(skillFile(r), 'name: failure-analysis', 'name: Failure--Analysis'), /invalid name/],
    ['missing section', (r) => edit(skillFile(r), '## Error handling', '## Errors'), /missing section "## Error handling"/],
    ['unknown frontmatter key', (r) => edit(skillFile(r), 'license: MIT', 'license: MIT\nmodel: some-model'), /not part of the portable/],
    ['multi-line description', (r) => edit(skillFile(r), /description: .*/, 'description: >\n  folded'), /multi-line/],
    ['broken link', (r) => edit(skillFile(r), '](references/input-template.md)', '](references/missing.md)'), /broken link/],
    ['link leaving skill', (r) => edit(skillFile(r), '](references/input-template.md)', '](../../README.md)'), /leaves the skill folder/],
    ['planned without prefix', (r) => edit(skillFile(r), 'status: draft', 'status: planned'), /must start with \[PLANNED\]/],
    ['output outside workspace', (r) => edit(skillFile(r), 'Save the same text as `pre-analysis.txt`', 'Save the same text as `skills/out.txt`'), /outside/],
    ['skill not in AGENTS.md', (r) => writeFileSync(join(r, 'AGENTS.md'), '# Agents\n'), /not listed in the catalog/],
    ['missing example', (r) => rmSync(join(r, 'examples', 'failure-analysis'), { recursive: true }), /has no examples/],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const root = fixture();
      try {
        mutate(root);
        const errors = errorsOf(root);
        assert.ok(errors.some((e) => expected.test(e)), `expected ${expected} in:\n${errors.join('\n')}`);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }
});

test('validator checks workflows', async (t) => {
  const workflow = (steps) => `# W\n\n\`\`\`json workflow\n${JSON.stringify({ id: 'w', title: 'W', steps })}\n\`\`\`\n`;
  const cases = [
    ['unknown skill', [{ id: 'a', skill: 'nope', gate: 'none' }], /unknown skill "nope"/],
    ['forward dependency', [{ id: 'a', skill: 'failure-analysis', gate: 'none', dependsOn: ['b'] }, { id: 'b', skill: 'failure-analysis', gate: 'none' }], /not an earlier step/],
    ['bad gate', [{ id: 'a', skill: 'failure-analysis', gate: 'maybe' }], /must be one of/],
    ['output outside project', [{ id: 'a', skill: 'failure-analysis', gate: 'none', outputs: ['docs/x'] }], /does not match/],
  ];
  for (const [name, steps, expected] of cases) {
    await t.test(name, () => {
      const root = fixture();
      try {
        const dir = join(root, 'skills', 'qa-orchestrator', 'references', 'workflows');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'w.md'), workflow(steps));
        assert.ok(errorsOf(root).some((e) => expected.test(e)));
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }
});

test('build drift is detected', () => {
  const root = fixture();
  try {
    assert.deepEqual(findDrift(root), []);
    edit(skillFile(root), 'Act as a', 'Behave as a');
    assert.ok(findDrift(root).some((d) => d.startsWith('outdated: .agents/skills/failure-analysis/SKILL.md')));
    writeFileSync(join(root, '.claude', 'skills', 'stray.md'), 'x');
    assert.ok(findDrift(root).some((d) => d === 'unexpected: .claude/skills/stray.md'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('frontmatter parser', () => {
  const { data, errors } = parseFrontmatter('---\nname: x\ndescription: "a: b"\nmetadata:\n  version: "1.0.0"\n---\nbody');
  assert.deepEqual(errors, []);
  assert.equal(data.description, 'a: b');
  assert.equal(data.metadata.version, '1.0.0');
  assert.match(parseFrontmatter('no frontmatter').errors[0], /first line/);
});

test('artifact check', () => {
  const v = findViolations([
    'workspace/projects/acme/runs/r1/state.json',
    'workspace/README.md',
    'dist/chat/all.md',
    'docs/report.pdf',
    'skills/test-design/assets/template.xlsx',
    'examples/failure-analysis/app.log',
    'scripts/run.log',
    'config/.env',
    'random-folder/file.md',
    'skills/x/SKILL.md',
  ]);
  const flagged = v.map((x) => x.split(':')[0]);
  assert.deepEqual(flagged, ['workspace/projects/acme/runs/r1/state.json', 'dist/chat/all.md', 'docs/report.pdf', 'scripts/run.log', 'config/.env', 'random-folder/file.md']);
});

test('secret check', () => {
  const fakeAws = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  const fakeGh = 'ghp_' + 'a'.repeat(36);
  const fakeKey = '-----BEGIN ' + 'PRIVATE KEY-----';
  const fakePwd = 'password' + ' = "' + 'S3cretValue!' + '"';
  const fakeUrl = 'https://' + 'admin:hunter22@' + 'db.example.com';
  for (const line of [fakeAws, fakeGh, fakeKey, fakePwd, fakeUrl]) {
    assert.equal(scanText(line).length > 0, true, line);
  }
  assert.equal(scanText('password: "<from env QA_PASSWORD>"').length, 0);
  assert.equal(scanText(`${fakeAws} qa-agents:allow-secret`).length, 0);
});

test('state schema', () => {
  const schema = JSON.parse(readFileSync(join(ROOT, 'schemas', 'execution-state.schema.json'), 'utf8'));
  const state = {
    schemaVersion: '1', id: '20261020-0930-test-design-x', project: 'acme', skill: 'test-design',
    createdAt: '2026-10-20T09:30:00Z', updatedAt: '2026-10-20T09:30:00Z', status: 'in-progress', currentStep: 'mapping',
    completedSteps: [], pending: [], approvals: [{ step: 'mapping', decision: 'approved', at: '2026-10-20T10:00:00Z' }],
    inputs: [], results: [], artifacts: ['workspace/projects/acme/runs/20261020-0930-test-design-x/outputs/mapping.md'],
  };
  assert.deepEqual(validateSchema(schema, state), []);
  assert.ok(validateSchema(schema, { ...state, status: 'done' }).length);
  assert.ok(validateSchema(schema, { ...state, artifacts: ['skills/x.md'] }).length);
  const { approvals, ...missing } = state;
  assert.ok(validateSchema(schema, missing).some((e) => e.includes('approvals')));
});

test('xlsx round trip and missing sheet warning', () => {
  const layout = JSON.parse(readFileSync(join(ROOT, 'skills', 'test-design', 'assets', 'test-cases.layout.json'), 'utf8'));
  const data = { testCases: [{ source: 'US:1', context: 'Tela & <Y>', scenario: 'Cenário ç', steps: '1. a\n2. b', expected: 'Exibir "Ok."' }] };
  for (const lang of ['pt-BR', 'en']) {
    const { data: back, warnings } = readXlsx(buildXlsx(layout, data, lang), layout);
    assert.deepEqual(warnings, []);
    assert.deepEqual(back.testCases, data.testCases);
  }
  const other = { ...layout, sheets: [{ ...layout.sheets[0], key: 'x', title: { en: 'Other' } }] };
  assert.ok(readXlsx(buildXlsx(layout, data), other).warnings[0].includes('missing sheet'));
});

test('output checks', () => {
  const good = '[PRE-ANALYSIS]\n\nSummary:\n- a\n\nFailure point:\n- b\n\nEvidence:\n- c\n\nHypothesis:\n- d\n\nDirection:\n- e\n\nImpact:\n- f';
  assert.deepEqual(checkPreAnalysis(good), []);
  assert.ok(checkPreAnalysis(good.replace('Hypothesis:\n- d\n\n', '')).some((p) => p.includes('Hypothesis')));
  const missing = 'Para iniciar a pré-análise, preciso das seguintes informações:\n- Momento da falha\n- Data/hora da evidência';
  assert.deepEqual(checkMissingInfo(missing, ['momento', 'data']), []);
  assert.ok(checkMissingInfo(missing, ['momento']).length);
  const cases = { testCases: [{ source: 'US:1', context: 'c', scenario: 's', steps: '1. x', expected: 'Show "Invalid ISBN."' }] };
  assert.deepEqual(checkTestCases(cases, 'shows "Invalid ISBN." message'), []);
  assert.ok(checkTestCases(cases, 'nothing').some((p) => p.includes('not found in the source')));
  const layout = JSON.parse(readFileSync(join(ROOT, 'skills', 'requirements-review', 'assets', 'review-matrix.layout.json'), 'utf8'));
  const matrix = { matrix: [{ id: 'REV-001', initialStatus: 'AMBÍGUO', finalStatus: 'RESOLVIDO — ATUALIZAR US' }], usChanges: [], pending: [{ id: 'P1', owner: '' }] };
  const problems = checkReviewMatrix(matrix, layout);
  assert.ok(problems.some((p) => p.includes('no row in sheet "usChanges"')));
  assert.ok(problems.some((p) => p.includes('A DEFINIR')));
  assert.ok(checkReviewMatrix({ matrix: [{ id: 'R', initialStatus: 'TALVEZ' }] }, layout).some((p) => p.includes('not an allowed value')));
});

test('qa assistant: activities, prompts, paths, inbox copies', () => {
  for (const a of Object.values(ACTIVITIES)) assert.ok(existsSync(join(ROOT, 'skills', a.skill, 'SKILL.md')), a.skill);
  assert.equal(isUsable('requirements-review'), true);
  assert.equal(isUsable('automation'), false);

  const p = buildPrompt({ project: 'acme', activity: 'review', files: ['workspace/projects/acme/inbox/us.md'], note: 'focus on permissions', language: 'Portuguese (pt-BR)' });
  assert.match(p, /^Follow AGENTS\.md\. Project: acme\./);
  assert.match(p, /requirements-review skill .* workspace\/projects\/acme\/inbox\/us\.md/);
  assert.match(p, /Additional instructions: focus on permissions\. Talk to me in Portuguese \(pt-BR\)\.$/);
  assert.match(buildPrompt({ project: 'acme', activity: 'resume', run: 'R1' }), /runs\/R1\/state\.json/);
  assert.match(buildPrompt({ project: 'acme', activity: 'review-then-tests', files: ['f'] }), /requirements-to-tests workflow/);
  assert.throws(() => buildPrompt({ project: 'acme', activity: 'nope' }));

  assert.equal(cleanPath('"C:/a b/c.md"'), cleanPath('C:/a b/c.md'));
  assert.equal(cleanPath("'x.md'"), cleanPath('x.md'));

  const root = mkdtempSync(join(tmpdir(), 'qa-inbox-'));
  try {
    const src = join(root, 'us.md');
    writeFileSync(src, 'story');
    assert.equal(copyToInbox('acme', src, root), 'workspace/projects/acme/inbox/us.md');
    assert.equal(copyToInbox('acme', src, root), 'workspace/projects/acme/inbox/us-1.md');
    assert.equal(readFileSync(join(root, 'workspace/projects/acme/inbox/us.md'), 'utf8'), 'story');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('markdown to html', () => {
  const html = markdownToHtml('# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- x\n  - y\n\n**b** <i>');
  assert.match(html, /<h1>T<\/h1>/);
  assert.match(html, /<td>1<\/td><td>2<\/td>/);
  assert.match(html, /<ul><li>x<ul><li>y<\/li><\/ul><\/li><\/ul>/);
  assert.match(html, /<strong>b<\/strong> &lt;i&gt;/);
});
