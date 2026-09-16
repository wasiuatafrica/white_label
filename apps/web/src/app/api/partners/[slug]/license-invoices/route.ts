import {
  getPartnerLicenseCoverage,
  LicenseInvoiceError,
  listLicenseInvoicesForPartner,
  uploadPartnerLicenseReceipt,
} from '@/db/queries/partner-license-invoices';
import {
  isPartnerAdminUnauthorized,
  requirePartnerAdmin,
  requirePartnerAdminWrite,
} from '@/lib/partner-admin-auth-guard';
import { issueAndNotifyRenewalForPartner } from '@/lib/partner-license-renewal';
import { isLicenseRecurringExempt } from '@/lib/partner-pricing';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdmin(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    if (!auth.readOnly) {
      await issueAndNotifyRenewalForPartner(auth.partnerId, new Date(), {
        allowSuspended: true,
      });
    }

    const [invoices, coverage] = await Promise.all([
      listLicenseInvoicesForPartner(auth.partnerId),
      getPartnerLicenseCoverage(auth.partnerId),
    ]);

    return Response.json({
      invoices,
      coverage,
    });
  } catch (e) {
    console.error('[PARTNER_LICENSE_INVOICES_GET]', e);
    return Response.json({ error: 'Failed to fetch partner license invoices' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requirePartnerAdminWrite(request, slug);
  if (isPartnerAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { payment_proof_url, invoice_id } = body;

    if (!payment_proof_url || typeof payment_proof_url !== 'string') {
      return Response.json(
        { error: 'payment_proof_url is required' },
        { status: 400 }
      );
    }

    if (isLicenseRecurringExempt(slug)) {
      return Response.json(
        { error: 'This partner is exempt from recurring license invoices' },
        { status: 400 }
      );
    }

    await issueAndNotifyRenewalForPartner(auth.partnerId, new Date(), {
      allowSuspended: true,
    });

    const updated = await uploadPartnerLicenseReceipt({
      partnerId: auth.partnerId,
      invoiceId: invoice_id ? Number(invoice_id) : undefined,
      paymentProofUrl: payment_proof_url,
    });

    return Response.json({
      success: true,
      invoice: updated,
    });
  } catch (e) {
    if (e instanceof LicenseInvoiceError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error('[PARTNER_LICENSE_INVOICES_POST]', e);
    return Response.json({ error: 'Failed to submit payment receipt' }, { status: 500 });
  }
}
