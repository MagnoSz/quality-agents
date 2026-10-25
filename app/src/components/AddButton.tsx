import type { MouseEvent } from 'react';

// The one "add" button of the app: a small butter square with a plus. Use it for
// every icon-only "create / new" action so they all look and behave the same.
//   sm 22px (list headers, tab bar) · md 26px (toolbars) · lg 36px (start screen actions)
//   variant "ghost": no fill until hover, for crowded bars (the terminal tab strip).

interface Props {
  title: string; // tooltip and accessible name
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'ghost';
  pressed?: boolean; // when it toggles a form open
  disabled?: boolean;
}

const GLYPH = { sm: 12, md: 14, lg: 18 } as const;

export function AddButton({ title, onClick, size = 'md', variant = 'solid', pressed, disabled }: Props) {
  const g = GLYPH[size];
  return (
    <button
      type="button"
      className={`add-btn add-btn-${size}${variant === 'ghost' ? ' add-btn-ghost' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <svg width={g} height={g} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
