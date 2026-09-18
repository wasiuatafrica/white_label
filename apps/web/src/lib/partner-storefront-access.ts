import { getPartnerIdBySlug } from '@/db/queries/partners';
import { getPartnerLicenseCoverage } from '@/db/queries/partner-license-invoices';
import { isLicenseStorefrontFrozen } from '@/lib/partner-license-billing';
import { isLicenseRecurringExempt } from '@/lib/partner-pricing';

export class PartnerStorefrontFrozenError extends Error {
  constructor(message = 'This storefront is frozen until the partner license is renewed.') {
    super(message);
    this.name = 'PartnerStorefrontFrozenError';
  }
}

export async function isPartnerStorefrontFrozen(slug: string, now: Date = new Date()) {
  if (isLicenseRecurringExempt(slug)) return false;
  const partnerId = await getPartnerIdBySlug(slug);
  if (!partnerId) return false;
  const coverage = await getPartnerLicenseCoverage(partnerId, now);
  return isLicenseStorefrontFrozen(coverage, coverage.latestInvoice, now);
}

export async function assertPartnerStorefrontOpen(slug: string, now: Date = new Date()) {
  if (await isPartnerStorefrontFrozen(slug, now)) {
    throw new PartnerStorefrontFrozenError();
  }
}

export function partnerStorefrontFrozenResponse() {
  return Response.json(
    { error: 'This storefront is frozen until the partner license is renewed.' },
    { status: 403 }
  );
}
