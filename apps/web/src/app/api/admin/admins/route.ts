import argon2 from 'argon2';
import {
  countAdminUsers,
  createAdminUser,
  getAdminUserByEmail,
  listAdminUsers,
  MAX_ADMIN_USERS,
} from '@/db/queries/admin-users';
import { isAdminUnauthorized, logAdminAction, requireAdmin } from '@/lib/admin-auth-guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const admins = await listAdminUsers();
    return Response.json({ admins, max: MAX_ADMIN_USERS });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (isAdminUnauthorized(auth)) return auth;

  try {
    const total = await countAdminUsers();
    if (total >= MAX_ADMIN_USERS) {
      return Response.json({ error: `Maximum of ${MAX_ADMIN_USERS} admins allowed` }, { status: 400 });
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !name || password.length < 12) {
      return Response.json(
        { error: 'email, name, and password (min 12 chars) are required' },
        { status: 400 }
      );
    }

    if (await getAdminUserByEmail(email)) {
      return Response.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await argon2.hash(password);
    const admin = await createAdminUser({
      email,
      name,
      passwordHash,
      createdByAdminId: auth.admin.id,
    });

    if (!admin) {
      return Response.json({ error: 'Failed to create admin' }, { status: 500 });
    }

    await logAdminAction({
      adminUserId: auth.admin.id,
      action: 'admin.create',
      resourceType: 'admin_user',
      resourceId: admin.id,
      metadata: { email: admin.email, name: admin.name },
      request,
    });

    return Response.json({ admin }, { status: 201 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error && e.message.includes('unique') ? 'Email already in use' : 'Failed to create admin';
    return Response.json({ error: message }, { status: 400 });
  }
}
