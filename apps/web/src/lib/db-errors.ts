export function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  if (code === '23505') return true;

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('unique') || message.includes('duplicate key');
}
