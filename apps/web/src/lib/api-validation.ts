import type { ZodSchema } from 'zod';

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false as const, response: Response.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return { ok: false as const, response: Response.json({ error: message }, { status: 400 }) };
  }

  return { ok: true as const, data: parsed.data };
}
