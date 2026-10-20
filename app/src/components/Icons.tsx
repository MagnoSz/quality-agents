// Small inline icon set (stroke icons, 20px), so the app needs no icon library.

type IconProps = { size?: number };

const base = (size = 20) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
});

export const IconChat = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
);
export const IconFolder = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
export const IconBox = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
);
export const IconList = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
);
export const IconPlug = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M9 7V3M15 7V3" /><path d="M6 7h12v4a6 6 0 0 1-12 0z" /><path d="M12 17v4" /></svg>
);
export const IconPower = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M12 3v8" /><path d="M6.3 6.3a8 8 0 1 0 11.4 0" /></svg>
);
export const IconCheck = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconDot = ({ size }: IconProps) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="4" /></svg>
);
export const IconPlay = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M7 4.5v15l12-7.5z" /></svg>
);
export const IconTerminal = ({ size }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M12 15h5" /></svg>
);
export const IconCode = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" /></svg>
);
export const IconGlobe = ({ size }: IconProps) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
export const IconCopy = ({ size }: IconProps) => (
  <svg {...base(size)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);
export const IconRefresh = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
);
export const IconFile = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
export const IconHome = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const IconChevron = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconEdit = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></svg>
);
export const IconEye = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconExternal = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
);
export const IconX = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconPlus = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconPanel = ({ size }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>
);
export const IconUsers = ({ size }: IconProps) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3 5.5" /></svg>
);
export const IconTrash = ({ size }: IconProps) => (
  <svg {...base(size)}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
