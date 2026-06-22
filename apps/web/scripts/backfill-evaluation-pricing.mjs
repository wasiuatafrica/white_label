import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(databaseUrl);

  const snapshotResult = await sql`
    UPDATE evaluations AS e
    SET
      markup_amount = COALESCE(e.markup_amount, p.fee_markup),
      wholesale_amount = COALESCE(
        e.wholesale_amount,
        CASE WHEN e.eval_type = 'SS' THEN 108750 ELSE 36750 END
      )
    FROM partners AS p
    WHERE p.id = e.partner_id
  `;

  const verifiedResult = await sql`
    UPDATE evaluations
    SET verified_amount = COALESCE(verified_amount, amount)
    WHERE status <> 'pending_payment'
      AND verified_amount IS NULL
  `;

  const earningsResult = await sql`
    UPDATE evaluations
    SET partner_earnings_amount = verified_amount::numeric - wholesale_amount::numeric
    WHERE verified_amount IS NOT NULL
      AND wholesale_amount IS NOT NULL
      AND (
        partner_earnings_amount IS NULL
        OR partner_earnings_amount <> (verified_amount::numeric - wholesale_amount::numeric)
      )
  `;

  const verifiedAtResult = await sql`
    UPDATE evaluations
    SET verified_at = NOW()
    WHERE verified_amount IS NOT NULL
      AND verified_at IS NULL
      AND status <> 'pending_payment'
  `;

  const revenueResult = await sql`
    UPDATE partners AS p
    SET
      total_revenue = sub.total,
      updated_at = NOW()
    FROM (
      SELECT partner_id, COALESCE(SUM(verified_amount), 0) AS total
      FROM evaluations
      WHERE verified_amount IS NOT NULL
      GROUP BY partner_id
    ) AS sub
    WHERE p.id = sub.partner_id
  `;

  const counts = await sql`
    SELECT
      COUNT(*)::int AS evaluations,
      COUNT(*) FILTER (WHERE verified_amount IS NOT NULL)::int AS verified_evaluations,
      COUNT(*) FILTER (WHERE markup_amount IS NOT NULL)::int AS with_markup_snapshot
    FROM evaluations
  `;

  console.log('Evaluation pricing backfill complete.');
  console.log({
    snapshotRows: snapshotResult.length,
    verifiedRows: verifiedResult.length,
    earningsRows: earningsResult.length,
    verifiedAtRows: verifiedAtResult.length,
    partnerRevenueRows: revenueResult.length,
    totals: counts[0],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
