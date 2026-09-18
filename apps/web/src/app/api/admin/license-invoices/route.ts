import { getPartnerPrivateBySlug } from '@/db/queries/partners';
import {
  grantComplimentaryLicensePeriod,
  LicenseInvoiceError,
  listAllLicenseInvoices,
  reviewLicenseInvoice,
} from '@/db/queries/partner-license-invoices';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';
import { sendPartnerLicensePaymentConfirmedEmail } from '@/lib/email/ft9ja-to-partner';
import { formatPeriodRange } from '@/lib/partner-license-billing';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const rows = await listAllLicenseInvoices();
    return Response.json(rows);
  } catch (e) {
    console.error('[ADMIN_LICENSE_INVOICES_GET]', e);
    return Response.json({ error: 'Failed to fetch license invoices' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const body = await request.json();
    const { action, invoice_id, partner_id, slug, verified_amount, force_approve, verification_note, reason, period_start } = body;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'grant_complimentary') {
      if (!partner_id || !slug) {
        return Response.json({ error: 'partner_id and slug are required' }, { status: 400 });
      }
      const noteReason = (reason || verification_note || 'Complimentary period granted by Super Admin').trim();
      const invoice = await grantComplimentaryLicensePeriod({
        partnerId: Number(partner_id),
        slug: String(slug),
        reason: noteReason,
        grantedBy: auth.admin.email,
      });

      await logAdminAction({
        adminUserId: auth.admin.id,
        action: 'license_invoice.grant_complimentary',
        resourceType: 'partner_license_invoice',
        resourceId: String(invoice.id),
        metadata: { partner_id, slug, reason: noteReason },
        request,
      });

      return Response.json({ success: true, invoice });
    }

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    if (action === 'approve') {
      const { invoice, partnerId } = await reviewLicenseInvoice({
        invoiceId: Number(invoice_id),
        action: 'approve',
        verifiedAmount: verified_amount,
        forceApprove: Boolean(force_approve),
        verificationNote: verification_note,
        reviewedBy: auth.admin.email,
        periodStartDate: period_start == null || period_start === '' ? null : String(period_start),
      });

      // Send P-04 email for approved renewal payment
      try {
        const partner = await getPartnerPrivateBySlug(body.partner_slug || slug);
        if (partner) {
          const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date();
          const periodStart = new Date(invoice.period_start);
          const periodEnd = new Date(invoice.period_end);
          await sendPartnerLicensePaymentConfirmedEmail(partner, {
            paidAt,
            periodEnd,
            periodRange: formatPeriodRange(periodStart, periodEnd),
            amount: invoice.amount,
          });
        }
      } catch (emailErr) {
        console.error('[ADMIN_LICENSE_INVOICES_PATCH] Failed to send P-04 confirmation email:', emailErr);
      }

      await logAdminAction({
        adminUserId: auth.admin.id,
        action: 'license_invoice.approve',
        resourceType: 'partner_license_invoice',
        resourceId: String(invoice.id),
        metadata: {
          verified_amount,
          force_approve: Boolean(force_approve),
          verification_note,
          period_start: period_start ?? null,
        },
        request,
      });

      return Response.json({ success: true, invoice });
    }

    if (action === 'reject') {
      const { invoice } = await reviewLicenseInvoice({
        invoiceId: Number(invoice_id),
        action: 'reject',
        verificationNote: verification_note,
        reviewedBy: auth.admin.email,
      });

      await logAdminAction({
        adminUserId: auth.admin.id,
        action: 'license_invoice.reject',
        resourceType: 'partner_license_invoice',
        resourceId: String(invoice.id),
        metadata: { verification_note },
        request,
      });

      return Response.json({ success: true, invoice });
    }

    if (action === 'waive') {
      const { invoice } = await reviewLicenseInvoice({
        invoiceId: Number(invoice_id),
        action: 'waive',
        verificationNote: verification_note,
        reviewedBy: auth.admin.email,
      });

      await logAdminAction({
        adminUserId: auth.admin.id,
        action: 'license_invoice.waive',
        resourceType: 'partner_license_invoice',
        resourceId: String(invoice.id),
        metadata: { verification_note },
        request,
      });

      return Response.json({ success: true, invoice });
    }

    return Response.json({ error: `Invalid action: ${String(action)}` }, { status: 400 });
  } catch (e) {
    if (e instanceof LicenseInvoiceError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error('[ADMIN_LICENSE_INVOICES_PATCH]', e);
    return Response.json({ error: 'Failed to process license invoice' }, { status: 500 });
  }
}
