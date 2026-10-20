// File access rules for the desktop app: everything is resolved inside the
// active project folder (symlinks included), and only known file types can be
// edited or handed to the operating system's default program.

import { existsSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

export class PathError extends Error {}

// Resolves `requested` (relative, / or \ separators) inside `base`, following
// symlinks, and refuses anything that ends up outside it.
export function resolveInside(base: string, requested: string): string {
  if (typeof requested !== 'string' || requested.includes('\0')) throw new PathError('Invalid path.');
  if (isAbsolute(requested) || /^[a-zA-Z]:/.test(requested)) throw new PathError('Absolute paths are not allowed.');
  const realBase = realpathSync(base);
  const target = resolve(realBase, requested);
  const real = existsSync(target) ? realpathSync(target) : target;
  const rel = relative(realBase, real);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new PathError('Path outside the project folder.');
  return real;
}

// Files the app may open with the system's default program. Executables and
// scripts are never opened, whatever their location.
export const OPENABLE_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.csv', '.log', '.xml', '.yaml', '.yml',
  '.pdf', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.odt', '.ods',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.zip', '.html', '.htm',
]);

// Files editable inside the app (plain text only; JSON state stays read-only).
export const EDITABLE_EXTENSIONS = new Set(['.md', '.txt']);

export const isOpenable = (file: string): boolean => OPENABLE_EXTENSIONS.has(extname(file).toLowerCase());
export const isEditable = (file: string): boolean => EDITABLE_EXTENSIONS.has(extname(file).toLowerCase());
