import { describe, expect, it } from 'vitest';
import {
  ADMIN_TAB_IDS,
  DEFAULT_ADMIN_TAB,
  adminTabPath,
  isAdminTabId,
} from './admin-tabs';

describe('admin tabs', () => {
  it('accepts known tab ids and rejects reserved pages', () => {
    expect(isAdminTabId('partners')).toBe(true);
    expect(isAdminTabId(DEFAULT_ADMIN_TAB)).toBe(true);
    expect(isAdminTabId('docs')).toBe(false);
    expect(isAdminTabId('emails')).toBe(false);
    expect(isAdminTabId('not-a-tab')).toBe(false);
  });

  it('builds a path for every tab', () => {
    for (const tab of ADMIN_TAB_IDS) {
      expect(adminTabPath(tab)).toBe(`/admin/${tab}`);
    }
  });
});
