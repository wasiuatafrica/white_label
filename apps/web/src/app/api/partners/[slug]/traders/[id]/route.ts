import { getTraderPasswordHash, getTraderProfile, updateTraderProfile } from '@/db/queries/traders';
import { parseSessionFromRequest } from '@/app/api/utils/session';
import argon2 from 'argon2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trader = await getTraderProfile(Number(id));
    if (!trader) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(trader);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to fetch trader' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = parseSessionFromRequest(request, slug);
    if (!session || session.traderId !== Number(id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, current_password, new_password } = body;

    const updates: { name?: string; passwordHash?: string } = {};

    if (name?.trim()) {
      updates.name = name.trim();
    }

    if (new_password) {
      if (new_password.length < 8) {
        return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }

      const existing = await getTraderProfile(Number(id));
      if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

      const passwordHash = await getTraderPasswordHash(Number(id));
      if (passwordHash) {
        if (!current_password) {
          return Response.json({ error: 'Current password is required' }, { status: 400 });
        }
        const valid = await argon2.verify(passwordHash, current_password);
        if (!valid) {
          return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
      }

      updates.passwordHash = await argon2.hash(new_password);
    }

    if (!updates.name && !updates.passwordHash) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const result = await updateTraderProfile(Number(id), updates);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
