import { slugExists } from '@/db/queries/partners';
import { isReservedPartnerSlug, isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export const runtime = 'nodejs';

type SlugCheckReason = 'empty' | 'invalid' | 'reserved' | 'taken';

export async function GET(request: Request) {
  try {
    const slug = normalizePartnerSlug(
      new URL(request.url).searchParams.get('slug') || ''
    );

    if (!slug) {
      return Response.json({ available: false, reason: 'empty' satisfies SlugCheckReason });
    }

    if (!isValidPartnerSlug(slug)) {
      const reason: SlugCheckReason = isReservedPartnerSlug(slug) ? 'reserved' : 'invalid';
      return Response.json({ available: false, reason });
    }

    const taken = await slugExists(slug);
    if (taken) {
      return Response.json({ available: false, reason: 'taken' satisfies SlugCheckReason });
    }

    return Response.json({ available: true, reason: null });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to check subdomain' }, { status: 500 });
  }
}
