export type EmailTemplate = {
  id: string;
  category: 'ft9ja-to-partner' | 'partner-to-trader';
  subject: string;
  filename: string;
  description: string;
  html: string;
};

const wrap = (accent: string, logo: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F0;padding:40px 20px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
  <tr><td style="background:${accent};padding:24px 32px">
    <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.5px">${logo}</span>
  </td></tr>
  <tr><td style="padding:32px">${body}</td></tr>
  <tr><td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;text-align:center">
    <p style="margin:0;font-size:11px;color:#9CA3AF">&copy; 2026 FT9ja. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const h = (t: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#111827;line-height:1.3">${t}</h1>`;
const p = (t: string) =>
  `<p style="margin:0 0 14px;font-size:14px;color:#4B5563;line-height:1.6">${t}</p>`;
const li = (items: string[]) =>
  `<ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#4B5563;line-height:2">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const btn = (color: string, label: string) =>
  `<a href="{{URL}}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${color};color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none">${label}</a>`;
const note = (t: string) =>
  `<p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;border-top:1px solid #F3F4F6;padding-top:16px">${t}</p>`;
const dr = (k: string, v: string) =>
  `<tr><td style="padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;width:42%;border-bottom:1px solid #F3F4F6">${k}</td><td style="padding:8px 12px;font-size:13px;color:#111827;font-weight:700;border-bottom:1px solid #F3F4F6">${v}</td></tr>`;
const tbl = (...rows: string[]) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;overflow:hidden;margin:20px 0;border:1px solid #E5E7EB">${rows.join('')}</table>`;
const warn = (color: string, bg: string, border: string, t: string) =>
  `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:16px;margin:16px 0;font-size:13px;color:${color}">${t}</div>`;

// ── FT9ja → Partner ────────────────────────────────────────────────────────────

const P01 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('Welcome to the FT9ja Partners Program') +
    p(
      'Hi {{OWNER_NAME}}, congratulations — your application to become an FT9ja Partner has been <strong>approved</strong>.'
    ) +
    p(
      'You now have access to white-label prop trading infrastructure, fully branded under your firm name. Your next steps:'
    ) +
    li([
      'Log in to your Partner Admin panel',
      'Customise your brand colours and logo',
      'Share your firm link with traders',
    ]) +
    tbl(
      dr('Your Firm', '{{FIRM_NAME}}'),
      dr('Subdomain', '{{SLUG}}.ft9ja.com'),
      dr('License Type', 'Monthly — &#8358;95,000')
    ) +
    btn('#16A34A', 'Access Partner Admin &rarr;') +
    note('Questions? Contact your partner success manager at partners@ft9ja.com')
);

const P02 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('Your Firm is Now Live &#127881;') +
    p(
      'Hi {{OWNER_NAME}}, great news — <strong>{{FIRM_NAME}}</strong> is live and ready to accept traders.'
    ) +
    p(
      'Your branded landing page is published and accessible to anyone with the link. Traders can purchase evaluations and track their progress immediately.'
    ) +
    tbl(
      dr('Live URL', '{{SLUG}}.ft9ja.com'),
      dr('Admin Panel', '{{SLUG}}.ft9ja.com/admin'),
      dr('Status', '&#9989; Active')
    ) +
    p('We recommend sharing your firm link on social media to attract your first traders.') +
    btn('#16A34A', 'View Your Live Page &rarr;') +
    note('Your firm page is indexed publicly. Keep branding updated to maximise conversions.')
);

const P03 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('Monthly License Invoice') +
    p(
      'Hi {{OWNER_NAME}}, your monthly FT9ja Partner license fee is due. Please complete payment to keep your firm active.'
    ) +
    tbl(
      dr('Invoice #', 'INV-{{INVOICE_ID}}'),
      dr('Firm', '{{FIRM_NAME}}'),
      dr('Period', '{{MONTH}} {{YEAR}}'),
      dr('Amount Due', '&#8358;95,000'),
      dr('Due Date', '{{DUE_DATE}}')
    ) +
    p(
      'Transfer to: <strong>FT9ja Trading Ltd</strong>, First Bank — <strong>3012345678</strong>. Use your firm slug as the payment reference.'
    ) +
    btn('#16A34A', 'Confirm Payment &rarr;') +
    note('Failure to pay by the due date may result in temporary suspension of your firm page.')
);

