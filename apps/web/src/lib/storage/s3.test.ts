// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildS3ObjectUrl,
  createS3PresignedGetUrl,
  getStorageConfig,
  getStorageLocation,
  isR2Enabled,
  parseS3ObjectUrl,
  putObjectToS3,
} from '@/lib/storage/s3';

const R2_ENDPOINT = 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com';
const R2_HOST = '0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com';
const SECRET = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';

function stubAwsEnv() {
  vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIDEXAMPLE');
  vi.stubEnv('AWS_SECRET_ACCESS_KEY', SECRET);
  vi.stubEnv('AWS_REGION', 'eu-west-1');
  vi.stubEnv('AWS_S3_BUCKET', 'whitelabel-prop');
  vi.stubEnv('R2_ENDPOINT', '');
  vi.stubEnv('R2_ACCESS_KEY_ID', '');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', '');
}

function stubR2Env() {
  stubAwsEnv();
  vi.stubEnv('R2_ENDPOINT', `${R2_ENDPOINT}/`);
  vi.stubEnv('R2_ACCESS_KEY_ID', 'R2KEYEXAMPLE');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'r2-secret-example');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-25T12:34:56.789Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('storage helper, S3 mode (R2_ENDPOINT unset)', () => {
  beforeEach(stubAwsEnv);

  it('uses AWS credentials and region', () => {
    expect(isR2Enabled()).toBe(false);
    expect(getStorageConfig()).toEqual({
      provider: 's3',
      bucket: 'whitelabel-prop',
      region: 'eu-west-1',
      endpoint: null,
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: SECRET,
    });
  });

  it('needs only bucket and region for the location', () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', '');
    expect(getStorageConfig()).toBeNull();
    expect(getStorageLocation()).toMatchObject({ provider: 's3', region: 'eu-west-1' });
  });

  // Golden values captured from the pre-R2 implementation with the same inputs and clock.
  it('presigns exactly as before', () => {
    const config = getStorageConfig()!;
    expect(
      createS3PresignedGetUrl({
        config,
        key: 'uploads/receipts/acme/2026-11-25/abc-receipt.jpg',
        expiresInSeconds: 300,
      })
    ).toBe(
      'https://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/receipts/acme/2026-11-25/abc-receipt.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIDEXAMPLE%2F20261125%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20261125T123456Z&X-Amz-Expires=300&X-Amz-Signature=451ca0d02ba39a22685f0e108b3d9af3f56f563e1bb405be174878f039d0859b&X-Amz-SignedHeaders=host'
    );
  });

  it('uploads exactly as before', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);

    await putObjectToS3({
      config: getStorageConfig()!,
      key: 'uploads/logos/acme/logo.png',
      contentType: 'image/png',
      body: Buffer.from('hello'),
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/logos/acme/logo.png');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({
      Authorization:
        'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261125/eu-west-1/s3/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=beb29655eee89857affddd99626790d58527b603162ff210619f916e829ffca7',
      'Content-Type': 'image/png',
      'X-Amz-Content-Sha256': '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      'X-Amz-Date': '20261125T123456Z',
    });
  });

  it('builds and parses the same stored URLs as before', () => {
    const location = getStorageLocation()!;
    expect(buildS3ObjectUrl(location, 'uploads/logos/acme/x y.png')).toBe(
      'https://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/logos/acme/x%20y.png'
    );
    expect(
      parseS3ObjectUrl(
        'https://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/logos/acme/x%20y.png',
        location
      )
    ).toBe('uploads/logos/acme/x y.png');
    expect(
      parseS3ObjectUrl('https://whitelabel-prop.s3.us-east-1.amazonaws.com/uploads/a.png', location)
    ).toBeNull();
    expect(parseS3ObjectUrl(`${R2_ENDPOINT}/whitelabel-prop/uploads/a.png`, location)).toBeNull();
  });
});

