import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

neonConfig.webSocketConstructor = ws;

const KYC_RANK = {
  not_started: 0,
  rejected: 1,
  submitted: 2,
  approved: 3,
};

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usesPglite(databaseUrl) {
  const trimmed = databaseUrl?.trim() ?? '';
  const lower = trimmed.toLowerCase();
  return lower === 'pglite' || lower.startsWith('pglite:') || trimmed === '';
}

function pgliteDataDir(databaseUrl) {
  const trimmed = databaseUrl?.trim() ?? '';
  if (trimmed.toLowerCase().startsWith('pglite:')) {
    const rest = trimmed.slice('pglite:'.length).trim();
    if (rest) {
      return path.isAbsolute(rest) ? rest : path.resolve(WEB_ROOT, rest);
    }
  }
  return path.resolve(WEB_ROOT, '.pglite');
}

async function openClient(databaseUrl) {
  if (usesPglite(databaseUrl)) {
    const { PGlite } = await import('@electric-sql/pglite');
    const pglite = new PGlite(pgliteDataDir(databaseUrl));
    await pglite.waitReady;
    return {
      query: (text, params) => pglite.query(text, params),
      release() {},
      async end() {
        await pglite.close();
      },
    };
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  return {
    query: (text, params) => client.query(text, params),
    release() {
      client.release();
    },
    async end() {
      await pool.end();
    },
  };
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  return { apply, dryRun: !apply };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function pickMergedProfile(rows) {
  const keeper = rows[0];
  const withPassword = rows.find((row) => row.password_hash);
  const bestKyc = [...rows].sort(
    (a, b) => (KYC_RANK[b.kyc_status] ?? 0) - (KYC_RANK[a.kyc_status] ?? 0)
  )[0];
  const status = rows.some((row) => row.status === 'active') ? 'active' : keeper.status;

  return {
    email: normalizeEmail(keeper.email),
    status,
    password_hash: keeper.password_hash || withPassword?.password_hash || null,
    kyc_status: bestKyc.kyc_status,
    kyc_full_name: bestKyc.kyc_full_name,
    kyc_id_type: bestKyc.kyc_id_type,
    kyc_id_number: bestKyc.kyc_id_number,
    kyc_id_url: bestKyc.kyc_id_url,
    kyc_address: bestKyc.kyc_address,
    kyc_selfie_url: bestKyc.kyc_selfie_url,
    kyc_submitted_at: bestKyc.kyc_submitted_at,
    reset_token: null,
    reset_token_expires: null,
  };
}

async function loadDuplicateGroups(client) {
  const { rows } = await client.query(`
    SELECT
      t.id,
      t.partner_id,
      p.slug AS partner_slug,
      p.firm_name AS partner_name,
      t.name,
      t.email,
      t.status,
      t.password_hash,
      t.kyc_status,
      t.kyc_full_name,
      t.kyc_id_type,
      t.kyc_id_number,
      t.kyc_id_url,
      t.kyc_address,
      t.kyc_selfie_url,
      t.kyc_submitted_at,
      t.created_at,
      (
        SELECT count(*)::int FROM evaluations e WHERE e.trader_id = t.id
      ) AS evaluation_count,
      (
        SELECT count(*)::int FROM trade_accounts a WHERE a.trader_id = t.id
      ) AS trade_account_count,
      (
        SELECT count(*)::int FROM trader_requests r WHERE r.trader_id = t.id
      ) AS trader_request_count,
      (
        SELECT count(*)::int FROM aso_requests a WHERE a.trader_id = t.id
      ) AS aso_request_count
    FROM traders t
    JOIN partners p ON p.id = t.partner_id
    WHERE lower(trim(t.email)) IN (
      SELECT lower(trim(email))
      FROM traders
      GROUP BY partner_id, lower(trim(email))
      HAVING count(*) > 1
    )
    ORDER BY lower(trim(t.email)), t.partner_id, t.created_at ASC, t.id ASC
  `);

  const groups = new Map();
  for (const row of rows) {
    const key = `${row.partner_id}:${normalizeEmail(row.email)}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

async function loadCrossPartnerDupes(client) {
  const { rows } = await client.query(`
    SELECT
      lower(trim(email)) AS email,
      count(*)::int AS trader_count,
      count(DISTINCT partner_id)::int AS partner_count,
      array_agg(id ORDER BY created_at, id) AS trader_ids
    FROM traders
    GROUP BY lower(trim(email))
    HAVING count(DISTINCT partner_id) > 1
    ORDER BY 1
  `);
  return rows;
}

async function mergeGroup(client, group) {
  const keeper = group[0];
  const extras = group.slice(1);
  const profile = pickMergedProfile(group);
  const extraIds = extras.map((row) => row.id);

  await client.query(
    `
      UPDATE evaluations SET trader_id = $1 WHERE trader_id = ANY($2::int[])
    `,
    [keeper.id, extraIds]
  );
  await client.query(
    `
      UPDATE trade_accounts SET trader_id = $1 WHERE trader_id = ANY($2::int[])
    `,
    [keeper.id, extraIds]
  );
  await client.query(
    `
      UPDATE trader_requests SET trader_id = $1 WHERE trader_id = ANY($2::int[])
    `,
    [keeper.id, extraIds]
  );
  await client.query(
    `
      UPDATE aso_requests SET trader_id = $1 WHERE trader_id = ANY($2::int[])
    `,
    [keeper.id, extraIds]
  );
  await client.query(
    `
      UPDATE traders
      SET
        email = $2,
        status = $3,
        password_hash = $4,
        kyc_status = $5,
        kyc_full_name = $6,
        kyc_id_type = $7,
        kyc_id_number = $8,
        kyc_id_url = $9,
        kyc_address = $10,
        kyc_selfie_url = $11,
        kyc_submitted_at = $12,
        reset_token = NULL,
        reset_token_expires = NULL
      WHERE id = $1
    `,
    [
      keeper.id,
      profile.email,
      profile.status,
      profile.password_hash,
      profile.kyc_status,
      profile.kyc_full_name,
      profile.kyc_id_type,
      profile.kyc_id_number,
      profile.kyc_id_url,
      profile.kyc_address,
      profile.kyc_selfie_url,
      profile.kyc_submitted_at,
    ]
  );
  await client.query(`DELETE FROM traders WHERE id = ANY($1::int[])`, [extraIds]);

  return {
    email: profile.email,
    partner: keeper.partner_slug,
    keeperId: keeper.id,
    deletedIds: extraIds,
    moved: {
      evaluations: extras.reduce((sum, row) => sum + row.evaluation_count, 0),
      tradeAccounts: extras.reduce((sum, row) => sum + row.trade_account_count, 0),
      traderRequests: extras.reduce((sum, row) => sum + row.trader_request_count, 0),
      asoRequests: extras.reduce((sum, row) => sum + row.aso_request_count, 0),
    },
  };
}

function printGroup(group) {
  const keeper = group[0];
  const extras = group.slice(1);
  console.log(
    `\n${normalizeEmail(keeper.email)}  ${keeper.partner_name} (${keeper.partner_slug})`
  );
  console.log(
    `  keep #${keeper.id} ${keeper.name}  joined=${keeper.created_at.toISOString?.() ?? keeper.created_at}  evals=${keeper.evaluation_count}  accounts=${keeper.trade_account_count}  kyc=${keeper.kyc_status}`
  );
  for (const extra of extras) {
    console.log(
      `  merge #${extra.id} ${extra.name}  joined=${extra.created_at.toISOString?.() ?? extra.created_at}  evals=${extra.evaluation_count}  accounts=${extra.trade_account_count}  kyc=${extra.kyc_status}`
    );
  }
}

async function main() {
  const { apply, dryRun } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  const client = await openClient(databaseUrl);

  try {
    const groups = await loadDuplicateGroups(client);
    console.log(
      dryRun
        ? `Dry run. ${groups.length} same-partner duplicate email group(s). Re-run with --apply to merge.`
        : `Merging ${groups.length} same-partner duplicate email group(s).`
    );

    if (groups.length === 0) {
      console.log('No same-partner traders share an email.');
    }

    for (const group of groups) {
      printGroup(group);
    }

    const merged = [];
    if (apply && groups.length > 0) {
      await client.query('BEGIN');
      try {
        for (const group of groups) {
          merged.push(await mergeGroup(client, group));
        }
        await client.query(`
          UPDATE partners AS p
          SET total_traders = sub.n, updated_at = NOW()
          FROM (
            SELECT partner_id, count(*)::int AS n
            FROM traders
            GROUP BY partner_id
          ) AS sub
          WHERE p.id = sub.partner_id
        `);
        await client.query(`
          UPDATE traders SET email = lower(trim(email)) WHERE email <> lower(trim(email))
        `);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      console.log('\nMerged:');
      for (const row of merged) {
        console.log(
          `  ${row.email} @ ${row.partner}: kept #${row.keeperId}, deleted ${row.deletedIds.join(', ')} (evals ${row.moved.evaluations}, accounts ${row.moved.tradeAccounts})`
        );
      }
    }

    const crossPartner = await loadCrossPartnerDupes(client);
    if (crossPartner.length > 0) {
      console.log(
        `\n${crossPartner.length} email(s) still exist on more than one partner (not merged):`
      );
      for (const row of crossPartner) {
        console.log(
          `  ${row.email}: ${row.trader_count} traders across ${row.partner_count} partners (ids ${row.trader_ids.join(', ')})`
        );
      }
    }
  } finally {
    client.release();
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
