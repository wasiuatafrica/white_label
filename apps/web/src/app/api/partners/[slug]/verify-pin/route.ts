import { verifyPartnerPin } from '@/db/queries/partners';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return Response.json({ error: 'pin is required' }, { status: 400 });
    }

    const valid = await verifyPartnerPin(slug, pin);
    if (valid === null) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    return Response.json({ valid });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}
