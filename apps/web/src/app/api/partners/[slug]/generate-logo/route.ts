import { randomUUID } from 'crypto';
import {
  getPartnerPrivateBySlug,
  markPartnerLogoGeneratedIfUnused,
} from '@/db/queries/partners';
import { generateLogoImage } from '@/lib/openai/images';
import { buildLogoPrompt } from '@/lib/openai/logo-prompts';
import { buildS3ObjectUrl, putObjectToS3 } from '@/lib/storage/s3';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { firm_name, brand_color, style } = body;

    const partner = await getPartnerPrivateBySlug(slug);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    if (partner.logo_generated_at) {
      return Response.json(
        { error: 'Logo generation is only available once per partner' },
        { status: 403 }
      );
    }

    if (!firm_name) {
      return Response.json({ error: 'firm_name is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Logo generation is not configured' }, { status: 500 });
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return Response.json({ error: 'Logo storage is not configured' }, { status: 500 });
    }

    const prompt = buildLogoPrompt(firm_name, style, brand_color);
    const buffer = await generateLogoImage(prompt, apiKey);
    const key = `uploads/logos/${slug}/${randomUUID()}.png`;

    await putObjectToS3({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      key,
      contentType: 'image/png',
      body: buffer,
    });

    const logo = buildS3ObjectUrl(bucket, region, key);
    const marked = await markPartnerLogoGeneratedIfUnused(slug);
    if (!marked) {
      return Response.json(
        { error: 'Logo generation is only available once per partner' },
        { status: 403 }
      );
    }

    return Response.json({ logo });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Logo generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
