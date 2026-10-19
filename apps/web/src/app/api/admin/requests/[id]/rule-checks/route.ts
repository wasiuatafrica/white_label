import {
  getLastApprovedPayoutAtByEval,
  getTraderRequestTradeAccount,
} from '@/db/queries/trader-requests';
import { isAdminUnauthorized, requireAdmin } from '@/lib/admin-auth-guard';
import { getTradingRuleChecks } from '@/lib/trading-rules';
import { getTradingTelemetryMetrics } from '@/lib/trading-telemetry';

/** Trading rule status for a trader request, shown to Super Admin before approving. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return Response.json({ error: 'Invalid request id' }, { status: 400 });
    }

    const row = await getTraderRequestTradeAccount(requestId);
    if (!row) return Response.json({ error: 'Request not found' }, { status: 404 });

    const accountNumber = Number(row.accountNumber);
    if (!(accountNumber > 0)) {
      return Response.json({ account_number: null, telemetry: null, rules: null });
    }

    const periodStart = (await getLastApprovedPayoutAtByEval([row.evalId])).get(row.evalId) ?? null;
    const [telemetry, rules] = await Promise.all([
      getTradingTelemetryMetrics(accountNumber),
      getTradingRuleChecks(accountNumber, periodStart),
    ]);

    return Response.json({ account_number: accountNumber, telemetry, rules });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load rule checks' }, { status: 500 });
  }
}
