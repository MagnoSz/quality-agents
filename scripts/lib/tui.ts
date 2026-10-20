// Minimal terminal UI (arrow-key select, text input, confirm, notes), no
// dependencies. Uses ANSI escape codes when stdin/stdout are a TTY; otherwise
// falls back to numbered prompts over readline (pipes, CI, old terminals).

import { emitKeypressEvents, type Key } from 'node:readline';
import { createInterface } from 'node:readline/promises';

export class CancelError extends Error {}

export interface Option<T> { value: T; label: string; hint?: string; disabled?: string }
export interface SelectOptions<T> { message: string; options: Option<T>[]; initial?: T }
export interface TextOptions { message: string; placeholder?: string; initial?: string; validate?: (v: string) => string; vanishIfEmpty?: boolean }

export interface UI {
  intro(title: string, subtitle?: string): void;
  select<T>(opts: SelectOptions<T>): Promise<T>;
  text(opts: TextOptions): Promise<string>;
  confirm(opts: { message: string; initial?: boolean }): Promise<boolean>;
  log(line: string): void;
  success(line: string): void;
  warn(line: string): void;
  note(title: string, rows: [string, string][]): void;
  outro(message: string): void;
  cancelled(message?: string): void;
  close(): void;
}

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code: string) => (s: unknown): string => (useColor ? `\x1b[${code}m${String(s)}\x1b[0m` : String(s));
export const c = {
  bold: paint('1'), dim: paint('2'), inverse: paint('7'),
  red: paint('31'), green: paint('32'), yellow: paint('33'), cyan: paint('36'), gray: paint('90'),
};

const S = {
  bar: c.gray('│'), start: c.gray('┌'), end: c.gray('└'),
  active: c.cyan('◆'), done: c.green('◇'), cancel: c.red('■'), error: c.yellow('▲'),
  radioOn: c.green('●'), radioOff: c.dim('○'), ok: c.green('✔'),
};

const ANSI = /^\x1b\[[0-9;?]*[A-Za-z]/;
const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

function fit(line: string): string {
  const width = (process.stdout.columns || 100) - 1;
  if (stripAnsi(line).length <= width) return line;
  let visible = 0;
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const esc = line.slice(i).match(ANSI);
    if (esc) { out += esc[0]; i += esc[0].length - 1; continue; }
    if (visible >= width - 1) break;
    out += line[i];
    visible++;
  }
  return `${out}…${useColor ? '\x1b[0m' : ''}`;
}

type KeyResult<T> = { done: true; value: T } | null;

// ------------------------------------------------------------------ fancy UI

function fancyUI(): UI {
  const stdin = process.stdin;
  const stdout = process.stdout;
  emitKeypressEvents(stdin);

  let rendered = 0;
  const draw = (lines: string[]): void => {
    if (rendered) stdout.write(`\x1b[${rendered}A\r\x1b[J`);
    const fitted = lines.map(fit);
    if (fitted.length) stdout.write(`${fitted.join('\n')}\n`);
    rendered = fitted.length;
  };
  const commit = (lines: string[]): void => { draw(lines); rendered = 0; };

  function run<T>(render: () => string[], onKey: (str: string | undefined, key: Key) => KeyResult<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      stdout.write('\x1b[?25l');
      stdin.setRawMode(true);
      stdin.resume();
      const finish = (): void => {
        stdin.off('keypress', handler);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\x1b[?25h');
      };
      const handler = (str: string | undefined, key: Key = {}): void => {
        if (key.ctrl && key.name === 'c') { finish(); reject(new CancelError()); return; }
        const result = onKey(str, key);
        if (result) { finish(); resolve(result.value); } else draw(render());
      };
      stdin.on('keypress', handler);
      draw(render());
    });
  }

  const ui: UI = {
    intro(title, subtitle) {
      stdout.write(`\n${S.start}  ${c.inverse(c.bold(` ${title} `))}\n`);
      if (subtitle) stdout.write(`${S.bar}  ${c.dim(subtitle)}\n`);
      stdout.write(`${S.bar}\n`);
    },

    async select<T>({ message, options, initial }: SelectOptions<T>): Promise<T> {
      const enabled = (i: number): boolean => !options[i].disabled;
      let index = Math.max(0, options.findIndex((o) => o.value === initial && !o.disabled));
      if (!enabled(index)) index = options.findIndex((o) => !o.disabled);
      const lines = (state: 'active' | 'done'): string[] => {
        if (state === 'done') return [`${S.done}  ${message}`, `${S.bar}  ${c.dim(options[index].label)}`, S.bar];
        return [
          `${S.active}  ${c.bold(message)}`,
          ...options.map((o, i) => {
            if (o.disabled) return `${S.bar}  ${c.dim(`○ ${o.label}`)}  ${c.dim(`(${o.disabled})`)}`;
            const hint = o.hint ? `  ${c.dim(o.hint)}` : '';
            return i === index ? `${S.bar}  ${S.radioOn} ${c.bold(o.label)}${hint}` : `${S.bar}  ${S.radioOff} ${o.label}`;
          }),
          `${S.end}  ${c.dim('↑/↓ move · Enter select · Ctrl+C cancel')}`,
        ];
      };
      const move = (step: number): void => {
        for (let n = 0; n < options.length; n++) {
          index = (index + step + options.length) % options.length;
          if (enabled(index)) return;
        }
      };
      const value = await run<T>(() => lines('active'), (str, key) => {
        if (key.name === 'up' || key.name === 'k') move(-1);
        else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') move(1);
        else if (key.name === 'return' || key.name === 'enter') return { done: true, value: options[index].value };
        else if (/^[1-9]$/.test(str || '') && options[Number(str) - 1] && enabled(Number(str) - 1)) index = Number(str) - 1;
        return null;
      });
      commit(lines('done'));
      return value;
    },

    // vanishIfEmpty: an empty answer erases the prompt instead of recording it
    // (used for optional "another one?" loops).
    async text({ message, placeholder = '', initial = '', validate, vanishIfEmpty = false }: TextOptions): Promise<string> {
      let value = initial;
      let error = '';
      const lines = (state: 'active' | 'done'): string[] => {
        if (state === 'done') return [`${S.done}  ${message}`, `${S.bar}  ${c.dim(value || 'skipped')}`, S.bar];
        const shown = value ? `${value}${c.inverse(' ')}` : `${c.inverse(placeholder[0] || ' ')}${c.dim(placeholder.slice(1))}`;
        return [
          `${error ? S.error : S.active}  ${c.bold(message)}`,
          `${S.bar}  ${shown}`,
          error ? `${S.end}  ${c.yellow(error)}` : `${S.end}`,
        ];
      };
      const result = await run<string>(() => lines('active'), (str, key) => {
        if (key.name === 'return' || key.name === 'enter') {
          const problem = validate ? validate(value.trim()) : '';
          if (problem) { error = problem; return null; }
          return { done: true, value: value.trim() };
        }
        if (key.name === 'backspace') value = value.slice(0, -1);
        else if (key.ctrl && key.name === 'u') value = '';
        else if (str && !key.ctrl && !key.meta && str >= ' ') value += str;
        error = '';
        return null;
      });
      if (vanishIfEmpty && !result) commit([]);
      else commit(lines('done'));
      return result;
    },

    async confirm({ message, initial = true }) {
      return ui.select<boolean>({ message, options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }], initial });
    },

    log(line) { stdout.write(`${S.bar}  ${line}\n`); },
    success(line) { stdout.write(`${S.bar}  ${S.ok} ${line}\n`); },
    warn(line) { stdout.write(`${S.bar}  ${c.yellow('!')} ${line}\n`); },

    note(title, rows) {
      const width = Math.max(...rows.map(([k]) => k.length));
      stdout.write(`${S.done}  ${c.bold(title)}\n`);
      for (const [k, v] of rows) stdout.write(`${fit(`${S.bar}  ${c.dim(k.padEnd(width))}  ${v}`)}\n`);
      stdout.write(`${S.bar}\n`);
    },

    outro(message) { stdout.write(`${S.end}  ${message}\n\n`); },
    cancelled(message = 'Cancelled.') { stdout.write(`\n${S.cancel}  ${message}\n\n`); },
    close() { /* nothing to release */ },
  };
  return ui;
}

