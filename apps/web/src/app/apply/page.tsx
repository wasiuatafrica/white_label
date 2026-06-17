'use client';
import { getPartnerUrl, normalizePartnerSlug } from '@/lib/tenant';
import useUpload from '@/utils/useUpload';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const STEPS = ['Your Details', 'Branding', 'Payment', 'Review'];
const TRACKING_STEPS = ['details', 'branding', 'payment', 'review'] as const;

type TrackingStatus = 'started' | 'continued' | 'payment_started' | 'abandoned' | 'submitted';

const BRAND_PRESETS = [
  { name: 'Forest', primary: '#16A34A', secondary: '#F59E0B' },
  { name: 'Ocean', primary: '#2563EB', secondary: '#EC4899' },
  { name: 'Ember', primary: '#DC2626', secondary: '#F59E0B' },
  { name: 'Storm', primary: '#7C3AED', secondary: '#06B6D4' },
  { name: 'Slate', primary: '#374151', secondary: '#10B981' },
  { name: 'Crimson', primary: '#BE185D', secondary: '#F59E0B' },
];

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const attemptIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const hasTrackedRef = useRef(false);
  const submittedRef = useRef(false);
  const [upload, { loading: uploading }] = useUpload();
  const [proofFileName, setProofFileName] = useState('');

  const [form, setForm] = useState({
    firm_name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    tagline: '',
    description: '',
    brand_color: '#16A34A',
    secondary_color: '#F59E0B',
    payment_method: '',
    payment_proof_url: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const getTrackingPayload = useCallback(
    (status: TrackingStatus, stepOverride = step) => ({
      attempt_id: attemptIdRef.current,
      status,
      last_step: TRACKING_STEPS[stepOverride] ?? 'details',
      form_data: {
        firm_name: form.firm_name,
        slug: form.slug,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        tagline: form.tagline,
        description: form.description,
        brand_color: form.brand_color,
        secondary_color: form.secondary_color,
        payment_method: form.payment_method,
        has_payment_proof: Boolean(form.payment_proof_url),
      },
    }),
    [form, step]
  );

  const trackSignup = useCallback(
    async (status: TrackingStatus, stepOverride = step) => {
      hasTrackedRef.current = true;
      try {
        await fetch('/api/partner-signup-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getTrackingPayload(status, stepOverride)),
          keepalive: status === 'abandoned',
        });
      } catch (e) {
        console.error('Failed to track partner signup event', e);
      }
    },
    [getTrackingPayload, step]
  );

  useEffect(() => {
    const trackAbandoned = () => {
      if (!hasTrackedRef.current || submittedRef.current) return;
      const payload = JSON.stringify(getTrackingPayload('abandoned'));
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/partner-signup-events',
          new Blob([payload], { type: 'application/json' })
        );
        return;
      }
      void fetch('/api/partner-signup-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') trackAbandoned();
    };

    window.addEventListener('pagehide', trackAbandoned);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', trackAbandoned);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getTrackingPayload]);

  const autoSlug = (name: string) =>
    normalizePartnerSlug(name.replace(/[^a-z0-9]+/gi, '-')).slice(0, 20);

  const canNext = () => {
    if (step === 0) return form.firm_name && form.owner_name && form.owner_email && form.slug;
    if (step === 1) return form.brand_color;
    if (step === 2) return form.payment_method && form.payment_proof_url;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }
      submittedRef.current = true;
      await trackSignup('submitted', 3);
      setSubmitted(true);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF] px-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#16A34A]/10">
            <CheckCircle size={28} className="text-[#16A34A]" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Application Submitted!</h2>
          <p className="mt-3 text-sm text-gray-500">
            We&apos;ve received your application for <strong>{form.firm_name}</strong>. Our team
            will review it within 24-48 hours and reach out to <strong>{form.owner_email}</strong>.
          </p>
          <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-left">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
              Your Subdomain
            </div>
            <div className="text-sm font-semibold text-gray-900">{getPartnerUrl(form.slug)}</div>
            <div className="mt-1 text-xs text-gray-400">
              Will be live after approval and payment confirmation.
            </div>
          </div>
          <Link
            href="/"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Replace the fake file onChange handler with real upload
  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFileName(file.name);
    const result = await upload({ file });
    if (result.url) {
      set('payment_proof_url', result.url);
      void trackSignup('payment_started', 2);
    } else {
      setError(result.error || 'Upload failed. Please try again.');
    }
  }

  const handleContinue = () => {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    const status: TrackingStatus = nextStep >= 2 ? 'payment_started' : 'continued';
    void trackSignup(status, nextStep);
    setStep(nextStep);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#16A34A]">
              <span className="text-[10px] font-black text-white">FT</span>
            </div>
            <span className="text-sm font-black text-gray-900">9ja Partner</span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Step progress */}
        <div className="mb-10">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      i < step
                        ? 'bg-[#16A34A] text-white'
                        : i === step
                          ? 'bg-[#111827] text-white'
                          : 'border border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    {i < step ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span
                    className={`mt-1 text-xs font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mb-4 h-px flex-1 ${i < step ? 'bg-[#16A34A]' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          {/* Step 0 — Your Details */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Your firm details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This is the name your traders will know you by.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Firm Name *
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                    placeholder="e.g. Apex Funds"
                    value={form.firm_name}
                    onChange={(e) => {
                      set('firm_name', e.target.value);
                      set('slug', autoSlug(e.target.value));
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Subdomain Handle *
                  </label>
                  <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-[#16A34A]/20">
                    <input
                      className="flex-1 px-4 py-2.5 text-sm text-gray-900 outline-none"
                      placeholder="apexfunds"
                      value={form.slug}
                      onChange={(e) => set('slug', normalizePartnerSlug(e.target.value))}
                    />
                    <span className="border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                      .ft9ja.com
                    </span>
                  </div>
                  {form.slug && (
                    <p className="mt-1 text-xs text-gray-400">
                      Your public URL:{' '}
                      <strong className="text-gray-600">{getPartnerUrl(form.slug)}</strong>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Your Full Name *
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                    placeholder="Chidi Okafor"
                    value={form.owner_name}
                    onChange={(e) => set('owner_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                    placeholder="you@yourfirm.com"
                    value={form.owner_email}
                    onChange={(e) => set('owner_email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Firm Tagline
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
                    placeholder="e.g. Funded accounts for serious traders"
                    value={form.tagline}
                    onChange={(e) => set('tagline', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Branding */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Brand your firm</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose colors that represent your firm. You can update these later.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold text-gray-700">
                  Color Presets
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {BRAND_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        set('brand_color', p.primary);
                        set('secondary_color', p.secondary);
                      }}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        form.brand_color === p.primary
                          ? 'border-gray-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-1.5 mb-2">
                        <div
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: p.primary }}
                        />
                        <div
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: p.secondary }}
                        />
                      </div>
                      <div className="text-xs font-medium text-gray-700">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="color"
                      value={form.brand_color}
                      onChange={(e) => set('brand_color', e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-sm font-mono text-gray-600">{form.brand_color}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => set('secondary_color', e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-sm font-mono text-gray-600">{form.secondary_color}</span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-medium text-gray-500">
                    Preview — {form.firm_name || 'Your Firm'}
                  </span>
                </div>
                <div className="p-6" style={{ backgroundColor: form.brand_color + '10' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: form.brand_color }}
                    >
                      {(form.firm_name || 'F')[0]}
                    </div>
                    <span className="font-black text-gray-900 text-sm">
                      {form.firm_name || 'Your Firm'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {form.tagline || 'Your tagline appears here'}
                  </p>
                  <button
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: form.brand_color }}
                  >
                    Start Evaluation →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Payment */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">License payment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  ₦95,000/month. Setup fee waived for the first 50 partners.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'bank',
                    label: 'Bank Transfer — Zenith Bank',
                    detail: 'Asokoro Technologies · 1217002454 · Zenith Bank',
                  },
                  {
                    id: 'paypal',
                    label: 'PayPal',
                    detail:
                      'Send to: https://www.paypal.me/ft9ja · Include your firm name in notes',
                  },
                  {
                    id: 'crypto',
                    label: 'BTC',
                    detail:
                      'BTC Network Address: 3CLFanKRsufL2hrMmFuBMQAGVDmThr4RPa · Upload your transaction receipt or hash after sending payment',
                  },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                      form.payment_method === m.id
                        ? 'border-[#16A34A] bg-[#16A34A]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={form.payment_method === m.id}
                      onChange={() => set('payment_method', m.id)}
                      className="mt-0.5 accent-[#16A34A]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{m.label}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{m.detail}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Upload Payment Proof *
                </label>
                <input
                  ref={proofRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleProofUpload}
                />
                <button
                  onClick={() => proofRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {proofFileName
                        ? `✓ ${proofFileName}`
                        : 'Click to upload receipt or screenshot'}
                    </>
                  )}
                </button>
                <p className="mt-1.5 text-xs text-gray-400">
                  Required for bank transfer, PayPal, and crypto payments before submitting.
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Review your application</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Confirm everything looks correct before submitting.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Firm Name', value: form.firm_name },
                  { label: 'Subdomain', value: getPartnerUrl(form.slug) },
                  { label: 'Contact', value: `${form.owner_name} · ${form.owner_email}` },
                  { label: 'Payment Method', value: form.payment_method.toUpperCase() || '—' },
                  { label: 'Receipt', value: form.payment_proof_url ? 'Uploaded' : 'Missing' },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between border-b border-gray-100 py-2"
                  >
                    <span className="text-xs font-medium text-gray-400">{r.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-400">Brand Color</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: form.brand_color }}
                    />
                    <span className="text-sm font-mono text-gray-900">{form.brand_color}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-400">
                By submitting, you agree to FT9ja&apos;s Partner Terms. Your application will be
                reviewed within 24–48 hours. Payment must be confirmed before your subdomain goes
                live.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
            >
              <ArrowLeft size={14} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleContinue}
                disabled={!canNext()}
                className="flex items-center gap-2 rounded-lg bg-[#111827] px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || uploading}
                className="flex items-center gap-2 rounded-lg bg-[#16A34A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
