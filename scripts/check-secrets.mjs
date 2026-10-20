// Scans versioned text for well-known credential formats. This catches common
// mistakes; it is not a replacement for a dedicated secret scanner.
//
// Usage:
//   node scripts/check-secrets.mjs            # staged files (pre-commit)
//   node scripts/check-secrets.mjs --all      # all tracked files (CI)
//   node scripts/check-secrets.mjs <path...>  # explicit files
//
// A line containing the marker "qa-agents:allow-secret" is skipped; use it
// only for documented, fake example values.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, git } from './lib/repo.mjs';

export const PATTERNS = [
  ['private key', /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY( BLOCK)?-----/],
  ['AWS access key id', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Atlassian API token', /\bATATT[A-Za-z0-9_=-]{40,}/],
  ['JSON Web Token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['URL with embedded credentials', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s:/@]{3,}@[^\s/]+/i],
  ['hard-coded password', /\b(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s<>{}$]{8,}["']/i],
];

const ALLOW_MARKER = 'qa-agents:allow-secret';
const MAX_BYTES = 2 * 1024 * 1024;

export function scanText(text) {
  const findings = [];
  text.split('\n').forEach((line, i) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const [label, re] of PATTERNS) {
      if (re.test(line)) findings.push({ line: i + 1, label });
    }
  });
  return findings;
}

function listPaths(argv) {
  if (argv.includes('--all')) return git(['ls-files']).split('\n').filter(Boolean);
  if (argv.length) return argv;
  return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
}

function readStaged(path) {
  try { return git(['show', `:${path}`]); } catch { return null; }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const staged = !argv.length;
  const problems = [];
  for (const path of listPaths(argv)) {
    let text;
    if (staged) text = readStaged(path);
    else {
      const full = existsSync(path) ? path : join(ROOT, path);
      if (!existsSync(full) || statSync(full).size > MAX_BYTES) continue;
      text = readFileSync(full, 'utf8');
    }
    if (text === null || text.includes('\u0000')) continue; // binary
    for (const f of scanText(text)) problems.push(`${path}:${f.line}: possible ${f.label}`);
  }
  if (problems.length) {
    console.error('Secret check failed:');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('Remove the value and rotate it if it was real. Never store credentials in this repository.');
    process.exit(1);
  }
  console.log('Secret check passed.');
}
