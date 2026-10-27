// Status bar numbers (desktop/usage.ts): plan windows from the providers' answers and
// the memory of a terminal's process tree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claudeWindows, codexWindows, memoryUsage, parseProcesses, treeBytes, windowLabel } from '../desktop/usage.ts';

test('Claude plan windows come from limits[], with the model of a scoped limit', () => {
  const windows = claudeWindows({
    five_hour: { utilization: 1 },
    limits: [
      { kind: 'session', group: 'session', percent: 30, resets_at: '2026-10-27T18:00:00.344048+00:00', scope: null },
      { kind: 'weekly_all', group: 'weekly', percent: 70, resets_at: '2026-10-27T16:00:00+00:00' },
      { kind: 'weekly_scoped', group: 'weekly', percent: 120, resets_at: null, scope: { model: { display_name: 'Fable' } } },
      { kind: 'weekly_x', group: 'weekly', percent: null },
    ],
  });
  assert.deepEqual(windows, [
    { label: '5h', percent: 30, resetsAt: Date.parse('2026-10-27T18:00:00.344Z') },
    { label: '7d', percent: 70, resetsAt: Date.parse('2026-10-27T16:00:00Z') },
    { label: '7d Fable', percent: 100, resetsAt: null },
  ]);
  // Older answers without limits[].
  assert.deepEqual(claudeWindows({ five_hour: { utilization: 2, resets_at: 1795025309 }, seven_day: null }).map((w) => [w.label, w.percent, w.resetsAt]), [['5h', 2, 1795025309000]]);
});

test('Codex plan windows are labeled by their length', () => {
  const windows = codexWindows({ rate_limit: { primary_window: { used_percent: 17, limit_window_seconds: 2592000, reset_at: 1795025309 }, secondary_window: null } });
  assert.deepEqual(windows, [{ label: '30d', percent: 17, resetsAt: 1795025309000 }]);
  assert.deepEqual([18000, 604800].map(windowLabel), ['5h', '7d']);
  assert.deepEqual(codexWindows({}), []);
});

test('a terminal counts the memory of everything it started, once', () => {
  const rows = parseProcesses(' 1     0  100\n 10     1  2048\n 11    10  1024\r\n 12    11  512\n 20     1  4096\nbad line\n');
  assert.equal(treeBytes(rows, 10), (2048 + 1024 + 512) * 1024);
  assert.equal(treeBytes(rows, 20), 4096 * 1024);
  assert.equal(treeBytes(rows, 99), 0); // already exited
});

test('memory is listed per project and, inside it, per terminal', async () => {
  const m = await memoryUsage([
    { id: 't1', pid: process.pid, project: 'acme' },
    { id: 't2', pid: 2 ** 22 + 12345, project: 'acme' }, // exited: no memory
    { id: 't3', pid: process.pid, project: 'beta' },
  ], 1);
  assert.ok(m.total > 0 && m.used > 0 && m.app === 1);
  const acme = m.projects.find((p) => p.project === 'acme');
  assert.deepEqual(acme?.sessions.map((s) => s.id), ['t1', 't2']);
  assert.ok((acme?.sessions[0].bytes ?? 0) > 0);
  assert.equal(acme?.bytes, acme?.sessions[0].bytes);
  assert.deepEqual(m.projects.map((p) => p.project).sort(), ['acme', 'beta']);
});
