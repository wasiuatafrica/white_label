import { timingSafeEqual } from 'crypto';
import { createAdminSessionCookie } from '@/lib/admin-auth';

function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('SUPER_ADMIN_PASSWORD is not configured');
      return Response.json({ error: 'Admin password is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!passwordsMatch(password, adminPassword)) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie': createAdminSessionCookie(adminPassword, {
            secure: process.env.NODE_ENV === 'production',
          }),
        },
      }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to verify admin password' }, { status: 500 });
  }
}
