import { getAdminUserById, setAdminUserTotpSecret, updateAdminUserLastLogin } from '@/db/queries/admin-users';
import {
  clearAdminPendingCookie,
  createAdminSessionCookie,
  createAdminSessionToken,
  parseAdminPendingFromRequest,
} from '@/lib/admin-session';
import { verifyTotpCode } from '@/lib/admin-totp';
import { checkRateLimit, getRequestRateLimitKey } from '@/lib/rate-limit';
import { decryptTotpSecret, isEncryptedTotpSecret } from '@/lib/totp-secret-crypto';

const MAX_TOTP_ATTEMPTS = 5;
const TOTP_WINDOW_MS = 5 * 60 * 1000;

function cookieOptions() {
  return { secure: process.env.NODE_ENV === 'production' };
}

export async function POST(request: Request) {
  try {
    const pending = await parseAdminPendingFromRequest(request);
    if (!pending || pending.purpose !== 'totp_verify') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateKey = `${getRequestRateLimitKey(request, 'admin-totp')}:${pending.adminUserId}`;
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: 'A 6-digit code is required' }, { status: 400 });
    }

    const user = await getAdminUserById(pending.adminUserId);
    if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = decryptTotpSecret(user.totpSecret);
    const valid = await verifyTotpCode(secret, code);
    if (!valid) {
      const headers = new Headers();
      const again = await checkRateLimit(rateKey, MAX_TOTP_ATTEMPTS, TOTP_WINDOW_MS, {
        failClosed: true,
      });
      if (!again.allowed) {
        headers.append('Set-Cookie', clearAdminPendingCookie(cookieOptions()));
      }
      return Response.json({ error: 'Invalid authentication code' }, { status: 401, headers });
    }

    if (!isEncryptedTotpSecret(user.totpSecret)) {
      await setAdminUserTotpSecret(user.id, secret);
    }

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
    return Response.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
