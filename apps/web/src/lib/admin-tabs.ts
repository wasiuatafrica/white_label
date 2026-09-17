export const ADMIN_TAB_IDS = [
  'partners',
  'partner-signups',
  'license-invoices',
  'traders',
  'trade-accounts',
  'kyc',
  'payments',
  'evaluation-payments',
  'payouts',
  'partner-payouts',
  'requests',
  'admins',
  'audit',
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

export const DEFAULT_ADMIN_TAB: AdminTabId = 'partners';

export function isAdminTabId(value: string): value is AdminTabId {
  return (ADMIN_TAB_IDS as readonly string[]).includes(value);
}

export function adminTabPath(tab: AdminTabId) {
  return `/admin/${tab}`;
}
