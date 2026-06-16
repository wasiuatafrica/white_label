'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    Banknote,
    Bitcoin,
    CheckCircle,
    ChevronDown,
    Copy,
    CreditCard,
    FileText,
    Loader2,
    Mail,
    Shield,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { getFt9jaPaymentRows } from '@/lib/ft9ja-payments';
import useUpload from '@/utils/useUpload';

type PaymentMethod = 'transfer' | 'paypal' | 'crypto';

type Partner = {
  id: number;
  slug: string;
  firm_name: string;
  owner_name: string;
  owner_email: string;
  brand_color: string;
  secondary_color: string;
  tagline: string;
  description: string;
  status: string;
  total_traders: number;
  logo_url: string | null;
  template: string | null;
  fee_markup: number | string | null;
};

type EvalProduct = {
  id: string;
  name: string;
  code: string;
  price: string;
  priceNum: number;
  accountSize: string;
  profitTarget: string;
  maxDrawdown: string;
  tradingDays: string;
  features: string[];
};

const BASE_EVAL_PRODUCTS: EvalProduct[] = [
  {
    id: 'ss',
    name: 'Standard Evaluation',
    code: 'SS',
    price: '₦145,000',
    priceNum: 145000,
    accountSize: '$10,000',
    profitTarget: '25%',
    maxDrawdown: '10%',
    tradingDays: '30 days',
    features: [
      'Daily drawdown limit: 5%',
      'Maximum 10% total drawdown',
      'Minimum 30 trading days',
      'News trading allowed',
    ],
  },
  {
    id: 'ssl',
    name: 'Starter Evaluation',
    code: 'SSL',
    price: '₦49,000',
    priceNum: 49000,
    accountSize: '$10,000',
    profitTarget: '25%',
    maxDrawdown: '10%',
    tradingDays: '30 days',
    features: [
      'Daily drawdown limit: 5%',
      'Maximum 10% total drawdown',
      'Minimum 30 trading days',
      'No EA restrictions',
    ],
  },
];

function getProducts(feeMarkup: number | string | null | undefined): EvalProduct[] {
  const markup = Number(feeMarkup || 0);
  if (!markup) return BASE_EVAL_PRODUCTS;
  return BASE_EVAL_PRODUCTS.map((p) => {
    const total = p.priceNum + markup;
    return {
      ...p,
      priceNum: total,
      price: `₦${total.toLocaleString()}`,
    };
  });
}

// ─── Partner Info Sections (FAQ, Rules, Contact) ──────────────────────────────
const PARTNER_FAQS = [
  {
    q: 'What is a prop trading evaluation?',
    a: 'An evaluation is a trading challenge where you must reach a 25% profit target while respecting drawdown and daily loss rules over a minimum number of trading days. Pass it → receive a real funded account.',
  },
  {
    q: 'How do I access my dashboard after purchasing?',
    a: "Visit the Trader Login page, enter the email you used when purchasing, and you'll be taken directly to your evaluation dashboard. No password needed — your email is your access.",
  },
  {
    q: 'What happens when I pass?',
    a: 'Once all conditions are met (profit target, min trading days, no rule breaches), contact your firm via the details below. Your funded live account will be set up within 1–3 business days.',
  },
  {
    q: 'Can I trade news events?',
    a: 'Standard (SS) evaluations allow news trading. Starter (SSL) evaluations restrict trading during high-impact news events. Check the Rules section for full details.',
  },
  {
    q: 'Are Expert Advisors (EAs) allowed?',
    a: 'Starter (SSL) evaluations allow all EAs. Standard (SS) evaluations have restrictions on certain high-frequency EAs. Copy trading from other funded accounts is not permitted in either.',
  },
  {
    q: 'Is my evaluation fee refundable?',
    a: 'Evaluation fees are non-refundable once your account has been activated. If you have not received your account credentials within 4 business hours of confirmed payment, contact us immediately.',
  },
  {
    q: 'What is the profit split on funded accounts?',
    a: 'Funded traders keep up to 90% of their net profits. Payouts are processed within 7 business days of a withdrawal request through your trader dashboard.',
  },
];