const P04 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('Payment Received — Thank You') +
    p(
      'Hi {{OWNER_NAME}}, we have confirmed receipt of your monthly license payment for <strong>{{FIRM_NAME}}</strong>.'
    ) +
    tbl(
      dr('Payment Ref', '{{REF}}'),
      dr('Amount', '&#8358;95,000'),
      dr('Period', '{{MONTH}} {{YEAR}}'),
      dr('Next Due', '{{NEXT_DUE_DATE}}'),
      dr('Status', '&#9989; Paid')
    ) +
    p('Your firm remains fully active. Thank you for your continued partnership with FT9ja.') +
    btn('#16A34A', 'View Partner Dashboard &rarr;') +
    note(
      'Keep this email as your payment receipt. Contact billing@ft9ja.com for any discrepancies.'
    )
);

const P05 = wrap(
  '#DC2626',
  'FT9ja Partners',
  h('&#9888;&#65039; License Payment Overdue') +
    p(
      'Hi {{OWNER_NAME}}, your monthly license payment for <strong>{{FIRM_NAME}}</strong> is now <strong>{{DAYS_OVERDUE}} days overdue</strong>.'
    ) +
    p(
      'Your firm page remains active for now, but will be <strong>suspended within 48 hours</strong> if payment is not received.'
    ) +
    tbl(
      dr('Amount Due', '&#8358;95,000'),
      dr('Original Due Date', '{{DUE_DATE}}'),
      dr('Suspension Date', '{{SUSPEND_DATE}}')
    ) +
    p(
      'Transfer to <strong>FT9ja Trading Ltd, First Bank — 3012345678</strong> using your firm slug as reference, then confirm via admin.'
    ) +
    btn('#DC2626', 'Confirm Payment &rarr;') +
    note(
      'To avoid disruption to your traders, please act immediately. Contact billing@ft9ja.com with any issues.'
    )
);

const P06 = wrap(
  '#111827',
  'FT9ja Partners',
  h('Account Suspension Notice') +
    p(
      'Hi {{OWNER_NAME}}, the firm <strong>{{FIRM_NAME}}</strong> has been temporarily suspended due to an unpaid license fee.'
    ) +
    p(
      'Your firm page is currently offline. Traders cannot access your landing page or purchase evaluations.'
    ) +
    tbl(
      dr('Firm', '{{FIRM_NAME}}'),
      dr('Suspended On', '{{SUSPEND_DATE}}'),
      dr('Amount Outstanding', '&#8358;95,000'),
      dr('Reinstatement', 'Within 2 hours of payment')
    ) +
    p('To restore your firm immediately, complete payment and confirm via your admin panel.') +
    btn('#16A34A', 'Pay &amp; Reinstate &rarr;') +
    note('Contact partners@ft9ja.com if you believe this suspension was made in error.')
);

const P07 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('Monthly Performance Report &mdash; {{MONTH}} {{YEAR}}') +
    p(
      'Hi {{OWNER_NAME}}, here is a summary of <strong>{{FIRM_NAME}}</strong> performance this month.'
    ) +
    tbl(
      dr('New Traders', '{{NEW_TRADERS}}'),
      dr('Total Traders', '{{TOTAL_TRADERS}}'),
      dr('Evaluations Sold', '{{EVALS_SOLD}}'),
      dr('Gross Revenue', '&#8358;{{GROSS_REVENUE}}'),
      dr('License Cost', '&#8358;95,000'),
      dr('Net Earnings', '&#8358;{{NET_EARNINGS}}')
    ) +
    p(
      'Firms with 10+ traders per month earn significantly more. Check our partner growth playbook for proven acquisition strategies.'
    ) +
    btn('#16A34A', 'View Full Report &rarr;') +
    note('Revenue figures are indicative. Formal statements are available in your admin panel.')
);

const P08 = wrap(
  '#16A34A',
  'FT9ja Partners',
  h('&#127881; Milestone: {{MILESTONE}} Traders!') +
    p(
      'Hi {{OWNER_NAME}}, congratulations — <strong>{{FIRM_NAME}}</strong> just hit <strong>{{MILESTONE}} registered traders</strong>. That is a huge achievement!'
    ) +
    p(
      'At this scale, your estimated monthly net earnings are <strong>&#8358;{{ESTIMATED_EARNINGS}}</strong>, based on your current evaluation mix.'
    ) +
    tbl(
      dr('Total Traders', '{{TOTAL_TRADERS}}'),
      dr('Active Evaluations', '{{ACTIVE_EVALS}}'),
      dr('Revenue Run Rate', '&#8358;{{REVENUE_RATE}}/mo')
    ) +
    p(
      'You are building something real. Keep your firm page updated and consider boosting marketing to sustain the growth.'
    ) +
    btn('#16A34A', 'View Dashboard &rarr;') +
    note('Share your success story at partners@ft9ja.com — we feature top partners every month.')
);

