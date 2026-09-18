import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from './db-errors';

describe('isUniqueViolation', () => {
  it('detects Postgres unique_violation codes', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });

  it('detects unique/duplicate messages', () => {
    expect(isUniqueViolation(new Error('duplicate key value violates unique constraint'))).toBe(
      true
    );
  });

  it('ignores unrelated errors', () => {
    expect(isUniqueViolation(new Error('Failed to create partner'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
