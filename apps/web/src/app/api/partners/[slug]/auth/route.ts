import sql from '@/app/api/utils/sql';
import argon2 from 'argon2';
import {
  createSessionToken,
  parseSessionFromRequest,
  getSessionCookieName,
  type TraderSession,
} from '@/app/api/utils/session';

const SEVEN_DAYS = 7 * 24 * 3600;

// GET — verify current session
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session) return Response.json({ session: null }, { status: 401 });

    const rows = await sql`
      SELECT id, name, email, status, kyc_status
      FROM traders WHERE id = ${session.traderId} AND partner_id = ${session.partnerId} LIMIT 1
    `;
    if (rows.length === 0) return Response.json({ session: null }, { status: 401 });

    return Response.json({ session, trader: rows[0] });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Session check failed' }, { status: 500 });
  }
}

// POST — login with email + password
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const partners = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partners.length === 0)
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    const partnerId = partners[0].id;

    const traders = await sql`
      SELECT id, name, email, status, password_hash
      FROM traders WHERE email = ${email} AND partner_id = ${partnerId} LIMIT 1
    `;
    if (traders.length === 0) return Response.json({ error: 'no_account' }, { status: 401 });

    const trader = traders[0];

    if (!trader.password_hash) {
      return Response.json({ error: 'no_password', traderId: trader.id }, { status: 401 });
    }

    const valid = await argon2.verify(trader.password_hash, password);
    if (!valid) return Response.json({ error: 'invalid_password' }, { status: 401 });

    const session: TraderSession = {
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    };
    const token = createSessionToken(session);
    const cookieName = getSessionCookieName(slug);

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set(
      'Set-Cookie',
      `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SEVEN_DAYS}`
    );
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}

// PATCH — set password for existing account with no password yet
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { email, traderId, password } = body;

    if (!password || password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const partners = await sql`SELECT id FROM partners WHERE slug = ${slug} LIMIT 1`;
    if (partners.length === 0)
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    const partnerId = partners[0].id;

    const traders = await sql`
      SELECT id, name, email FROM traders
      WHERE id = ${traderId} AND email = ${email} AND partner_id = ${partnerId}
        AND password_hash IS NULL
      LIMIT 1
    `;
    if (traders.length === 0) {
      return Response.json({ error: 'Invalid request or password already set' }, { status: 400 });
    }

    const trader = traders[0];
    const hash = await argon2.hash(password);
    await sql`UPDATE traders SET password_hash = ${hash} WHERE id = ${trader.id}`;

    const session: TraderSession = {
      traderId: trader.id,
      partnerId,
      slug,
      exp: Date.now() + SEVEN_DAYS * 1000,
    };
    const token = createSessionToken(session);
    const cookieName = getSessionCookieName(slug);

    const res = Response.json({
      success: true,
      trader: { id: trader.id, name: trader.name, email: trader.email },
    });
    res.headers.set(
      'Set-Cookie',
      `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SEVEN_DAYS}`
    );
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to set password' }, { status: 500 });
  }
}

// DELETE — logout
export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieName = getSessionCookieName(slug);
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  return res;
}