const P09 = wrap(
  '#2563EB',
  'FT9ja Partners',
  h('New Platform Features Now Available') +
    p(
      'Hi {{OWNER_NAME}}, we have just shipped new features to FT9ja — available to all partners immediately with no action required.'
    ) +
    li([
      '<strong>KYC Verification Flow</strong> — Traders submit identity documents directly from their dashboard',
      '<strong>Fee Markup Control</strong> — Set a custom markup on evaluation prices from your Settings tab',
      '<strong>Password Authentication</strong> — Traders log in securely with email + password',
    ]) +
    p(
      'All changes are live on your firm page right now. Log in to explore your updated admin panel.'
    ) +
    btn('#2563EB', 'Explore New Features &rarr;') +
    note('Feature requests? Email product@ft9ja.com — partner feedback shapes our roadmap.')
);

const P10 = wrap(
  '#111827',
  'FT9ja Partners',
  h('Important Compliance Notice') +
    p(
      'Hi {{OWNER_NAME}}, please review the following compliance update affecting all FT9ja Partners, effective <strong>{{EFFECTIVE_DATE}}</strong>.'
    ) +
    li([
      'Traders purchasing evaluations above &#8358;200,000 must complete KYC before activation',
      'Partners must not guarantee profits or misrepresent evaluation pass rates in marketing',
      'Funded account payout claims require FT9ja written approval before publishing',
    ]) +
    p(
      'Non-compliance may result in partnership suspension. Please review the full compliance guide below.'
    ) +
    btn('#111827', 'Read Compliance Guide &rarr;') +
    note(
      'Questions about this notice? Email legal@ft9ja.com. This notice was sent to all active partners.'
    )
);

// ── Partner → Trader ───────────────────────────────────────────────────────────

const T01 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('Welcome to {{FIRM_NAME}} &#128075;') +
    p(
      'Hi {{TRADER_NAME}}, your trader account with <strong>{{FIRM_NAME}}</strong> has been created successfully. We are excited to have you on board.'
    ) +
    p(
      "{{FIRM_NAME}} is powered by FT9ja infrastructure — one of Nigeria's leading prop trading platforms."
    ) +
    li([
      'Browse evaluation options on our firm page',
      'Purchase an evaluation to get started',
      'Track your progress from your dashboard',
    ]) +
    btn('{{BRAND_COLOR}}', 'Access Dashboard &rarr;') +
    note(
      'This account was created at {{FIRM_NAME}} ({{SLUG}}.ft9ja.com). If this was not you, please ignore this email.'
    )
);

const T02 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('Evaluation Purchase &mdash; Payment Pending') +
    p(
      'Hi {{TRADER_NAME}}, your evaluation order has been placed. Please complete payment to activate your account.'
    ) +
    tbl(
      dr('Evaluation', '{{EVAL_TYPE}}'),
      dr('Account Size', '{{ACCOUNT_SIZE}}'),
      dr('Amount Due', '{{AMOUNT}}'),
      dr('Reference', '{{TRADER_EMAIL}}')
    ) +
    warn(
      '#92400E',
      '#FFFBEB',
      '#FDE68A',
      '<strong>Payment Details:</strong><br>Bank: First Bank of Nigeria<br>Account Name: FT9ja Trading Ltd<br>Account: <strong>3012345678</strong><br>Reference: <strong>{{TRADER_EMAIL}}</strong>'
    ) +
    p('Your evaluation activates within <strong>2 hours</strong> of confirmed payment.') +
    btn('{{BRAND_COLOR}}', 'View Dashboard &rarr;') +
    note('Already paid? Contact {{OWNER_EMAIL}} with your receipt and we will verify promptly.')
);

