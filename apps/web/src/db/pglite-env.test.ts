import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pgliteDataDir, usesPglite } from './pglite-env';

const originalUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalUrl;
  }
});

describe('usesPglite', () => {
  it('is true for pglite and pglite: paths', () => {
    expect(usesPglite('pglite')).toBe(true);
    expect(usesPglite('PGlite')).toBe(true);
    expect(usesPglite('pglite:.pglite')).toBe(true);
  });

  it('is false for Neon postgres URLs', () => {
    expect(usesPglite('postgresql://user:pass@host/db?sslmode=require')).toBe(false);
    expect(usesPglite('postgres://user:pass@host/db')).toBe(false);
  });

  it('defaults to PGlite in non-production when DATABASE_URL is unset', () => {
    expect(usesPglite('', 'development')).toBe(true);
    expect(usesPglite(undefined, 'test')).toBe(true);
  });

  it('does not default to PGlite in production when DATABASE_URL is unset', () => {
    expect(usesPglite('', 'production')).toBe(false);
    expect(usesPglite(undefined, 'production')).toBe(false);
  });
});

describe('pgliteDataDir', () => {
  it('uses .pglite in cwd by default', () => {
    expect(pgliteDataDir('pglite')).toBe(path.resolve(process.cwd(), '.pglite'));
    expect(pgliteDataDir(undefined)).toBe(path.resolve(process.cwd(), '.pglite'));
  });

  it('resolves a relative pglite: path against cwd', () => {
    expect(pgliteDataDir('pglite:tmp/local-pg')).toBe(path.resolve(process.cwd(), 'tmp/local-pg'));
  });

  it('keeps an absolute pglite: path', () => {
    expect(pgliteDataDir('pglite:/tmp/ft9ja-pglite')).toBe('/tmp/ft9ja-pglite');
  });
});
