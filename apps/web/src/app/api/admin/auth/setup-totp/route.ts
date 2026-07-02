import {
  enableAdminUserTotp,
  getAdminUserById,
  setAdminUserTotpSecret,
  updateAdminUserLastLogin,
} from '@/db/queries/admin-users';
import {
  clearAdminPendingCookie,
  createAdminSessionCookie,
  createAdminSessionToken,
  parseAdminPendingFromRequest,
} from '@/lib/admin-session';
import { buildTotpUri, createTotpSecret, verifyTotpCode } from '@/lib/admin-totp';

function cookieOptions() {
  return { secure: process.env.NODE_ENV === 'production' };
}

export async function POST(request: Request) {
  try {
    const pending = await parseAdminPendingFromRequest(request);
    if (!pending || pending.purpose !== 'totp_setup') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAdminUserById(pending.adminUserId);
    if (!user || !user.isActive || user.totpEnabled) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action : 'begin';

    if (action === 'begin') {
      const secret = createTotpSecret();
      await setAdminUserTotpSecret(user.id, secret);

      return Response.json({
        otpauthUrl: buildTotpUri(user.email, secret),
        secret,
      });
    }

    if (action !== 'confirm') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
    const freshUser = await getAdminUserById(user.id);
    if (!freshUser?.totpSecret) {
      return Response.json({ error: 'Start authenticator setup first' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: 'A 6-digit code is required' }, { status: 400 });
    }

    const valid = await verifyTotpCode(freshUser.totpSecret, code);
    if (!valid) {
      return Response.json({ error: 'Invalid authentication code' }, { status: 401 });
    }

    await enableAdminUserTotp(user.id);
    await updateAdminUserLastLogin(user.id);

    const token = createAdminSessionToken({
      adminUserId: user.id,
      email: user.email,
      name: user.name,
    });

    const headers = new Headers();
    headers.append('Set-Cookie', createAdminSessionCookie(token, cookieOptions()));
    headers.append('Set-Cookie', clearAdminPendingCookie(cookieOptions()));

    return Response.json(
      {
        success: true,
        admin: { id: user.id, email: user.email, name: user.name },
      },
      { headers }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to set up authenticator' }, { status: 500 });
  }
}