const T03 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('Your Evaluation is Now Active &#9989;') +
    p(
      'Hi {{TRADER_NAME}}, great news — your payment has been confirmed and your evaluation is <strong>live</strong>.'
    ) +
    tbl(
      dr('Evaluation', '{{EVAL_TYPE}}'),
      dr('Account Size', '{{ACCOUNT_SIZE}}'),
      dr('Profit Target', '{{PROFIT_TARGET}}%'),
      dr('Max Drawdown', '{{MAX_DRAWDOWN}}%'),
      dr('Min Trading Days', '{{REQUIRED_DAYS}} days'),
      dr('Evaluation ID', '{{EVAL_ID}}')
    ) +
    p(
      'Log in to your dashboard to track profit, drawdown, and trading days in real time. Trade smart and stay within the rules.'
    ) +
    btn('{{BRAND_COLOR}}', 'Track My Progress &rarr;') +
    note('Review the full rules at {{SLUG}}.ft9ja.com/legal before you start trading.')
);

const T04 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('Your Weekly Progress Update &#128202;') +
    p(
      'Hi {{TRADER_NAME}}, here is how your evaluation is tracking as of <strong>{{DATE}}</strong>.'
    ) +
    tbl(
      dr('Current Profit', '{{CURRENT_PROFIT}}%'),
      dr('Profit Target', '{{PROFIT_TARGET}}%'),
      dr('Drawdown Used', '{{CURRENT_DRAWDOWN}}% / {{MAX_DRAWDOWN}}%'),
      dr('Trading Days', '{{TRADING_DAYS}} / {{REQUIRED_DAYS}}'),
      dr('Status', '{{STATUS}}')
    ) +
    p(
      'You are <strong>{{PROFIT_REMAINING}}%</strong> away from the profit target and have <strong>{{DAYS_REMAINING}} trading days</strong> to complete the minimum. Keep pushing!'
    ) +
    btn('{{BRAND_COLOR}}', 'View Dashboard &rarr;') +
    note(
      'This is an automated weekly summary. Trade data updates every 15 minutes on your dashboard.'
    )
);

const T05 = wrap(
  '#DC2626',
  '{{FIRM_NAME}}',
  h('&#9888;&#65039; Drawdown Alert &mdash; Act Now') +
    p(
      'Hi {{TRADER_NAME}}, your evaluation has reached <strong>{{CURRENT_DRAWDOWN}}%</strong> drawdown, approaching the <strong>{{MAX_DRAWDOWN}}% maximum limit</strong>.'
    ) +
    tbl(
      dr('Current Drawdown', '{{CURRENT_DRAWDOWN}}%'),
      dr('Maximum Allowed', '{{MAX_DRAWDOWN}}%'),
      dr('Remaining Buffer', '{{BUFFER}}%'),
      dr('Evaluation ID', '{{EVAL_ID}}')
    ) +
    warn(
      '#991B1B',
      '#FEF2F2',
      '#FECACA',
      '<strong>Critical:</strong> If drawdown reaches {{MAX_DRAWDOWN}}%, your evaluation fails automatically. Reduce position sizes or pause trading immediately.'
    ) +
    btn('#DC2626', 'View Dashboard &rarr;') +
    note('Drawdown is measured from your equity peak, including open positions.')
);

const T06 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('&#127919; Profit Target Reached!') +
    p(
      'Hi {{TRADER_NAME}}, outstanding work — you have hit the <strong>{{PROFIT_TARGET}}% profit target</strong>. You are one step closer to a funded account!'
    ) +
    tbl(
      dr('Profit Achieved', '{{CURRENT_PROFIT}}%'),
      dr('Target', '{{PROFIT_TARGET}}%'),
      dr('Trading Days Done', '{{TRADING_DAYS}} / {{REQUIRED_DAYS}}'),
      dr('Drawdown Used', '{{CURRENT_DRAWDOWN}}% / {{MAX_DRAWDOWN}}%')
    ) +
    p(
      'To pass the evaluation, you still need to complete the minimum <strong>{{REQUIRED_DAYS}} trading days</strong>. Continue trading within the rules until this requirement is met.'
    ) +
    btn('{{BRAND_COLOR}}', 'View Full Dashboard &rarr;') +
    note(
      'Do not reduce activity until all conditions are satisfied — trading day requirements are strictly enforced.'
    )
);

