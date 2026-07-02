const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAGIC_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

function matchesMagic(bytes: Buffer, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

export function detectUploadMimeType(bytes: Buffer): string | null {
  for (const { mime, bytes: signature } of MAGIC_SIGNATURES) {
    if (matchesMagic(bytes, signature)) return mime;
  }
  return null;
}

export function validateUploadFile(bytes: Buffer, declaredType: string) {
  const detected = detectUploadMimeType(bytes);
  if (!detected) {
    return { ok: false as const, error: 'Unsupported file type. Upload JPEG, PNG, WebP, GIF, or PDF.' };
  }

  const normalizedDeclared = declaredType.split(';')[0]?.trim().toLowerCase() || '';
  if (normalizedDeclared && normalizedDeclared !== 'application/octet-stream') {
    if (!ALLOWED_MIME_TYPES.has(normalizedDeclared)) {
      return { ok: false as const, error: 'Unsupported file type. Upload JPEG, PNG, WebP, GIF, or PDF.' };
    }
    if (normalizedDeclared !== detected) {
      return { ok: false as const, error: 'File content does not match declared type.' };
    }
  }

  if (!ALLOWED_MIME_TYPES.has(detected)) {
    return { ok: false as const, error: 'Unsupported file type. Upload JPEG, PNG, WebP, GIF, or PDF.' };
  }

  return { ok: true as const, contentType: detected };
}
