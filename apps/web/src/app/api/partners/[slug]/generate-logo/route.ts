export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await params;
    const body = await request.json();
    const { firm_name, brand_color, style } = body;

    if (!firm_name) {
      return Response.json({ error: 'firm_name is required' }, { status: 400 });
    }

    const styleDesc: Record<string, string> = {
      modern: 'minimalist, clean lines, geometric shapes, modern sans-serif, professional',
      bold: 'strong, impactful, thick letterforms, high contrast, powerful, confident',
      elegant: 'sophisticated, refined, serif typography, luxury, premium, timeless',
    };

    const styleHint = styleDesc[style as string] || styleDesc['modern'];
    const colorHint = brand_color ? `, primary color ${brand_color}` : '';

    // Generate 3 variations with different prompts
    const prompts = [
      `Professional logo for "${firm_name}" prop trading firm. ${styleHint}${colorHint}. Square format, centered, clean white background. Trading/finance theme with abstract symbols (charts, growth arrows, geometric patterns). Icon only, no text. High quality, vector-style.`,
      `Minimalist logo mark for "${firm_name}" trading company. ${styleHint}${colorHint}. Abstract financial symbol, clean white background, modern flat design. No text, icon only.`,
      `Icon logo for "${firm_name}" prop firm. ${styleHint}${colorHint}. Simple geometric shape inspired by trading charts or upward growth. White background, professional. No text.`,
    ];

    const baseUrl = process.env.NEXT_PUBLIC_CREATE_BASE_URL;
    const token = process.env.ANYTHING_PROJECT_TOKEN;

    const results = await Promise.allSettled(
      prompts.map(async (prompt) => {
        const params = new URLSearchParams({
          prompt,
          aspectRatio: '1:1',
          imageSize: '2K',
        });
        const url = `${baseUrl}/integrations/nano-banana/?${params}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          console.error('NANO_BANANA error:', await res.text());
          throw new Error('Image generation failed');
        }
        const data = await res.json();
        return data.data?.[0] as string;
      })
    );

    const logos = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
      .map((r) => r.value);

    if (logos.length === 0) {
      return Response.json({ error: 'Failed to generate logos' }, { status: 500 });
    }

    return Response.json({ logos });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Logo generation failed' }, { status: 500 });
  }
}
