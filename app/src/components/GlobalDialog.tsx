// Opened from the start screen: the skills and agents installed for all
// projects, without opening a project first.

import { useEffect } from 'react';
import { GlobalPanel } from './GlobalPanel';
import { IconX } from './Icons';

interface Props { onClose: () => void }

export function GlobalDialog({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="global-title">
        <header className="modal-head">
          <div>
            <h2 id="global-title">Skills &amp; agents for all projects</h2>
            <p className="muted small">Installed in your user folder: every project and AI tool on this computer can use them. Removing moves them to the trash.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close (Esc)"><IconX size={18} /></button>
        </header>
        <div className="modal-body">
          <GlobalPanel />
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
