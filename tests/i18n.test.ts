// The desktop app's Portuguese dictionary covers every text the app shows: the
// literal t('…') calls and the labels that come from the main process.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../scripts/lib/repo.mjs';
import { ACTIVITIES, LANGUAGES } from '../scripts/lib/core.ts';

const SRC = join(ROOT, 'app', 'src');
const pt: Record<string, string> = JSON.parse(readFileSync(join(SRC, 'i18n', 'pt-BR.json'), 'utf8'));

function keysInApp(): Set<string> {
  const keys = new Set<string>();
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f));
  for (const f of files) {
    for (const m of readFileSync(join(SRC, f), 'utf8').matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1/g)) {
      keys.add(m[2].replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1'));
    }
  }
  return keys;
}

test('every text of the app has a pt-BR translation', () => {
  const dynamic = [
    ...Object.values(ACTIVITIES).flatMap((a) => [a.label, 'hint' in a ? a.hint : '']),
    ...LANGUAGES,
  ].filter((k): k is string => Boolean(k));
  const missing = [...keysInApp(), ...dynamic].filter((k) => !Object.hasOwn(pt, k));
  assert.deepEqual([...new Set(missing)], []);
});

test('translations keep the {placeholders} of the English text', () => {
  for (const [en, tr] of Object.entries(pt)) {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(names(tr), names(en), en);
  }
});