// ------------------------------------------------------------- plain fallback

function plainUI(): UI {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  rl.on('close', () => { closed = true; });
  const ask = async (q: string): Promise<string> => {
    if (closed) throw new CancelError();
    return rl.question(q);
  };
  const ui: UI = {
    intro(title, subtitle) { console.log(`\n${title}${subtitle ? `\n${subtitle}` : ''}`); },
    async select<T>({ message, options, initial }: SelectOptions<T>): Promise<T> {
      console.log(`\n${message}`);
      options.forEach((o, i) => console.log(`  ${o.value === initial ? '*' : ' '}${String(i + 1).padStart(2)}. ${o.label}${o.disabled ? `  (${o.disabled})` : ''}`));
      const def = options.findIndex((o) => o.value === initial && !o.disabled);
      for (;;) {
        const answer = (await ask(`  Choose 1-${options.length}${def >= 0 ? ` [${def + 1}]` : ''}: `)).trim();
        const picked = options[answer === '' && def >= 0 ? def : Number(answer) - 1];
        if (!picked) { console.log('  Please type one of the numbers above.'); continue; }
        if (picked.disabled) { console.log(`  Not available: ${picked.disabled}.`); continue; }
        return picked.value;
      }
    },
    async text({ message, placeholder = '', validate }) {
      for (;;) {
        const value = (await ask(`\n${message}${placeholder ? ` (${placeholder})` : ''}: `)).trim();
        const problem = validate ? validate(value) : '';
        if (!problem) return value;
        console.log(`  ${problem}`);
      }
    },
    async confirm({ message, initial = true }) {
      const a = (await ask(`\n${message} ${initial ? '[Y/n]' : '[y/N]'}: `)).trim().toLowerCase();
      return a === '' ? initial : a.startsWith('y');
    },
    log(line) { console.log(`  ${line}`); },
    success(line) { console.log(`  ✔ ${line}`); },
    warn(line) { console.log(`  ! ${line}`); },
    note(title, rows) {
      console.log(`\n${title}`);
      const width = Math.max(...rows.map(([k]) => k.length));
      rows.forEach(([k, v]) => console.log(`  ${k.padEnd(width)}  ${v}`));
    },
    outro(message) { console.log(`\n${message}\n`); },
    cancelled(message = 'Cancelled.') { console.log(`\n${message}\n`); },
    close() { rl.close(); },
  };
  return ui;
}

export function createUI({ forcePlain = false } = {}): UI {
  const fancy = !forcePlain && process.stdin.isTTY && process.stdout.isTTY && typeof process.stdin.setRawMode === 'function';
  return fancy ? fancyUI() : plainUI();
}
