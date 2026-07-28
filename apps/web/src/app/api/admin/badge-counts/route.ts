import { getAdminBadgeCounts } from '@/db/queries/admin';
import { countPendingAsoRequests } from '@/db/queries/aso-requests';
import { countAbandonedPartnerSignupEvents } from '@/db/queries/partner-signup-events';
import { countPendingPartnerPayoutRequests } from '@/db/queries/partner-payout-requests';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const [core, asoPending, partnerPayoutsPending, partnerSignupsAbandoned] = await Promise.all([
      getAdminBadgeCounts(),
      countPendingAsoRequests(),
      countPendingPartnerPayoutRequests(),
      countAbandonedPartnerSignupEvents(),
    ]);

    return Response.json({
      kycPending: core.kycPending,
      paymentsPending: core.paymentsPending,
      payoutsPending: core.payoutsPending,
      partnerPayoutsPending,
      requestsPending: core.traderRequestsPending + asoPending,
      partnerSignupsAbandoned,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch badge counts' }, { status: 500 });
  }
}
