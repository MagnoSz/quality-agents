// Quality Agents file icons: filled, soft duotone, one butter detail per icon.
// Built on a 24x24 grid from up to three tones (CSS variables in styles.css):
//   --qi-body   the silhouette, carries recognition (>= 3:1 on --bg-2 in both themes)
//   --qi-shade  a secondary surface (pages, back card, glass): depth only
//   --qi-accent a single butter-yellow detail
// Layers go bottom to top; each upper layer cuts a transparent 1.5u gap out of the
// layers below it (a mask), so icons read on any row background (hover, active).
// Design reference: the "Quality Agents" design system, Iconography section.

import { useId } from 'react';

type Tone = 'body' | 'shade' | 'accent';
interface Layer { tone: Tone; d: string; evenodd?: boolean; round?: boolean }

const GAP = 1.5;
const ROUND = 1.4; // extra rounding for organic shapes: a same-colour stroke

const LAYERS = {
  context: [
    { tone: 'shade', d: 'M2.5 8c3-1.3 6-1.1 8.7.8V22c-2.7-1.6-5.7-1.8-8.7-.6Z M21.5 8c-3-1.3-6-1.1-8.7.8V22c2.7-1.6 5.7-1.8 8.7-.6Z', round: true },
    { tone: 'body', d: 'M2.5 5.2c3-1.3 6-1.1 8.7.8v13.4c-2.7-1.6-5.7-1.8-8.7-.6Z M21.5 5.2c-3-1.3-6-1.1-8.7.8v13.4c2.7-1.6 5.7-1.8 8.7-.6Z', round: true },
    { tone: 'accent', d: 'M15.2 3.6h3.4v8.1a.55.55 0 0 1-.9.42l-1.8-1.5-1.8 1.5a.55.55 0 0 1-.9-.42V4.6a1 1 0 0 1 1-1Z' },
  ],
  inbox: [
    { tone: 'accent', d: 'M8.5 2H15.5A2 2 0 0 1 17.5 4V12A2 2 0 0 1 15.5 14H8.5A2 2 0 0 1 6.5 12V4A2 2 0 0 1 8.5 2ZM9.8 5H14.2A0.8 0.8 0 0 1 15 5.8V5.8A0.8 0.8 0 0 1 14.2 6.6H9.8A0.8 0.8 0 0 1 9 5.8V5.8A0.8 0.8 0 0 1 9.8 5ZM9.8 8H12.2A0.8 0.8 0 0 1 13 8.8V8.799999999999999A0.8 0.8 0 0 1 12.2 9.6H9.8A0.8 0.8 0 0 1 9 8.799999999999999V8.8A0.8 0.8 0 0 1 9.8 8Z', evenodd: true },
    { tone: 'body', d: 'M2.5 14.5a3 3 0 0 1 3-3H8.2l1.1 1.9a1.6 1.6 0 0 0 1.4.8h2.6a1.6 1.6 0 0 0 1.4-.8l1.1-1.9h2.7a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3Z' },
  ],
  runs: [
    { tone: 'shade', d: 'M10.2 2H17.3A3.2 3.2 0 0 1 20.5 5.2V12.8A3.2 3.2 0 0 1 17.3 16H10.2A3.2 3.2 0 0 1 7 12.8V5.2A3.2 3.2 0 0 1 10.2 2Z' },
    { tone: 'body', d: 'M7 6H14.5A3.5 3.5 0 0 1 18 9.5V18A3.5 3.5 0 0 1 14.5 21.5H7A3.5 3.5 0 0 1 3.5 18V9.5A3.5 3.5 0 0 1 7 6Z' },
    { tone: 'accent', d: 'M9 10.6a.9.9 0 0 1 1.35-.78l5.1 3.1a.9.9 0 0 1 0 1.55l-5.1 3.1A.9.9 0 0 1 9 16.8Z' },
  ],
  notes: [
    { tone: 'body', d: 'M6.5 3.5h11a2.5 2.5 0 0 1 2.5 2.5v9.8L14.3 21.5H6.5A2.5 2.5 0 0 1 4 19V6a2.5 2.5 0 0 1 2.5-2.5Z M7.6 9.3h8.8v1.7H7.6Z M7.6 13h5.2v1.7H7.6Z', evenodd: true },
    { tone: 'shade', d: 'M14.3 21.5v-4.2a1.5 1.5 0 0 1 1.5-1.5H20Z' },
    { tone: 'accent', d: 'M9 1.8h6a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z' },
  ],
  temporary: [
    { tone: 'shade', d: 'M6.5 4.5h11v2.2c0 2.9-2.1 4.4-3.7 5.3 1.6.9 3.7 2.4 3.7 5.3v2.2h-11v-2.2c0-2.9 2.1-4.4 3.7-5.3-1.6-.9-3.7-2.4-3.7-5.3Z' },
    { tone: 'accent', d: 'M8.6 18.9c0-2.1 1.5-3.4 3.4-3.4s3.4 1.3 3.4 3.4Z M9.3 7.8h5.4c-.3 1.3-1.3 2.2-2.7 2.9-1.4-.7-2.4-1.6-2.7-2.9Z' },
    { tone: 'body', d: 'M6.2 2H17.8A1.7 1.7 0 0 1 19.5 3.7V3.7A1.7 1.7 0 0 1 17.8 5.4H6.2A1.7 1.7 0 0 1 4.5 3.7V3.7A1.7 1.7 0 0 1 6.2 2ZM6.2 18.6H17.8A1.7 1.7 0 0 1 19.5 20.3V20.3A1.7 1.7 0 0 1 17.8 22H6.2A1.7 1.7 0 0 1 4.5 20.3V20.3A1.7 1.7 0 0 1 6.2 18.6Z' },
  ],
} satisfies Record<string, Layer[]>;

export type SectionIconName = keyof typeof LAYERS;

export const isSectionIconName = (name: string): name is SectionIconName => Object.hasOwn(LAYERS, name);

interface Props {
  name: SectionIconName;
  size?: number;
  /** Accessible name. Omit when a visible label sits next to the icon (decorative). */
  title?: string;
}

export function SectionIcon({ name, size = 16, title }: Props) {
  const id = `qi${useId().replace(/[^A-Za-z0-9_-]/g, '')}`; // keeps ids valid inside url(#...)
  const layers: Layer[] = LAYERS[name];
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="qi" {...a11y}>
      <defs>
        {layers.map((_, i) => i < layers.length - 1 && (
          <mask key={i} id={`${id}-${i}`} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
            <rect x="-2" y="-2" width="28" height="28" fill="#fff" />
            {layers.slice(i + 1).map((above, j) => (
              <path key={j} d={above.d} fill="#000" stroke="#000" strokeWidth={GAP * 2 + (above.round ? ROUND : 0)} strokeLinejoin="round" />
            ))}
          </mask>
        ))}
      </defs>
      {layers.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill={`var(--qi-${l.tone})`}
          fillRule={l.evenodd ? 'evenodd' : undefined}
          stroke={l.round ? `var(--qi-${l.tone})` : undefined}
          strokeWidth={l.round ? ROUND : undefined}
          strokeLinejoin={l.round ? 'round' : undefined}
          mask={i < layers.length - 1 ? `url(#${id}-${i})` : undefined}
        />
      ))}
    </svg>
  );
}
