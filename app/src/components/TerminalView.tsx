// A terminal tab: xterm.js drawing a pseudo-terminal of the main process
// (desktop/terminals.ts). Hidden tabs stay mounted so their output is kept.

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '../api';

interface Props { id: string; active: boolean; onExit: (code: number) => void }

const css = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function TerminalView({ id, active, onExit }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<{ term: Terminal; fit: FitAddon } | null>(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    const bridge = api.term();
    if (!bridge || !box.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "JetBrains Mono", ui-monospace, Consolas, monospace',
      scrollback: 10000,
      theme: { background: css('--bg'), foreground: css('--text'), cursor: css('--accent'), selectionBackground: css('--accent-soft') },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(box.current);
    fit.fit();
    view.current = { term, fit };

    const offData = bridge.on('data', (tid, data) => { if (tid === id) term.write(String(data)); });
    const offExit = bridge.on('exit', (tid, code) => {
      if (tid !== id) return;
      term.write(`\r\n\x1b[2m[process exited with code ${code}]\x1b[0m\r\n`);
      exitRef.current(Number(code));
    });
    const input = term.onData((data) => bridge.input(id, data));
    const resize = term.onResize(({ cols, rows }) => bridge.resize(id, cols, rows));
    void bridge.start(id, term.cols, term.rows).then((error) => { if (error) { term.write(`\x1b[31m${error}\x1b[0m\r\n`); exitRef.current(-1); } });

    // Follow the size of the tab; a hidden tab has no size, so it is skipped.
    const observer = new ResizeObserver(() => { if (box.current?.offsetParent) fit.fit(); });
    observer.observe(box.current);

    return () => {
      observer.disconnect(); input.dispose(); resize.dispose(); offData(); offExit();
      bridge.kill(id);
      term.dispose();
      view.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (!active || !view.current) return;
    view.current.fit.fit();
    view.current.term.focus();
  }, [active]);

  return <div ref={box} className="term-pane" hidden={!active} />;
}