const EVAL_RULES = [
  {
    code: 'SS',
    name: 'Standard Evaluation',
    accountSize: '$10,000',
    rules: [
      { label: 'Profit Target', value: '25% ($2,500)' },
      { label: 'Max Drawdown', value: '10% ($1,000)' },
      { label: 'Daily Loss Limit', value: '5% ($500)' },
      { label: 'Min Trading Days', value: '30 days' },
      { label: 'News Trading', value: '✅ Allowed' },
      { label: 'Expert Advisors', value: '⚠️ Restricted' },
      { label: 'Profit Split', value: 'Up to 90%' },
    ],
  },
  {
    code: 'SSL',
    name: 'Starter Evaluation',
    accountSize: '$10,000',
    rules: [
      { label: 'Profit Target', value: '25% ($2,500)' },
      { label: 'Max Drawdown', value: '10% ($1,000)' },
      { label: 'Daily Loss Limit', value: '5% ($500)' },
      { label: 'Min Trading Days', value: '30 days' },
      { label: 'News Trading', value: '⚠️ Restricted' },
      { label: 'Expert Advisors', value: '✅ Allowed' },
      { label: 'Profit Split', value: 'Up to 90%' },
    ],
  },
];

function PartnerInfoSections({
  partner,
  primary,
  slug,
}: {
  partner: Partner;
  primary: string;
  slug: string;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Rules */}
      <section id="rules" className="border-t border-gray-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Rules
          </span>
          <h2 className="mt-2 mb-2 text-2xl font-black text-gray-900">Evaluation Rules</h2>
          <p className="mb-10 text-sm text-gray-500">
            Clear rules, no surprises. Know exactly what you need to achieve before you start.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {EVAL_RULES.map((ev) => (
              <div
                key={ev.code}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      {ev.code}
                    </div>
                    <div className="text-sm font-black text-gray-900">{ev.name}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-500">{ev.accountSize}</div>
                </div>
                <div className="divide-y divide-gray-50">
                  {ev.rules.map((r) => (
                    <div key={r.label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-xs font-medium text-gray-400">{r.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1.5">
            <p>
              <strong className="text-gray-700">Account drawdown:</strong> Measured against the
              $10,000 account size using both balance and equity. A breach at any point fails the
              evaluation.
            </p>
            <p>
              <strong className="text-gray-700">Daily drawdown:</strong> Measured from each
              day&apos;s starting balance and equity against that day&apos;s lowest balance and
              equity.
            </p>
            <p>
              <strong className="text-gray-700">Trading days:</strong> Counted when at least one
              trade is fully closed within that calendar day.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/${slug}/legal`}
              className="text-xs font-semibold underline"
              style={{ color: primary }}
            >
              Read full terms & conditions →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">FAQ</span>
          <h2 className="mt-2 mb-10 text-2xl font-black text-gray-900">
            Frequently asked questions
          </h2>
          <div className="space-y-2">
            {PARTNER_FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-gray-400 text-center">
            More questions?{' '}
            <a href="#contact" className="font-semibold underline" style={{ color: primary }}>
              Contact us below
            </a>{' '}
            or{' '}
            <Link href="/guide" className="font-semibold underline" style={{ color: primary }}>
              read our full guide
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-gray-100 bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Contact
          </span>
          <h2 className="mt-2 mb-2 text-2xl font-black text-gray-900">Get in touch</h2>
          <p className="mb-10 text-sm text-gray-500">
            Have a question about your evaluation or want to start a new one? We&apos;re here to
            help.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Contact card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: primary }}
              >
                <Mail size={18} />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Email Support</h3>
              <p className="mb-4 text-xs text-gray-500">
                {partner.owner_name
                  ? `Contact ${partner.owner_name} at ${partner.firm_name} directly.`
                  : `Contact ${partner.firm_name} directly.`}
              </p>
              {partner.owner_email ? (
                <a
                  href={`mailto:${partner.owner_email}`}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: primary }}
                >
                  <Mail size={14} /> {partner.owner_email}
                </a>
              ) : (
                <p className="text-xs text-gray-400">
                  Contact information not listed. Use the trader login to reach support.
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/${slug}/login`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Access my dashboard</span>
                  <ArrowRight size={14} className="text-gray-400" />
                </Link>
                <a
                  href="#evaluations"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Buy an evaluation</span>
                  <ArrowRight size={14} className="text-gray-400" />
                </a>
                <Link
                  href={`/${slug}/legal`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Read terms & legal</span>
                  <ArrowRight size={14} className="text-gray-400" />
                </Link>
                <Link
                  href="/guide"
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Full trader guide</span>
                  <ArrowRight size={14} className="text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────
function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-black text-gray-900">Partner not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          No firm at <strong>{slug}.ft9ja.com</strong> exists yet.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Apply to start your firm <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── Purchase Modal (shared across templates) ─────────────────────────────────
function PurchaseModal({
  product,
  slug,
  primary,
  onClose,
}: {
  product: EvalProduct;
  slug: string;
  primary: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [upload, { loading: uploading }] = useUpload();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) throw new Error('Upload payment evidence before submitting.');
      setUploadError(null);
      const uploaded = await upload({ file: proofFile });
      if (uploaded.error || !uploaded.url) {
        throw new Error(uploaded.error || 'Upload failed');
      }

      const res = await fetch(`/api/partners/${slug}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          eval_type: product.code,
          amount: product.priceNum,
          payment_method: paymentMethod,
          payment_proof_url: uploaded.url,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      setCreatedEmail(email);
      setStep('success');
    },
    onError: (error) => {
      setUploadError(error instanceof Error ? error.message : 'Payment submission failed');
    },
  });

  const copyPaymentValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              {product.code}
            </p>
            <h3 className="text-base font-black text-gray-900">{product.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {step === 'details' && (
          <div className="px-6 py-5">
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              {[
                ['Account Size', product.accountSize],
                ['Profit Target', product.profitTarget],
                ['Total Fee', product.price],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between mb-1 last:mb-0">
                  <span className="text-sm text-gray-500">{l}</span>
                  <span
                    className={`font-semibold text-gray-900 ${l === 'Total Fee' ? 'text-lg font-black' : 'text-sm'}`}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Adewale"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  You&apos;ll use this to access your dashboard.
                </p>
              </div>
            </div>
            {mutation.error && (
              <p className="mb-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                {(mutation.error as Error).message}
              </p>
            )}
            <button
              onClick={() => setStep('payment')}
              disabled={!name || !email}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Continue to Payment <ArrowRight size={15} />
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="px-6 py-5">
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Payment Instructions</p>
              <p className="text-xs text-amber-700">
                Pay <strong>{product.price}</strong> to FT9ja using any method below, then upload
                your receipt or transaction screenshot for FT9ja verification.
              </p>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { id: 'transfer' as const, label: 'Transfer', icon: <Banknote size={14} /> },
                { id: 'paypal' as const, label: 'PayPal', icon: <CreditCard size={14} /> },
                { id: 'crypto' as const, label: 'Crypto', icon: <Bitcoin size={14} /> },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    paymentMethod === method.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>
            <div className="space-y-3 mb-5">
              {getFt9jaPaymentRows(paymentMethod, product.price, email).map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-2 border-b border-gray-50"
                >
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                    {r.copy && (
                      <button
                        onClick={() => copyPaymentValue(r.value)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        {copied ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                Upload payment evidence
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 text-xs text-gray-500 hover:border-gray-400">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">
                    {proofFile ? proofFile.name : 'Receipt, screenshot, or transaction proof'}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-gray-900">Choose file</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    setProofFile(e.target.files?.[0] ?? null);
                    setUploadError(null);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">
                Accepted: image or PDF, up to 10MB.
              </p>
            </div>
            {(uploadError || mutation.error) && (
              <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {uploadError || (mutation.error as Error).message}
              </p>
            )}
            <button
              onClick={() => mutation.mutate()}
              disabled={!proofFile || mutation.isPending || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {mutation.isPending || uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Submitting Payment...
                </>
              ) : (
                <>Submit Payment Evidence ✓</>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="px-6 py-8 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: primary + '15' }}
            >
              <CheckCircle size={28} style={{ color: primary }} />
            </div>
            <h3 className="mb-2 text-lg font-black text-gray-900">Payment Submitted!</h3>
            <p className="mb-6 text-sm text-gray-500">
              We&apos;ll activate your account within 2 hours. Check <strong>{createdEmail}</strong>{' '}
              for confirmation.
            </p>
            <Link
              href={`/${slug}/dashboard?email=${encodeURIComponent(createdEmail)}`}
              className="mb-3 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
              onClick={onClose}
            >
              Go to My Dashboard <ArrowRight size={15} />
            </Link>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
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

// ─── TEMPLATE: MINIMAL ────────────────────────────────────────────────────────
function TemplateMinimal({
  partner,
  slug,
  onBuy,
  products,
}: {
  partner: Partner;
  slug: string;
  onBuy: (p: EvalProduct) => void;
  products: EvalProduct[];
}) {
  const primary = partner.brand_color || '#16A34A';
  const secondary = partner.secondary_color || '#F59E0B';
  return (
    <div className="min-h-screen bg-white font-inter">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.firm_name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {partner.firm_name[0]}
              </div>
            )}
            <span className="text-base font-black text-gray-900">{partner.firm_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#rules" className="hidden md:block text-sm text-gray-500 hover:text-gray-900">
              Rules
            </a>
            <a href="#faq" className="hidden md:block text-sm text-gray-500 hover:text-gray-900">
              FAQ
            </a>
            <a
              href="#contact"
              className="hidden md:block text-sm text-gray-500 hover:text-gray-900"
            >
              Contact
            </a>
            <Link href={`/${slug}/login`} className="text-sm text-gray-500 hover:text-gray-900">
              Login
            </Link>
            <a
              href="#evaluations"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Get Funded <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      <section
        className="border-b border-gray-100 py-24"
        style={{ background: `linear-gradient(135deg, ${primary}08 0%, ${secondary}08 100%)` }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <div
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: primary + '30', color: primary }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />{' '}
              Funded by FT9ja Infrastructure
            </div>
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-gray-900 md:text-5xl">
              {partner.tagline || `Trade with ${partner.firm_name}`}
            </h1>
            <p className="mb-8 text-lg text-gray-500">
              {partner.description ||
                `Pass our evaluation, get funded, keep up to 90% of your profits. ${partner.firm_name} is powered by FT9ja.`}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#evaluations"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Start Evaluation <ArrowRight size={16} />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                How It Works
              </a>
            </div>
          </div>
          <div className="mt-14 grid grid-cols-3 gap-4">
            {[
              { label: 'Active Traders', value: `${partner.total_traders}+` },
              { label: 'Profit Split', value: 'Up to 90%' },
              { label: 'Payout Time', value: '7 Days' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-5 text-center"
              >
                <div className="text-2xl font-black" style={{ color: primary }}>
                  {s.value}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Process
          </span>
          <h2 className="mt-2 mb-10 text-2xl font-black text-gray-900">How to get funded</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Buy an Evaluation',
                desc: 'Choose your account size and pay for the challenge.',
              },
              {
                step: '02',
                title: 'Pass the Challenge',
                desc: 'Hit the profit target within the rules.',
              },
              {
                step: '03',
                title: 'Get Funded',
                desc: 'Receive a live funded account. Keep up to 90% of profits.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-xl border p-6"
                style={{ borderColor: primary + '20' }}
              >
                <div className="mb-3 text-4xl font-black" style={{ color: primary + '30' }}>
                  {s.step}
                </div>
                <div className="mb-1.5 text-sm font-semibold text-gray-900">{s.title}</div>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EvalCards products={products} primary={primary} onBuy={onBuy} bg="bg-gray-50" />
      <PartnerInfoSections partner={partner} primary={primary} slug={slug} />
      <TrustStrip primary={primary} />
      <PageFooter partner={partner} primary={primary} />
    </div>
  );
}

// ─── TEMPLATE: BOLD ──────────────────────────────────────────────────────────
function TemplateBold({
  partner,
  slug,
  onBuy,
  products,
}: {
  partner: Partner;
  slug: string;
  onBuy: (p: EvalProduct) => void;
  products: EvalProduct[];
}) {
  const primary = partner.brand_color || '#16A34A';
  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Accent stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: primary }} />

      <nav className="border-b border-gray-900 bg-[#0F1117]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.firm_name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {partner.firm_name[0]}
              </div>
            )}
            <span className="text-base font-black text-white">{partner.firm_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#rules"
              className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Rules
            </a>
            <a
              href="#faq"
              className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              FAQ
            </a>
            <a
              href="#contact"
              className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Contact
            </a>
            <Link
              href={`/${slug}/login`}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Login
            </Link>
            <a
              href="#evaluations"
              className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold text-black hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Get Funded <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* Dark Hero */}
      <section className="bg-[#0F1117] py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 px-4 py-1.5 text-xs font-semibold text-gray-400">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primary }} /> Backed
              by FT9ja Infrastructure
            </div>
            <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl">
              {partner.tagline || (
                <>
                  Trade Prop.
                  <br />
                  <span style={{ color: primary }}>Get Funded.</span>
                </>
              )}
            </h1>
            <p className="mb-10 text-xl text-gray-400 max-w-xl">
              {partner.description ||
                `Pass the challenge, trade a real funded account, keep up to 90% of your profits. ${partner.firm_name} is powered by FT9ja.`}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#evaluations"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-black hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Start Your Challenge <ArrowRight size={18} />
              </a>
              <Link
                href={`/${slug}/login`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-8 py-4 text-base font-bold text-white hover:border-gray-500 transition-colors"
              >
                Trader Portal
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-3 gap-4">
            {[
              { label: 'Traders', value: `${partner.total_traders}+` },
              { label: 'Max Profit Split', value: '80%' },
              { label: 'Payout', value: '7 Days' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 text-center"
              >
                <div className="text-3xl font-black text-white mb-1" style={{ color: primary }}>
                  {s.value}
                </div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps - white bg */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: primary }}
          >
            The Process
          </div>
          <h2 className="mb-12 text-3xl font-black text-gray-900">Three steps to funded</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                title: 'Buy the Challenge',
                desc: 'Pick your account size and pay the evaluation fee.',
              },
              {
                n: 2,
                title: 'Hit Your Target',
                desc: 'Reach the profit goal while respecting the risk rules.',
              },
              {
                n: 3,
                title: 'Trade Live Capital',
                desc: 'Get a real funded account and earn up to 90% profits.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 p-7 hover:border-gray-200 transition-colors"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
                  style={{ backgroundColor: primary }}
                >
                  0{s.n}
                </div>
                <div className="mb-2 text-lg font-black text-gray-900">{s.title}</div>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EvalCards products={products} primary={primary} onBuy={onBuy} bg="bg-[#F7F7F7]" />
      <PartnerInfoSections partner={partner} primary={primary} slug={slug} />
      <TrustStrip primary={primary} dark />
      <PageFooter partner={partner} primary={primary} dark />
    </div>
  );
}

// ─── TEMPLATE: DARK ──────────────────────────────────────────────────────────
function TemplateDark({
  partner,
  slug,
  onBuy,
  products,
}: {
  partner: Partner;
  slug: string;
  onBuy: (p: EvalProduct) => void;
  products: EvalProduct[];
}) {
  const primary = partner.brand_color || '#16A34A';
  const secondary = partner.secondary_color || '#F59E0B';
  return (
    <div className="min-h-screen bg-[#080B10] font-inter">
      <nav className="border-b border-white/10 bg-[#080B10]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.firm_name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                {partner.firm_name[0]}
              </div>
            )}
            <span className="text-base font-black text-white">{partner.firm_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#rules"
              className="hidden md:block text-sm text-white/50 hover:text-white transition-colors"
            >
              Rules
            </a>
            <a
              href="#faq"
              className="hidden md:block text-sm text-white/50 hover:text-white transition-colors"
            >
              FAQ
            </a>
            <a
              href="#contact"
              className="hidden md:block text-sm text-white/50 hover:text-white transition-colors"
            >
              Contact
            </a>
            <Link
              href={`/${slug}/login`}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Login
            </Link>
            <a
              href="#evaluations"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-black hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              Get Funded <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero with glow */}
      <section className="relative overflow-hidden py-32">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${primary}, transparent)`,
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} />{' '}
            Powered by FT9ja Infrastructure
          </div>
          <h1 className="mb-6 text-5xl font-black leading-tight text-white md:text-7xl">
            {partner.tagline || (
              <>
                <span
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Elite
                </span>{' '}
                Prop Trading
              </>
            )}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/50">
            {partner.description ||
              `Join ${partner.firm_name} — trade with real capital, keep up to 90% of your profits. Backed by FT9ja.`}
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="#evaluations"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-black hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              Start Challenge <ArrowRight size={16} />
            </a>
            <Link
              href={`/${slug}/login`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-4xl px-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Traders', value: `${partner.total_traders}+` },
              { label: 'Max Profit Split', value: '80%' },
              { label: 'Avg Payout', value: '7 Days' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
              >
                <div className="text-3xl font-black mb-1" style={{ color: primary }}>
                  {s.value}
                </div>
                <div className="text-sm text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="how-it-works" className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: primary }}
          >
            The Path
          </div>
          <h2 className="mb-12 text-3xl font-black text-white">How to get funded</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Purchase an Evaluation',
                desc: 'Select your challenge tier and complete payment.',
              },
              {
                step: '02',
                title: 'Prove Your Edge',
                desc: 'Hit the profit target while managing risk.',
              },
              {
                step: '03',
                title: 'Trade Live Capital',
                desc: 'Graduate to a funded account, earn up to 90% of profits.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <div className="mb-4 text-3xl font-black text-white/10">{s.step}</div>
                <div className="mb-2 text-base font-black text-white">{s.title}</div>
                <p className="text-sm text-white/40">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evaluations */}
      <section id="evaluations" className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: primary }}
          >
            Challenges
          </div>
          <h2 className="mb-10 text-3xl font-black text-white">Choose your path</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {products.map((prod, i) => (
              <div
                key={prod.id}
                className={`rounded-2xl border p-8 ${i === 0 ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5'}`}
              >
                {i === 0 && (
                  <div
                    className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-black"
                    style={{ backgroundColor: primary }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
                  {prod.code}
                </div>
                <div className="text-lg font-semibold text-white">{prod.name}</div>
                <div className="mt-3 text-4xl font-black text-white">{prod.price}</div>
                <div className="mt-1 text-xs text-white/40">
                  Account size: <strong className="text-white/60">{prod.accountSize}</strong>
                </div>
                <div className="my-6 grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  {[
                    ['Profit', prod.profitTarget],
                    ['Drawdown', prod.maxDrawdown],
                    ['Min Days', prod.tradingDays],
                  ].map(([l, v]) => (
                    <div key={l} className="text-center">
                      <div className="text-sm font-black text-white">{v}</div>
                      <div className="text-xs text-white/40">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mb-6">
                  {prod.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs text-white/50">
                      <span className="text-white/20">—</span> {f}
                    </div>
                  ))}
                </div>
                <button
                  className="w-full rounded-xl py-3 text-sm font-bold text-black hover:opacity-90"
                  style={{
                    background:
                      i === 0 ? `linear-gradient(135deg, ${primary}, ${secondary})` : '#fff',
                  }}
                  onClick={() => onBuy(prod)}
                >
                  Buy {prod.name} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / Rules / Contact for dark template */}
      <div className="bg-[#0D1117]">
        <PartnerInfoSections partner={partner} primary={primary} slug={slug} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-2">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.firm_name}
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <div
                className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-black"
                style={{ backgroundColor: primary }}
              >
                {partner.firm_name[0]}
              </div>
            )}
            <span className="text-sm font-black text-white">{partner.firm_name}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/40">
            Powered by <span className="font-semibold text-[#16A34A]">FT9ja</span>
          </div>
          <p className="text-xs text-white/30">© 2026 {partner.firm_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function EvalCards({
  products,
  primary,
  onBuy,
  bg,
}: {
  products: EvalProduct[];
  primary: string;
  onBuy: (p: EvalProduct) => void;
  bg: string;
}) {
  return (
    <section id="evaluations" className={`border-t border-gray-100 py-20 ${bg}`}>
      <div className="mx-auto max-w-6xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Evaluations
        </span>
        <h2 className="mt-2 mb-10 text-2xl font-black text-gray-900">Choose your plan</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {products.map((prod, i) => (
            <div
              key={prod.id}
              className={`rounded-xl border-2 bg-white p-7 ${i === 0 ? 'border-gray-900' : 'border-gray-200'}`}
            >
              {i === 0 && (
                <div
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  Most Popular
                </div>
              )}
              <div className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-400">
                {prod.code}
              </div>
              <div className="text-lg font-semibold text-gray-900">{prod.name}</div>
              <div className="mt-3 text-4xl font-black text-gray-900">{prod.price}</div>
              <div className="mt-1 text-xs text-gray-400">
                Account size: <strong>{prod.accountSize}</strong>
              </div>
              <div className="my-5 grid grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                {[
                  ['Profit Target', prod.profitTarget],
                  ['Max Drawdown', prod.maxDrawdown],
                  ['Min Days', prod.tradingDays],
                ].map(([l, v]) => (
                  <div key={l} className="text-center first:border-r last:border-l border-gray-200">
                    <div className="text-sm font-black text-gray-900">{v}</div>
                    <div className="text-xs text-gray-400">{l}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mb-6">
                {prod.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-gray-400">—</span>
                    {f}
                  </div>
                ))}
              </div>
              <button
                className="w-full rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: i === 0 ? primary : '#111827' }}
                onClick={() => onBuy(prod)}
              >
                Buy {prod.name} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustStrip({ primary, dark }: { primary: string; dark?: boolean }) {
  const bg = dark ? 'bg-[#0F1117] border-gray-800' : 'bg-white border-gray-100';
  const title = dark ? 'text-white' : 'text-gray-900';
  const desc = dark ? 'text-gray-500' : 'text-gray-500';
  return (
    <section className={`border-t py-16 ${bg}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: <Shield size={20} />,
              title: 'FT9ja Backed',
              desc: "All funded accounts and payouts handled by FT9ja's regulated infrastructure.",
            },
            {
              icon: <TrendingUp size={20} />,
              title: 'Real Funding',
              desc: 'Pass the evaluation and trade a real funded account with institutional capital.',
            },
            {
              icon: <Zap size={20} />,
              title: 'Fast Payouts',
              desc: 'Withdrawal requests processed within 7 business days.',
            },
          ].map((t) => (
            <div
              key={t.title}
              className={`flex gap-4 rounded-xl border p-5 ${dark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100'}`}
            >
              <div className="shrink-0" style={{ color: primary }}>
                {t.icon}
              </div>
              <div>
                <div className={`text-sm font-semibold ${title}`}>{t.title}</div>
                <div className={`mt-1 text-xs ${desc}`}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PageFooter({
  partner,
  primary,
  dark,
}: {
  partner: Partner;
  primary: string;
  dark?: boolean;
}) {
  const bg = dark ? 'bg-[#0A0A0A] border-gray-800' : 'bg-white border-gray-200';
  const text = dark ? 'text-gray-500' : 'text-gray-400';
  const name = dark ? 'text-white' : 'text-gray-900';
  const linkHover = dark ? 'hover:text-gray-300' : 'hover:text-gray-700';
  return (
    <footer className={`border-t py-8 ${bg}`}>
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={partner.firm_name}
              className="h-6 w-6 rounded object-cover"
            />
          ) : (
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-black"
              style={{ backgroundColor: primary }}
            >
              {partner.firm_name[0]}
            </div>
          )}
          <span className={`text-sm font-black ${name}`}>{partner.firm_name}</span>
        </div>
        <div className={`flex items-center gap-4 text-xs ${text}`}>
          <a href="#faq" className={linkHover}>
            FAQ
          </a>
          <a href="#rules" className={linkHover}>
            Rules
          </a>
          <a href="#contact" className={linkHover}>
            Contact
          </a>
          <Link href={`/${partner.slug}/legal`} className={linkHover}>
            Legal
          </Link>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${text} ${dark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          Powered by <span className="font-semibold text-[#16A34A]">FT9ja</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PartnerLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [selectedProduct, setSelectedProduct] = useState<EvalProduct | null>(null);

  const {
    data: partner,
    isLoading,
    isError,
  } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-xs text-gray-400">Loading...</p>
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

  if (isError || !partner) return <NotFound slug={slug} />;
  if (partner.status === 'suspended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-black text-gray-900">{partner.firm_name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            This firm&apos;s account is currently suspended.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Visit FT9ja
          </Link>
        </div>
      </div>
    );
  }

  const primary = partner.brand_color || '#16A34A';
  const template = partner.template || 'minimal';

  const sharedModal = selectedProduct && (
    <PurchaseModal
      product={selectedProduct}
      slug={slug}
      primary={primary}
      onClose={() => setSelectedProduct(null)}
    />
  );

  if (template === 'bold')
    return (
      <>
        {sharedModal}
        <TemplateBold
          partner={partner}
          slug={slug}
          onBuy={setSelectedProduct}
          products={getProducts(partner.fee_markup)}
        />
      </>
    );
  if (template === 'dark')
    return (
      <>
        {sharedModal}
        <TemplateDark
          partner={partner}
          slug={slug}
          onBuy={setSelectedProduct}
          products={getProducts(partner.fee_markup)}
        />
      </>
    );
  return (
    <>
      {sharedModal}
      <TemplateMinimal
        partner={partner}
        slug={slug}
        onBuy={setSelectedProduct}
        products={getProducts(partner.fee_markup)}
      />
    </>
  );
}
