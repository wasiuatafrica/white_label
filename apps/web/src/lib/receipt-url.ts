import { hasAllowedS3KeyPrefix, parseS3ObjectUrl } from '@/lib/storage/s3';

export function validatePaymentProofUrl(url: unknown, slug: string) {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket) {
    return { ok: false as const, status: 500, error: 'Receipt storage is not configured' };
  }

  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) {
    return { ok: false as const, status: 400, error: 'payment_proof_url is required' };
  }

  const key = parseS3ObjectUrl(value, bucket, region);
  if (!key || !hasAllowedS3KeyPrefix(key, [`uploads/receipts/${slug}/`])) {
    return { ok: false as const, status: 400, error: 'payment_proof_url is not a valid receipt' };
  }

  return { ok: true as const, url: value };
}
