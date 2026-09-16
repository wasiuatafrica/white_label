import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/partners/[slug]/admin-view/route';

describe('partner admin view bounce', () => {
  it('rejects a missing or invalid token', async () => {
    const res = await GET(new Request('https://acme.ft9ja.com/api/partners/acme/admin-view'), {
      params: Promise.resolve({ slug: 'acme' }),
    });
    expect(res.status).toBe(401);
  });
});
