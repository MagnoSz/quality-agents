import { useState } from 'react';
import { describeRun, statusLabel, type TreeNode } from '../api';
import { t } from '../i18n';
import { IconChevron, IconMcp, IconMore, IconPlus, IconStar } from './Icons';
import { FileIcon, SectionIcon, isSectionIconName } from '../icons';

interface Props {
  nodes: TreeNode[];
  activePath: string | null;
  onOpen: (path: string) => void;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onNewNote: () => void;
  tagColors?: (path: string) => string[]; // colors of the file's tags
  onMenu?: (node: TreeNode, at: { left: number; top: number }) => void; // the item's menu: right click or its ⋯ button
  favorites?: Set<string>; // favorite notes: a star, and first in the notes folder
}

const friendly = (name: string): string => ({
  context: t('Context'), inbox: t('Inbox'), runs: t('Activities'), notes: t('Notes'), temporary: t('Temporary'),
  'proposed-updates.md': t('Proposed updates'), 'activity-log.md': t('Activity log'),
} as Record<string, string>)[name] ?? name;

// One indent step = the caret (14px) + the row gap (6px), so a folder's children
// line up under the folder's own icon.
const INDENT = 20;

const statusClass = (s: string): string => (s === 'completed' ? 'dot-ok' : s === 'cancelled' ? 'dot-muted' : s === 'blocked' ? 'dot-err' : 'dot-warn');

export function FileTree(props: Props) {
  return <ul className="tree" role="tree">{props.nodes.map((n) => <Node key={n.path} node={n} depth={0} {...props} />)}</ul>;
}

function Node({ node, depth, activePath, onOpen, expanded, onToggle, onNewNote, tagColors, onMenu, favorites }: Props & { node: TreeNode; depth: number }) {
  const [hover, setHover] = useState(false);
  const isDir = node.type === 'dir';
  const open = expanded.has(node.path);
  const run = node.run ? describeRun(node.name) : null;
  if (node.mcp) {
    return <li role="treeitem"><div className="tree-row" style={{ paddingLeft: 8 + depth * INDENT }} title={`${node.name}\n${node.mcp}`}>
      <span className="tree-icon"><IconMcp size={14} /></span><span className="tree-label">{node.name}</span><span className="tree-meta">{node.mcp}</span>
    </div></li>;
  }
  const section = depth === 0 && isDir && isSectionIconName(node.name) ? node.name : null;
  const label = run ? run.title : depth === 0 ? friendly(node.name) : node.path.startsWith('notes/') ? node.name.replace(/\.md$/, '') : node.name;

  return (
    <li role="treeitem" aria-expanded={isDir ? open : undefined}>
      <div className="tree-line">
      <button
        type="button"
        className={`tree-row${activePath === node.path ? ' active' : ''}${depth === 0 && isDir ? ' top' : ''}`}
        style={{ paddingLeft: 8 + depth * INDENT }}
        onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onContextMenu={onMenu ? (e) => { e.preventDefault(); e.stopPropagation(); onMenu(node, { left: e.clientX, top: e.clientY }); } : undefined}
        title={node.run ? `${node.name}\n${statusLabel(node.run.status)}${node.run.currentStep ? ` · ${node.run.currentStep}` : ''}` : node.path}
      >
        {isDir ? <span className={`tree-caret${open ? ' open' : ''}`}><IconChevron size={14} /></span> : <span className="tree-icon"><FileIcon name={node.name} size={16} /></span>}
        {section && <span className="tree-section-icon"><SectionIcon name={section} size={16} /></span>}
        <span className="tree-label">{label}</span>
        {favorites?.has(node.path) && <span className="star-mark" title={t('Favorite')}><IconStar size={13} /></span>}
        {!isDir && tagColors && tagColors(node.path).length > 0 && (
          <span className="tree-tags">{tagColors(node.path).map((c, i) => <span key={i} className="dot" style={{ background: c }} />)}</span>
        )}
        {node.run && <span className={`dot ${statusClass(node.run.status)}`} />}
        {run && !hover && <span className="tree-meta">{run.date}</span>}
        {isDir && depth === 0 && node.children && <span className="tree-meta">{node.children.length}</span>}
      </button>
      {onMenu && (
        <button type="button" className="tree-more" title={t('More options')} aria-label={t('More options')} aria-haspopup="menu"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onMenu(node, { left: r.left, top: r.bottom + 2 }); }}>
          <IconMore size={14} />
        </button>
      )}
      </div>
      {isDir && open && node.children && (
        <ul role="group">
          {(node.path === 'notes' && favorites ? [...node.children].sort((a, b) => Number(favorites.has(b.path)) - Number(favorites.has(a.path))) : node.children)
            .map((c) => <Node key={c.path} node={c} depth={depth + 1} activePath={activePath} onOpen={onOpen} expanded={expanded} onToggle={onToggle} onNewNote={onNewNote} tagColors={tagColors} onMenu={onMenu} favorites={favorites} nodes={[]} />)}
          {node.path === 'notes' && (
            <li><button type="button" className="tree-row tree-new" style={{ paddingLeft: 8 + (depth + 1) * INDENT }} onClick={onNewNote}><span className="tree-icon"><IconPlus size={14} /></span><span className="tree-label">{t('New note')}</span></button></li>
          )}
          {node.children.length === 0 && node.path !== 'notes' && <li className="tree-empty" style={{ paddingLeft: 8 + (depth + 1) * INDENT }}>{t('empty')}</li>}
        </ul>
      )}
    </li>
  );
}
