import { useState } from 'react';
import { describeRun, statusLabel, type TreeNode } from '../api';
import { t } from '../i18n';
import { IconChevron, IconFile, IconPlus } from './Icons';

interface Props {
  nodes: TreeNode[];
  activePath: string | null;
  onOpen: (path: string) => void;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onNewNote: () => void;
}

const friendly = (name: string): string => ({
  context: t('Context'), inbox: t('Inbox'), runs: t('Activities'), notes: t('Notes'), temporary: t('Temporary'),
  'proposed-updates.md': t('Proposed updates'), 'activity-log.md': t('Activity log'),
} as Record<string, string>)[name] ?? name;

const statusClass = (s: string): string => (s === 'completed' ? 'dot-ok' : s === 'cancelled' ? 'dot-muted' : s === 'blocked' ? 'dot-err' : 'dot-warn');

export function FileTree(props: Props) {
  return <ul className="tree" role="tree">{props.nodes.map((n) => <Node key={n.path} node={n} depth={0} {...props} />)}</ul>;
}

function Node({ node, depth, activePath, onOpen, expanded, onToggle, onNewNote }: Props & { node: TreeNode; depth: number }) {
  const [hover, setHover] = useState(false);
  const isDir = node.type === 'dir';
  const open = expanded.has(node.path);
  const run = node.run ? describeRun(node.name) : null;
  if (node.mcp) {
    return <li role="treeitem"><div className="tree-row" style={{ paddingLeft: 8 + depth * 14 }} title={`${node.name}\n${node.mcp}`}>
      <span className="tree-icon"><IconFile size={14} /></span><span className="tree-label">{node.name}</span><span className="tree-meta">{node.mcp}</span>
    </div></li>;
  }
  const label = run ? run.title : depth === 0 ? friendly(node.name) : node.path.startsWith('notes/') ? node.name.replace(/\.md$/, '') : node.name;

  return (
    <li role="treeitem" aria-expanded={isDir ? open : undefined}>
      <button
        type="button"
        className={`tree-row${activePath === node.path ? ' active' : ''}${depth === 0 && isDir ? ' top' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={node.run ? `${node.name}\n${statusLabel(node.run.status)}${node.run.currentStep ? ` · ${node.run.currentStep}` : ''}` : node.path}
      >
        {isDir ? <span className={`tree-caret${open ? ' open' : ''}`}><IconChevron size={14} /></span> : <span className="tree-icon"><IconFile size={14} /></span>}
        <span className="tree-label">{label}</span>
        {node.run && <span className={`dot ${statusClass(node.run.status)}`} />}
        {run && !hover && <span className="tree-meta">{run.date}</span>}
        {isDir && depth === 0 && node.children && <span className="tree-meta">{node.children.length}</span>}
      </button>
      {isDir && open && node.children && (
        <ul role="group">
          {node.children.map((c) => <Node key={c.path} node={c} depth={depth + 1} activePath={activePath} onOpen={onOpen} expanded={expanded} onToggle={onToggle} onNewNote={onNewNote} nodes={[]} />)}
          {node.path === 'notes' && (
            <li><button type="button" className="tree-row tree-new" style={{ paddingLeft: 8 + (depth + 1) * 14 }} onClick={onNewNote}><span className="tree-icon"><IconPlus size={14} /></span><span className="tree-label">{t('New note')}</span></button></li>
          )}
          {node.children.length === 0 && node.path !== 'notes' && <li className="tree-empty" style={{ paddingLeft: 22 + depth * 14 }}>{t('empty')}</li>}
        </ul>
      )}
    </li>
  );
}
