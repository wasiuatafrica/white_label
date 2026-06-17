const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_TIMEOUT_MS = 25_000;

export async function generateLogoImage(prompt: string, apiKey: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_IMAGE_TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
        output_format: 'png',
      }),
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image generation timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
