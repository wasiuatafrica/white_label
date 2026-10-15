import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/partners/[slug]/admin-view/route';

describe('partner admin view bounce', () => {
  it('rejects a missing or invalid token', async () => {
    const res = await POST(
      new Request('https://acme.ft9ja.com/api/partners/acme/admin-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '' }),
      }),
      { params: Promise.resolve({ slug: 'acme' }) }
    );
    expect(res.status).toBe(401);
  });
});
