import { ownerEmailExists } from '@/db/queries/partners';
import { emailSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

type EmailCheckReason = 'empty' | 'invalid' | 'taken';

export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('email') || '';
    if (!raw.trim()) {
      return Response.json({ available: false, reason: 'empty' satisfies EmailCheckReason });
    }

    const parsed = emailSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ available: false, reason: 'invalid' satisfies EmailCheckReason });
    }

    if (await ownerEmailExists(parsed.data)) {
      return Response.json({ available: false, reason: 'taken' satisfies EmailCheckReason });
    }

    return Response.json({ available: true, reason: null });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to check email' }, { status: 500 });
  }
}
