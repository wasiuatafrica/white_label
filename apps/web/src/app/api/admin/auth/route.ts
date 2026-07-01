import argon2 from 'argon2';
import {
  getAdminUserByEmail,
  getAdminUserById,
  updateAdminUserPassword,
} from '@/db/queries/admin-users';
import {
  clearAdminPendingCookie,
  clearAdminSessionCookie,
  createAdminPendingCookie,
  createAdminPendingToken,
  createAdminSessionCookie,
  createAdminSessionToken,
  parseAdminSessionFromRequest,
} from '@/lib/admin-session';

function cookieOptions() {
  return { secure: process.env.NODE_ENV === 'production' };
}

export async function GET(request: Request) {
  try {
    const session = parseAdminSessionFromRequest(request);
    if (!session) {
      return Response.json({ session: null }, { status: 401 });
    }

    const user = await getAdminUserById(session.adminUserId);
    if (!user || !user.isActive || !user.totpEnabled) {
      return Response.json({ session: null }, { status: 401 });
    }

    return Response.json({
      session: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Session check failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await getAdminUserByEmail(email);
    if (!user || !user.isActive) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const purpose = user.totpEnabled ? 'totp_verify' : 'totp_setup';
    const pendingToken = createAdminPendingToken(user.id, purpose);
    const headers = new Headers();
    headers.append('Set-Cookie', createAdminPendingCookie(pendingToken, cookieOptions()));

    return Response.json(
      {
        success: true,
        requiresTotp: user.totpEnabled,
        requiresTotpSetup: !user.totpEnabled,
        admin: { id: user.id, email: user.email, name: user.name },
      },
      { headers }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const headers = new Headers();
  headers.append('Set-Cookie', clearAdminSessionCookie(cookieOptions()));
  headers.append('Set-Cookie', clearAdminPendingCookie(cookieOptions()));
  return Response.json({ success: true }, { headers });
}

export async function PATCH(request: Request) {
  try {
    const session = parseAdminSessionFromRequest(request);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.current_password === 'string' ? body.current_password : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';

    if (!currentPassword || !newPassword || newPassword.length < 12) {
      return Response.json(
        { error: 'current_password and new_password (min 12 chars) are required' },
        { status: 400 }
      );
    }

    const user = await getAdminUserById(session.adminUserId);
    if (!user || !user.isActive) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    await updateAdminUserPassword(user.id, await argon2.hash(newPassword));

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
