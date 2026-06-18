type ResponseContentPart = {
  type?: string;
  text?: string;
};

type ResponseOutputItem = {
  type?: string;
  content?: ResponseContentPart[];
};

export type ResponsesApiPayload = {
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: ResponseOutputItem[];
};

export function extractResponsesOutputText(data: ResponsesApiPayload): string | null {
  if (data.output_text?.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return null;
  }

  const parts: string[] = [];

  for (const item of data.output) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;

    for (const part of item.content) {
      if (part.type === 'output_text' && part.text?.trim()) {
        parts.push(part.text.trim());
      }
    }
  }

  return parts.length > 0 ? parts.join('') : null;
}

export function getResponsesApiFailureMessage(data: ResponsesApiPayload): string | null {
  if (data.error?.message) {
    return data.error.message;
  }

  if (data.status === 'incomplete') {
    return data.incomplete_details?.reason || 'response incomplete';
  }

  return null;
}
