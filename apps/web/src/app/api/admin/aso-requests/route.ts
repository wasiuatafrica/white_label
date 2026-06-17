import { sendEmail } from '@/app/api/utils/send-email';
import {
  getAsoApprovalNotice,
  listAllAsoRequests,
  reviewAsoRequest,
} from '@/db/queries/aso-requests';

export async function GET() {
  try {
    const rows = await listAllAsoRequests();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch ASO requests' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const requestId = Number(body.request_id);
    const status = String(body.status || '');
    const adminNotes = typeof body.admin_notes === 'string' ? body.admin_notes : null;

    if (!requestId || !['approved', 'rejected'].includes(status)) {
      return Response.json(
        { error: 'request_id and status (approved|rejected) are required' },
        { status: 400 }
      );
    }

    const result = await reviewAsoRequest({
      requestId,
      status: status as 'approved' | 'rejected',
      reviewedBy: 'super_admin',
      adminNotes,
    });

    if (!result.request) {
      return Response.json({ error: 'ASO request not found or already reviewed' }, { status: 404 });
    }

    if (status === 'approved' && result.token) {
      const notice = await getAsoApprovalNotice(requestId);
      if (notice) {
        const baseUrl = (
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.BETTER_AUTH_URL ||
          'https://ft9ja.com'
        ).replace(/\/$/, '');
        const dashboardUrl = `${baseUrl}/${notice.partner_slug}/dashboard?tab=account&ss_account_id=${notice.ss_account_id}&aso_token=${result.token}`;

        try {
          await sendEmail({
            to: notice.trader_email,
            subject: `${notice.partner_firm_name} ASO request approved`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
                <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">ASO request approved</h1>
                <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 14px">
                  Hi ${notice.trader_name}, your ASO request for Synthetic Signals account <strong>${notice.ss_account_number}</strong> with <strong>${notice.partner_firm_name}</strong> has been approved.
                </p>
                <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin:18px 0">
                  <div style="font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:.08em">ASO approval token</div>
                  <div style="font-size:14px;font-weight:900;line-height:1.6;word-break:break-all;color:#111827;margin-top:6px">${result.token}</div>
                </div>
                <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 14px">
                  Log in to your trader dashboard and add your ASO account number, password, and investor password. This token only works for your user account and this Synthetic Signals account.
                </p>
                <a href="${dashboardUrl}" style="display:inline-block;background:${notice.partner_brand_color || '#16A34A'};color:#fff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700">Add ASO Account</a>
                <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #F3F4F6;margin:20px 0 0;padding-top:14px">
                  Keep this token private. It expires after 14 days and can only be used once.
                </p>
              </div>
            `,
            text: `Your ASO request for Synthetic Signals account ${notice.ss_account_number} has been approved. Token: ${result.token}. Log in to your dashboard to add your ASO account. This token expires after 14 days and can only be used once.`,
          });
        } catch (emailErr) {
          console.error('Failed to send ASO approval email:', emailErr);
        }
      }
    }

    return Response.json({ success: true, request: result.request });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update ASO request' }, { status: 500 });
  }
}