const T07 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('&#127942; Congratulations &mdash; You Passed!') +
    p(
      'Hi {{TRADER_NAME}}, incredible achievement! You have successfully passed the <strong>{{FIRM_NAME}} Evaluation</strong>. Your funded account is on its way.'
    ) +
    tbl(
      dr('Final Profit', '{{CURRENT_PROFIT}}%'),
      dr('Trading Days', '{{TRADING_DAYS}}'),
      dr('Max Drawdown Used', '{{CURRENT_DRAWDOWN}}%'),
      dr('Evaluation ID', '{{EVAL_ID}}'),
      dr('Account Size', '{{ACCOUNT_SIZE}}')
    ) +
    p(
      'A member of our team will contact you within <strong>1&ndash;3 business days</strong> to set up your live funded account. Please complete KYC if not done yet.'
    ) +
    btn('{{BRAND_COLOR}}', 'Complete KYC &rarr;') +
    note(
      'Profit split: up to 90% of net profits. Payouts processed within 7 business days of request.'
    )
);

const T08 = wrap(
  '#111827',
  '{{FIRM_NAME}}',
  h('Evaluation Ended') +
    p(
      'Hi {{TRADER_NAME}}, your evaluation with <strong>{{FIRM_NAME}}</strong> has ended. A rule condition was breached during the evaluation period.'
    ) +
    tbl(
      dr('Evaluation ID', '{{EVAL_ID}}'),
      dr('Reason', '{{FAIL_REASON}}'),
      dr('Final Profit', '{{CURRENT_PROFIT}}%'),
      dr('Drawdown Reached', '{{CURRENT_DRAWDOWN}}%'),
      dr('Ended On', '{{END_DATE}}')
    ) +
    p(
      'Do not be discouraged — many successful funded traders failed their first attempt. Review what went wrong, adjust your strategy, and try again.'
    ) +
    btn('#111827', 'Try Again &rarr;') +
    note(
      'A new evaluation starts completely fresh. Contact {{OWNER_EMAIL}} with any questions about the outcome.'
    )
);

const T09 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('Complete Your KYC Verification') +
    p(
      'Hi {{TRADER_NAME}}, a reminder to complete your <strong>KYC (Know Your Customer)</strong> verification. This is required before we can process any payouts on your funded account.'
    ) +
    li([
      "Government-issued ID — NIN, Passport, Driver's License, or Voter's Card",
      'Proof of residential address',
      'Optional: selfie holding your ID document',
    ]) +
    p(
      'KYC verification typically takes <strong>24&ndash;48 hours</strong> to review. Submit early to avoid delays when your funded account is ready.'
    ) +
    btn('{{BRAND_COLOR}}', 'Submit KYC Documents &rarr;') +
    note(
      'Your documents are handled securely and used only for identity verification in compliance with Nigerian financial regulations.'
    )
);

const T10 = wrap(
  '{{BRAND_COLOR}}',
  '{{FIRM_NAME}}',
  h('KYC Approved &mdash; Payouts Enabled &#9989;') +
    p(
      'Hi {{TRADER_NAME}}, your identity has been successfully verified. Your account is now fully enabled for <strong>funded account payouts</strong>.'
    ) +
    tbl(
      dr('KYC Status', '&#9989; Approved'),
      dr('Verified On', '{{VERIFIED_DATE}}'),
      dr('Payout Method', 'Bank Transfer'),
      dr('Processing Time', '7 Business Days')
    ) +
    p(
      'Once you pass your evaluation and receive a funded account, you can request withdrawals directly from your trader dashboard.'
    ) +
    btn('{{BRAND_COLOR}}', 'View My Dashboard &rarr;') +
    note(
      'Verification is valid for 12 months. You will be notified if re-verification is required. Contact {{OWNER_EMAIL}} with any questions.'
    )
);

