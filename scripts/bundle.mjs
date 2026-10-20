// Packages skills for tools without repository access (see adapters/chat/).
// Output (ignored by Git):
//   dist/chat/<skill>.md                 one self-contained Markdown file per skill
//   dist/chat/quality-agents-all.md      AGENTS.md + every stable/draft skill
//   dist/claude-ai/<skill>.zip           skill folder zip for upload to claude.ai
// Usage: npm run bundle   (packages the generated .claude/skills mirror)

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listSkillDirs, walkFiles, relPosix } from './lib/repo.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { zip } from './lib/zip.mjs';
import { findDrift } from './build.mjs';

if (findDrift().length) {
  console.error('Mirrors are out of date. Run `npm run build` first.');
  process.exit(1);
}

const mirror = join(ROOT, '.claude', 'skills');
const dist = join(ROOT, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'chat'), { recursive: true });
mkdirSync(join(dist, 'claude-ai'), { recursive: true });

function skillMarkdown(skill, { withCore = true } = {}) {
  const dir = join(mirror, skill);
  const files = walkFiles(dir)
    .filter((f) => /\.(md|json)$/.test(f))
    .filter((f) => withCore || !relPosix(dir, f).startsWith('references/core/'));
  const main = files.find((f) => relPosix(dir, f) === 'SKILL.md');
  const parts = [readFileSync(main, 'utf8')];
  for (const f of files.filter((x) => x !== main)) {
    const body = readFileSync(f, 'utf8');
    parts.push(`\n\n<!-- ===== FILE: ${skill}/${relPosix(dir, f)} ===== -->\n\n${f.endsWith('.json') ? `\`\`\`json\n${body}\`\`\`\n` : body}`);
  }
  return parts.join('');
}

// The all-in-one file carries the core policies once instead of once per skill.
const all = [readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')];
for (const file of walkFiles(join(ROOT, 'core'))) {
  all.push(`\n\n<!-- ===== FILE: references/core/${relPosix(join(ROOT, 'core'), file)} (shared by every skill) ===== -->\n\n${readFileSync(file, 'utf8')}`);
}
for (const skill of listSkillDirs()) {
  writeFileSync(join(dist, 'chat', `${skill}.md`), skillMarkdown(skill));
  const { data } = parseFrontmatter(readFileSync(join(mirror, skill, 'SKILL.md'), 'utf8'));
  if (['stable', 'draft'].includes(data?.metadata?.status)) {
    all.push(`\n\n<!-- ===================== SKILL: ${skill} ===================== -->\n\n${skillMarkdown(skill, { withCore: false })}`);
  }
  const entries = walkFiles(join(mirror, skill)).map((f) => [`${skill}/${relPosix(join(mirror, skill), f)}`, readFileSync(f)]);
  writeFileSync(join(dist, 'claude-ai', `${skill}.zip`), zip(entries));
}
writeFileSync(join(dist, 'chat', 'quality-agents-all.md'), all.join(''));
console.log(`Bundles written to dist/chat/ and dist/claude-ai/ (${listSkillDirs().length} skills).`);
