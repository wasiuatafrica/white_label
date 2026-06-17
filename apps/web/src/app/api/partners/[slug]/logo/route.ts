import { getPartnerBySlug } from '@/db/queries/partners';
import {
  fetchPartnerLogoFromS3,
  getS3EnvConfig,
  parsePartnerLogoS3Key,
} from '@/lib/partner-logo';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const config = getS3EnvConfig();
    if (!config) {
      return Response.json({ error: 'Logo storage is not configured' }, { status: 500 });
    }

    const keyParam = new URL(request.url).searchParams.get('key');
    let key: string | null = null;

    if (keyParam) {
      if (!keyParam.startsWith(`uploads/logos/${slug}/`)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      key = keyParam;
    } else {
      const partner = await getPartnerBySlug(slug);
      if (!partner?.logo_url) {
        return Response.json({ error: 'Logo not found' }, { status: 404 });
      }

      if (partner.logo_url.startsWith(`/api/partners/${slug}/logo`)) {
        return Response.json({ error: 'Logo not found' }, { status: 404 });
      }

      key = parsePartnerLogoS3Key(slug, partner.logo_url, config);
      if (!key) {
        return Response.redirect(partner.logo_url, 302);
      }
    }

    const s3Res = await fetchPartnerLogoFromS3(key, config);
    if (!s3Res.ok) {
      console.error('Failed to fetch partner logo from S3', s3Res.status, await s3Res.text());
      return Response.json({ error: 'Failed to load logo' }, { status: 502 });
    }

    return new Response(s3Res.body, {
      headers: {
        'Content-Type': s3Res.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to load logo' }, { status: 500 });
  }
}
