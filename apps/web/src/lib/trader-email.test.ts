import { describe, expect, it } from 'vitest';
import {
  traderEmailConflictMessage,
  traderEmailSignupDecision,
} from './trader-email';

describe('traderEmailSignupDecision', () => {
  it('creates a trader when the email is unused', () => {
    expect(traderEmailSignupDecision(null, 1)).toBe('create');
  });

  it('reuses a trader on the same partner', () => {
    expect(traderEmailSignupDecision(4, 4)).toBe('reuse');
  });

  it('conflicts when the email belongs to another firm', () => {
    expect(traderEmailSignupDecision(2, 4)).toBe('conflict');
  });
});

describe('traderEmailConflictMessage', () => {
  it('tells the trader to sign in on the same firm', () => {
    expect(traderEmailConflictMessage(3, 3)).toBe('A trader with this email already exists.');
  });

  it('does not suggest signing in on another firm', () => {
    expect(traderEmailConflictMessage(1, 3)).toBe(
      'This email is already registered with another firm.'
    );
  });
});