// ── Registry ───────────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // FT9ja → Partners
  {
    id: 'p-01',
    category: 'ft9ja-to-partner',
    filename: 'p-01-welcome.html',
    subject: 'Welcome to the FT9ja Partners Program',
    description: 'Sent when a partner application is approved',
    html: P01,
  },
  {
    id: 'p-02',
    category: 'ft9ja-to-partner',
    filename: 'p-02-firm-live.html',
    subject: 'Your Firm is Now Live 🎉',
    description: 'Sent when a partner firm goes active for the first time',
    html: P02,
  },
  {
    id: 'p-03',
    category: 'ft9ja-to-partner',
    filename: 'p-03-invoice.html',
    subject: 'Monthly License Invoice — {{FIRM_NAME}}',
    description: 'Sent on the 1st of each month as the license invoice',
    html: P03,
  },
  {
    id: 'p-04',
    category: 'ft9ja-to-partner',
    filename: 'p-04-payment-confirmed.html',
    subject: 'Payment Received — Thank You',
    description: 'Sent when a license payment is confirmed',
    html: P04,
  },
  {
    id: 'p-05',
    category: 'ft9ja-to-partner',
    filename: 'p-05-payment-overdue.html',
    subject: '⚠️ License Payment Overdue — Action Required',
    description: 'Sent when payment is 7+ days late',
    html: P05,
  },
  {
    id: 'p-06',
    category: 'ft9ja-to-partner',
    filename: 'p-06-suspension.html',
    subject: 'Account Suspended — {{FIRM_NAME}}',
    description: 'Sent upon firm account suspension due to non-payment',
    html: P06,
  },
  {
    id: 'p-07',
    category: 'ft9ja-to-partner',
    filename: 'p-07-monthly-report.html',
    subject: 'Monthly Performance Report — {{MONTH}} {{YEAR}}',
    description: 'Sent on the last day of each month with firm stats',
    html: P07,
  },
  {
    id: 'p-08',
    category: 'ft9ja-to-partner',
    filename: 'p-08-trader-milestone.html',
    subject: '🎉 Milestone: {{MILESTONE}} Traders Reached!',
    description: 'Sent at 10, 25, 50 and 100 trader milestones',
    html: P08,
  },
  {
    id: 'p-09',
    category: 'ft9ja-to-partner',
    filename: 'p-09-feature-update.html',
    subject: 'New Features Now Live on FT9ja',
    description: 'Sent when significant platform features are released',
    html: P09,
  },
  {
    id: 'p-10',
    category: 'ft9ja-to-partner',
    filename: 'p-10-compliance.html',
    subject: 'Important Compliance Notice — Action Required',
    description: 'Sent for policy or legal updates affecting all partners',
    html: P10,
  },
  // Partner → Traders
  {
    id: 't-01',
    category: 'partner-to-trader',
    filename: 't-01-welcome.html',
    subject: 'Welcome to {{FIRM_NAME}} 👋',
    description: 'Sent when a trader account is created',
    html: T01,
  },
  {
    id: 't-02',
    category: 'partner-to-trader',
    filename: 't-02-eval-pending.html',
    subject: 'Evaluation Purchase — Payment Pending',
    description: 'Sent immediately after an evaluation order is placed',
    html: T02,
  },
  {
    id: 't-03',
    category: 'partner-to-trader',
    filename: 't-03-eval-activated.html',
    subject: 'Your Evaluation is Now Active ✅',
    description: 'Sent when a partner activates a trader evaluation',
    html: T03,
  },
  {
    id: 't-04',
    category: 'partner-to-trader',
    filename: 't-04-weekly-progress.html',
    subject: 'Your Weekly Evaluation Progress Update',
    description: 'Sent every Monday for all active evaluations',
    html: T04,
  },
  {
    id: 't-05',
    category: 'partner-to-trader',
    filename: 't-05-drawdown-warning.html',
    subject: '⚠️ Drawdown Alert — Immediate Action Required',
    description: 'Sent when drawdown reaches 80% of the maximum',
    html: T05,
  },
  {
    id: 't-06',
    category: 'partner-to-trader',
    filename: 't-06-profit-target.html',
    subject: '🎯 Profit Target Reached — Keep Going!',
    description: 'Sent when a trader hits profit target before day minimum',
    html: T06,
  },
  {
    id: 't-07',
    category: 'partner-to-trader',
    filename: 't-07-eval-passed.html',
    subject: '🏆 Congratulations — You Passed!',
    description: 'Sent when all evaluation conditions are met',
    html: T07,
  },
  {
    id: 't-08',
    category: 'partner-to-trader',
    filename: 't-08-eval-failed.html',
    subject: 'Evaluation Ended — Keep Going',
    description: 'Sent when an evaluation fails due to a rule breach',
    html: T08,
  },
  {
    id: 't-09',
    category: 'partner-to-trader',
    filename: 't-09-kyc-reminder.html',
    subject: 'Action Required: Complete Your KYC Verification',
    description: 'Sent 24h after account creation if KYC not started',
    html: T09,
  },
  {
    id: 't-10',
    category: 'partner-to-trader',
    filename: 't-10-kyc-approved.html',
    subject: "KYC Approved — You're Ready for Payouts ✅",
    description: 'Sent when a partner approves a trader KYC submission',
    html: T10,
  },
];
