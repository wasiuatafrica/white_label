const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

export async function generateLogoImage(prompt: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('OpenAI image error:', res.status, detail);
    throw new Error('Image generation failed');
  }

  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Image generation returned no data');
  }

  return Buffer.from(b64, 'base64');
}
