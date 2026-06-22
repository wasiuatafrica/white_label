import {
  activateEvaluation,
  EvaluationActivationError,
  rejectEvaluationPayment,
} from '@/db/queries/evaluations';
import { getPaymentActivationNotice, listAllEvaluationPayments } from '@/db/queries/admin';
import { sendEmail } from '@/app/api/utils/send-email';
import { toMoneyNumber } from '@/lib/partner-pricing';

export async function GET() {
  try {
    const rows = await listAllEvaluationPayments();
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch evaluation payments' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { eval_id, action, verified_amount, force_approve, verification_note } = body;

    if (!eval_id) {
      return Response.json({ error: 'eval_id is required' }, { status: 400 });
    }

    if (action === 'reject') {
      const result = await rejectEvaluationPayment(Number(eval_id), {
        verificationNote: typeof verification_note === 'string' ? verification_note : null,
      });
      if (!result) {
        return Response.json(
          { error: 'Evaluation not found or not awaiting payment approval' },
          { status: 404 }
        );
      }
      return Response.json({ success: true, rejected: true });
    }

    const verifiedAmount = verified_amount ?? body.amount;
    if (verifiedAmount == null || toMoneyNumber(verifiedAmount) <= 0) {
      return Response.json({ error: 'verified_amount is required' }, { status: 400 });
    }

    const result = await activateEvaluation(Number(eval_id), {
      verifiedAmount,
      forceApprove: Boolean(force_approve),
      verificationNote: typeof verification_note === 'string' ? verification_note : null,
    });
    if (!result) {
      return Response.json({ error: 'Evaluation not found or already activated' }, { status: 404 });
    }

    const notice = await getPaymentActivationNotice(eval_id);
    if (notice) {
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.BETTER_AUTH_URL ||
        'https://ft9ja.com'
      ).replace(/\/$/, '');
      const dashboardUrl = `${baseUrl}/${notice.partner_slug}/dashboard`;
      try {
        await sendEmail({
          to: notice.trader_email,
          subject: `${notice.partner_firm_name} payment verified - add your trading account`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
              <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">Payment verified</h1>
              <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 14px">
                Hi ${notice.trader_name}, FT9ja has verified your payment for your ${notice.eval_type} evaluation with <strong>${notice.partner_firm_name}</strong>.
              </p>
              <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin:18px 0">
                <div style="font-size:12px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Activation code</div>
                <div style="font-size:28px;font-weight:900;letter-spacing:.14em;color:#111827;margin-top:6px">${notice.account_creation_code}</div>
              </div>
              <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 14px">
                Log in to your trader dashboard and use this code to add your MT5 Deriv-Demo account number, password, and investor password.
              </p>
              <a href="${dashboardUrl}" style="display:inline-block;background:${notice.partner_brand_color || '#16A34A'};color:#fff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700">Open Dashboard</a>
              <p style="font-size:12px;color:#9CA3AF;border-top:1px solid #F3F4F6;margin:20px 0 0;padding-top:14px">
                Keep this code private. Your partner admin can view it if you need support.
              </p>
            </div>
          `,
          text: `Payment verified. Your activation code is ${notice.account_creation_code}. Log in to your trader dashboard to add your trading account details.`,
        });
      } catch (emailErr) {
        console.error('Failed to send payment verification email:', emailErr);
      }
    }

    return Response.json({ success: true, account_creation_code: result.account_creation_code });
  } catch (e) {
    if (e instanceof EvaluationActivationError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    console.error(e);
    return Response.json({ error: 'Failed to confirm evaluation payment' }, { status: 500 });
  }
}
