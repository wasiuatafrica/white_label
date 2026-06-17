import { randomUUID } from 'crypto';
import {
  getPartnerPrivateBySlug,
  markPartnerLogoGeneratedIfUnused,
} from '@/db/queries/partners';
import { generateLogoImage } from '@/lib/openai/images';
import { buildS3ObjectUrl, putObjectToS3 } from '@/lib/storage/s3';

const styleDesc: Record<string, string> = {
  modern: 'minimalist, clean lines, geometric shapes, modern sans-serif, professional',
  bold: 'strong, impactful, thick letterforms, high contrast, powerful, confident',
  elegant: 'sophisticated, refined, serif typography, luxury, premium, timeless',
};

function buildLogoPrompts(firmName: string, style: string, brandColor?: string) {
  const styleHint = styleDesc[style] || styleDesc.modern;
  const colorHint = brandColor ? `, primary color ${brandColor}` : '';

  return [
    `Professional logo for "${firmName}" prop trading firm. ${styleHint}${colorHint}. Square format, centered, clean white background. Trading/finance theme with abstract symbols (charts, growth arrows, geometric patterns). Icon only, no text. High quality, vector-style.`,
    `Minimalist logo mark for "${firmName}" trading company. ${styleHint}${colorHint}. Abstract financial symbol, clean white background, modern flat design. No text, icon only.`,
    `Icon logo for "${firmName}" prop firm. ${styleHint}${colorHint}. Simple geometric shape inspired by trading charts or upward growth. White background, professional. No text.`,
  ];
}

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

    const prompts = buildLogoPrompts(firm_name, style, brand_color);

    const results = await Promise.allSettled(
      prompts.map(async (prompt, index) => {
        const buffer = await generateLogoImage(prompt, apiKey);
        const key = `uploads/logos/${slug}/${randomUUID()}-${index + 1}.png`;
        await putObjectToS3({
          bucket,
          region,
          accessKeyId,
          secretAccessKey,
          key,
          contentType: 'image/png',
          body: buffer,
        });
        return buildS3ObjectUrl(bucket, region, key);
      })
    );

    const logos = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
      .map((r) => r.value);

    if (logos.length === 0) {
      return Response.json({ error: 'Failed to generate logos' }, { status: 500 });
    }

    const marked = await markPartnerLogoGeneratedIfUnused(slug);
    if (!marked) {
      return Response.json(
        { error: 'Logo generation is only available once per partner' },
        { status: 403 }
      );
    }

    return Response.json({ logos });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Logo generation failed' }, { status: 500 });
  }
}