describe('storage helper, R2 mode (R2_ENDPOINT set)', () => {
  beforeEach(stubR2Env);

  it('uses R2 credentials, region auto and the endpoint origin', () => {
    expect(isR2Enabled()).toBe(true);
    expect(getStorageConfig()).toEqual({
      provider: 'r2',
      bucket: 'whitelabel-prop',
      region: 'auto',
      endpoint: R2_ENDPOINT,
      accessKeyId: 'R2KEYEXAMPLE',
      secretAccessKey: 'r2-secret-example',
    });
  });

  it('is unconfigured without R2 keys, even when AWS keys are set', () => {
    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');
    expect(getStorageConfig()).toBeNull();
  });

  it('presigns path-style against the R2 endpoint', () => {
    const signed = new URL(
      createS3PresignedGetUrl({ config: getStorageConfig()!, key: 'uploads/receipts/acme/r.jpg' })
    );
    expect(signed.host).toBe(R2_HOST);
    expect(signed.pathname).toBe('/whitelabel-prop/uploads/receipts/acme/r.jpg');
    expect(signed.searchParams.get('X-Amz-Credential')).toBe(
      'R2KEYEXAMPLE/20261125/auto/s3/aws4_request'
    );
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(signed.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(signed.href).not.toContain('amazonaws.com');
  });

  it('uploads to the R2 endpoint without checksum or ACL headers', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);

    await putObjectToS3({
      config: getStorageConfig()!,
      key: 'uploads/logos/acme/logo.png',
      contentType: 'image/png',
      body: Buffer.from('hello'),
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${R2_ENDPOINT}/whitelabel-prop/uploads/logos/acme/logo.png`);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toContain('Credential=R2KEYEXAMPLE/20261125/auto/s3/aws4_request');
    expect(Object.keys(headers).map((h) => h.toLowerCase())).toEqual([
      'authorization',
      'content-type',
      'x-amz-content-sha256',
      'x-amz-date',
    ]);
  });

  it('stores R2 URLs and still reads legacy S3 URLs for the same bucket', () => {
    const location = getStorageLocation()!;
    const stored = buildS3ObjectUrl(location, 'uploads/logos/acme/x y.png');
    expect(stored).toBe(`${R2_ENDPOINT}/whitelabel-prop/uploads/logos/acme/x%20y.png`);
    expect(parseS3ObjectUrl(stored, location)).toBe('uploads/logos/acme/x y.png');

    for (const legacy of [
      'https://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/receipts/a.jpg',
      'https://whitelabel-prop.s3.amazonaws.com/uploads/receipts/a.jpg',
      'https://whitelabel-prop.s3-eu-west-1.amazonaws.com/uploads/receipts/a.jpg',
    ]) {
      expect(parseS3ObjectUrl(legacy, location)).toBe('uploads/receipts/a.jpg');
    }
  });

  it('rejects other buckets and hosts', () => {
    const location = getStorageLocation()!;
    for (const url of [
      `${R2_ENDPOINT}/other-bucket/uploads/a.jpg`,
      `${R2_ENDPOINT}/whitelabel-prop/`,
      'https://other.s3.eu-west-1.amazonaws.com/uploads/a.jpg',
      'https://whitelabel-prop.s3.eu-west-1.amazonaws.com.evil.com/uploads/a.jpg',
      'http://whitelabel-prop.s3.eu-west-1.amazonaws.com/uploads/a.jpg',
      'https://evil.r2.cloudflarestorage.com/whitelabel-prop/uploads/a.jpg',
      'not a url',
    ]) {
      expect(parseS3ObjectUrl(url, location)).toBeNull();
    }
  });

  it('treats an invalid R2_ENDPOINT as unconfigured rather than falling back to S3', () => {
    vi.stubEnv('R2_ENDPOINT', 'not a url');
    expect(getStorageLocation()).toBeNull();
    expect(getStorageConfig()).toBeNull();
  });
});
