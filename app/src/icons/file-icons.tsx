// File-type icons: one page silhouette shared by every type, with the type's symbol
// cut out of it (transparent, so it reads on hover and on the active row).
// Quieter than the section icons on purpose: one tone (--qi-file), no butter accent,
// so a long list of files does not compete with the section headers.

import { useId } from 'react';

interface Cut { d: string; w?: number; fill?: boolean }

const PAGE = 'M7.5 2.5H14l5 5v11.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19V5a2.5 2.5 0 0 1 2.5-2.5Z';
const FOLD = 'M14.2 2.5v3.3a1.7 1.7 0 0 0 1.7 1.7H19Z';
const STROKE = 1.6;
const FOLD_GAP = 3; // 1.5u on each side of the folded corner

const KINDS = {
  markdown: { ext: ['md'], cuts: [{ d: 'M10.4 10.5l-.9 7M14.4 10.5l-.9 7M8.4 12.6h7.4M8.1 15.4h7.4' }] },
  json: { ext: ['json'], cuts: [{ d: 'M10.2 10.2c-1.3 0-1.7.6-1.7 1.6v.7c0 .7-.4 1.4-1.2 1.4.8 0 1.2.7 1.2 1.4v.7c0 1 .4 1.6 1.7 1.6M13.8 10.2c1.3 0 1.7.6 1.7 1.6v.7c0 .7.4 1.4 1.2 1.4-.8 0-1.2.7-1.2 1.4v.7c0 1-.4 1.6-1.7 1.6' }] },
  word: { ext: ['docx', 'doc'], cuts: [{ d: 'M8.6 10.8h3.4M8.6 14h6.8M8.6 17h6.8', w: 1.7 }, { d: 'M8.6 10.8h3.4', w: 2.6 }] },
  sheet: { ext: ['xlsx', 'xls'], cuts: [{ d: 'M8.3 11.3a1 1 0 0 1 1-1h5.4a1 1 0 0 1 1 1v5.9a1 1 0 0 1-1 1H9.3a1 1 0 0 1-1-1ZM8.3 14.2h7.4M12 10.3v7.9', w: 1.5 }] },
  pdf: { ext: ['pdf'], cuts: [{ d: 'M8.2 13.6h7.6v3.3H8.2Z', w: 1.3, fill: true }, { d: 'M8.6 10.6h4', w: 1.6 }] },
  image: { ext: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'], cuts: [{ d: 'M7.8 18.2l2.9-3.8 2.1 2.5 1.3-1.5 2.1 2.8Z', w: 1, fill: true }, { d: 'M14.6 11.2h.01', w: 3 }] },
  text: { ext: ['txt'], cuts: [{ d: 'M8.6 11h6.8M8.6 14h6.8M8.6 17h4' }] },
  log: { ext: ['log'], cuts: [{ d: 'M8.4 11h.01M8.4 14h.01M8.4 17h.01', w: 2.2 }, { d: 'M11 11h4.6M11 14h4.6M11 17h3' }] },
  csv: { ext: ['csv'], cuts: [{ d: 'M8.5 11h2.4M13.1 11h2.4M8.5 14h2.4M13.1 14h2.4M8.5 17h2.4M13.1 17h2.4' }] },
  data: { ext: ['xml', 'yaml', 'yml'], cuts: [{ d: 'M8.6 10.8h4.6M10.8 14h4.6M10.8 17.1h4.6M8.6 10.8v6.3' }] },
  html: { ext: ['html', 'htm'], cuts: [{ d: 'M10.3 11.2l-2.6 2.8 2.6 2.8M13.7 11.2l2.6 2.8-2.6 2.8' }] },
  code: { ext: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'], cuts: [{ d: 'M8.4 11.4l2.6 2.6-2.6 2.6M12.6 17.2h3.2' }] },
  feature: { ext: ['feature'], cuts: [{ d: 'M8.4 14.2l2.3 2.4 4.9-5.2' }] },
  file: { ext: [], cuts: [] },
} satisfies Record<string, { ext: string[]; cuts: Cut[] }>;

export type FileKind = keyof typeof KINDS;

const BY_EXT = new Map<string, FileKind>();
for (const [kind, { ext }] of Object.entries(KINDS) as [FileKind, { ext: string[] }][]) for (const e of ext) BY_EXT.set(e, kind);

/** Icon kind for a file name, by extension; 'file' when unknown. */
export function fileKindFor(name: string): FileKind {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? BY_EXT.get(name.slice(dot + 1).toLowerCase()) ?? 'file' : 'file';
}

interface Props {
  /** File name (or path); its extension picks the symbol. Ignored when kind is given. */
  name?: string;
  kind?: FileKind;
  size?: number;
  /** Accessible name. Omit when a visible label sits next to the icon (decorative). */
  title?: string;
}

export function FileIcon({ name = '', kind, size = 16, title }: Props) {
  const id = `qf${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const cuts: Cut[] = KINDS[kind ?? fileKindFor(name)].cuts;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="qi" {...a11y}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <rect x="-2" y="-2" width="28" height="28" fill="#fff" />
          <path d={FOLD} fill="#000" stroke="#000" strokeWidth={FOLD_GAP} strokeLinejoin="round" />
          {cuts.map((c, i) => (
            <path key={i} d={c.d} fill={c.fill ? '#000' : 'none'} stroke="#000" strokeWidth={c.w ?? STROKE} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </mask>
      </defs>
      <path d={PAGE} fill="var(--qi-file)" mask={`url(#${id})`} />
      <path d={FOLD} fill="var(--qi-file)" />
    </svg>
  );
}
