// The icon rail. It stays on the home screen and inside a project, so home,
// settings and the project actions are not repeated as buttons elsewhere.

import type { MouseEvent } from 'react';
import type { ProjectSummary } from '../api';
import { t } from '../i18n';
import { IconFolder, IconHome, IconLink, IconPanel, IconPlay, IconRefresh, IconSettings, IconTerminal } from './Icons';

interface Props {
  settingsOn: boolean;
  onHome: () => void;
  onSettings: () => void;
  project?: ProjectSummary | null;
  onPlay?: () => void;
  onTerminal?: (e: MouseEvent<HTMLElement>) => void;
  onFolder?: () => void;
  onLink?: () => void;
  onRefresh?: () => void;
  onPanel?: () => void;
}

export function Ribbon({ settingsOn, onHome, onSettings, project, onPlay, onTerminal, onFolder, onLink, onRefresh, onPanel }: Props) {
  const ready = Boolean(project);
  return (
    <nav className="ribbon" aria-label={t('Actions')}>
      <button type="button" className="icon-btn" onClick={onHome} title={t('All projects')}><IconHome size={19} /></button>
      <button type="button" className="icon-btn accent" disabled={!ready} onClick={onPlay} title={t('Open in your AI tool')}><IconPlay size={19} /></button>
      <button type="button" className="icon-btn" disabled={!ready} onClick={onTerminal} title={t('New terminal')}><IconTerminal size={19} /></button>
      <button type="button" className="icon-btn" disabled={!ready} onClick={onFolder} title={t('Open the project folder')}><IconFolder size={19} /></button>
      <button type="button" className={`icon-btn${project?.repository ? ' accent' : ''}`} disabled={!ready} onClick={onLink}
        title={project?.repository ? t('Linked folder: {folder} (click to link another)', { folder: project.repository }) : t('Link a folder of this computer to the project')}><IconLink size={19} /></button>
      <button type="button" className={`icon-btn${settingsOn ? ' on' : ''}`} onClick={onSettings} title={t('Settings')}><IconSettings size={19} /></button>
      <button type="button" className="icon-btn" disabled={!ready} onClick={onRefresh} title={t('Refresh')}><IconRefresh size={19} /></button>
      <span className="ribbon-spacer" />
      <button type="button" className="icon-btn" disabled={!ready} onClick={onPanel} title={t('Show or hide the side panel')}><IconPanel size={19} /></button>
    </nav>
  );
}
