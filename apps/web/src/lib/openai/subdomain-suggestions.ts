import {
  extractResponsesOutputText,
  getResponsesApiFailureMessage,
  type ResponsesApiPayload,
} from '@/lib/openai/responses';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_RESPONSE_TIMEOUT_MS = 15_000;
const SUBDOMAIN_MODEL = 'gpt-5.4-mini';

const SUBDOMAIN_SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['slug', 'label'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const;

export type SubdomainSuggestion = {
  slug: string;
  label: string;
};

function buildSubdomainPrompt(input: {
  firmName: string;
  tagline?: string;
  idea?: string;
}): string {
  const parts = [`Firm name: ${input.firmName}`];
  if (input.tagline?.trim()) parts.push(`Tagline: ${input.tagline.trim()}`);
  if (input.idea?.trim()) parts.push(`Ideas or keywords: ${input.idea.trim()}`);

  return parts.join('\n');
}

export async function generateSubdomainSuggestions(
  input: {
    firmName: string;
    tagline?: string;
    idea?: string;
  },
  apiKey: string
): Promise<SubdomainSuggestion[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_RESPONSE_TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SUBDOMAIN_MODEL,
        instructions: [
          'You suggest short, brandable subdomain handles for prop trading firms on ft9ja.com.',
          'Return exactly 3 suggestions as JSON.',
          'Each slug must be lowercase letters, numbers, or single hyphens only.',
          'No leading or trailing hyphens. Length 3-20 characters.',
          'Prefer memorable, professional handles related to the firm name or theme.',
          'Avoid generic words like "trading", "forex", "partner", or "ft9ja".',
          'label is a very short human hint (2-4 words) for why the slug fits.',
        ].join(' '),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: buildSubdomainPrompt(input),
              },
            ],
          },
        ],
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'subdomain_suggestions',
            schema: SUBDOMAIN_SUGGESTIONS_SCHEMA,
            strict: true,
          },
        },
        max_output_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('OpenAI responses error:', res.status, detail);
      throw new Error('Subdomain suggestion failed');
    }

    const data = (await res.json()) as ResponsesApiPayload;
    const failure = getResponsesApiFailureMessage(data);
    if (failure) {
      console.error('OpenAI responses incomplete:', failure, JSON.stringify(data.output ?? []));
      throw new Error('Subdomain suggestion failed');
    }

    const raw = extractResponsesOutputText(data);
    if (!raw) {
      console.error('OpenAI responses missing output text:', JSON.stringify(data));
      throw new Error('Subdomain suggestion returned no data');
    }

    const parsed = JSON.parse(raw) as { suggestions?: SubdomainSuggestion[] };
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error('Subdomain suggestion returned invalid data');
    }

    return parsed.suggestions;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Subdomain suggestion timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
