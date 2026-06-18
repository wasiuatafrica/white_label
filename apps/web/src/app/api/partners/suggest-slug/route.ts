import { getTakenSlugs } from '@/db/queries/partners';
import { generateSubdomainSuggestions } from '@/lib/openai/subdomain-suggestions';
import { isValidPartnerSlug, normalizePartnerSlug } from '@/lib/tenant';

export const runtime = 'nodejs';

type SuggestSlugResponse = {
  suggestions: Array<{
    slug: string;
    label: string;
    available: boolean;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firmName = String(body.firm_name || '').trim();
    const tagline = String(body.tagline || '').trim();
    const idea = String(body.idea || '').trim();

    if (!firmName && !idea) {
      return Response.json(
        { error: 'firm_name or idea is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Subdomain suggestions are not configured' },
        { status: 500 }
      );
    }

    const rawSuggestions = await generateSubdomainSuggestions(
      {
        firmName: firmName || idea,
        tagline: tagline || undefined,
        idea: idea || undefined,
      },
      apiKey
    );

    const normalized = rawSuggestions
      .map((item) => ({
        slug: normalizePartnerSlug(item.slug),
        label: item.label.trim(),
      }))
      .filter((item) => item.slug && isValidPartnerSlug(item.slug));

    const uniqueSlugs = [...new Set(normalized.map((item) => item.slug))];
    const takenSlugs = await getTakenSlugs(uniqueSlugs);

    const seen = new Set<string>();
    const suggestions: SuggestSlugResponse['suggestions'] = [];

    for (const item of normalized) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      suggestions.push({
        slug: item.slug,
        label: item.label,
        available: !takenSlugs.has(item.slug),
      });
      if (suggestions.length >= 5) break;
    }

    return Response.json({ suggestions } satisfies SuggestSlugResponse);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Subdomain suggestion failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
