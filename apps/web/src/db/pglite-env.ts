import path from 'node:path';

const PGLITE_PREFIX = 'pglite:';
const DEFAULT_PGLITE_DIR = '.pglite';

export function usesPglite(
  databaseUrl = process.env.DATABASE_URL,
  nodeEnv = process.env.NODE_ENV
): boolean {
  const trimmed = databaseUrl?.trim() ?? '';
  const lower = trimmed.toLowerCase();
  if (lower === 'pglite' || lower.startsWith(PGLITE_PREFIX)) {
    return true;
  }
  return trimmed === '' && nodeEnv !== 'production';
}

export function pgliteDataDir(databaseUrl = process.env.DATABASE_URL): string {
  const trimmed = databaseUrl?.trim() ?? '';
  if (trimmed.toLowerCase().startsWith(PGLITE_PREFIX)) {
    const rest = trimmed.slice(PGLITE_PREFIX.length).trim();
    if (rest) {
      return path.isAbsolute(rest) ? rest : path.resolve(process.cwd(), rest);
    }
  }
  return path.resolve(process.cwd(), DEFAULT_PGLITE_DIR);
}
