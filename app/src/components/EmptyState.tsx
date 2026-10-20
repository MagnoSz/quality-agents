import type { ReactNode } from 'react';

interface Props { icon: ReactNode; title: string; children: ReactNode; badge?: string }

export function EmptyState({ icon, title, children, badge }: Props) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      {badge && <span className="badge badge-muted">{badge}</span>}
      <h3>{title}</h3>
      <div className="empty-text">{children}</div>
    </div>
  );
}
