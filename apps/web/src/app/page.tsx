'use client';
import FT9jaLogo from '@/components/FT9jaLogo';
import { ArrowRight, CheckCircle, ChevronDown, Globe, Shield, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Revenue model:
// Partners buy at 25% off FT9ja retail.
// SS retail ₦145k → wholesale ₦108,750. SSL retail ₦49k → wholesale ₦36,750.
// Partners add their own markup on top.
// Example below uses 50% markup on wholesale price.

const stats = [
  { label: 'Monthly License Fee', value: '₦95,000', sub: '≈ $63/month' },
  { label: 'Capital at Risk', value: '₦0', sub: 'FT9ja backs all payouts' },
  { label: 'Hours to Go Live', value: '1', sub: 'From approval to launch' },
];

const earnings = [
  {
    type: 'Standard Evaluation (SS)',
    retail: '₦145,000',
    wholesale: '₦108,750',
    exampleEarning: '₦54,375',
    accountSize: '$10,000',
    color: '#16A34A',
  },
  {
    type: 'Starter Evaluation (SSL)',
    retail: '₦49,000',
    wholesale: '₦36,750',
    exampleEarning: '₦18,375',
    accountSize: '$10,000',
    color: '#F59E0B',
  },
];

const steps = [
  {
    num: '01',
    title: 'Apply & Pay the License',
    desc: 'Submit your application and pay the ₦95,000/month license fee. Setup fee is waived for the first 50 partners.',
  },
  {
    num: '02',
    title: 'Brand It Yours',
    desc: 'Pick your firm name, upload a logo, choose your brand colors, and get your own subdomain (yourfirm.ft9ja.com).',
  },
  {
    num: '03',
    title: 'Sell & Earn',
    desc: 'List your evaluations at your price. Traders pay you. FT9ja handles compliance, payouts, and infrastructure.',
  },
];

const faqs = [
  {
    q: 'Do I need trading experience to become a partner?',
    a: 'No. You need an audience — traders, students, a Telegram channel, or a YouTube community. FT9ja handles all the trading operations.',
  },
  {
    q: 'What happens when a trader passes an evaluation?',
    a: "FT9ja funds and manages the live account. You earn your markup upfront on every evaluation sold. Payouts are FT9ja's responsibility.",
  },
  {
    q: 'Can I set my own prices?',
    a: 'Yes. You purchase evaluations from FT9ja at 25% below retail (wholesale) and sell to your traders at any price you choose. Your markup is 100% yours.',
  },
  {
    q: 'How do I get paid?',
    a: 'Earnings are settled weekly to your nominated bank account. Full transparency via your partner dashboard.',
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen font-inter" style={{ backgroundColor: '#F7F4EF' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <FT9jaLogo height={36} />
            </Link>
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
              Partner Program
            </div>
          </div>
          <div className="flex items-center">
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Apply Now <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-3 py-1 text-xs font-medium text-[#16A34A]">
            <Zap size={12} />
            First 50 partners — Setup fee waived
          </div>
          <h1 className="mb-6 text-4xl font-black leading-[1.1] tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            You built the audience.
            <br />
            <span className="text-[#16A34A]">Own the firm.</span>
          </h1>
          <p className="mb-10 max-w-xl text-base text-gray-500 sm:text-lg">
            Launch your own prop trading firm in{' '}
            <strong className="text-gray-800">hours (not months)</strong>. FT9ja handles funding,
            payouts, and compliance. You brand it, you sell it, you keep the markup.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/apply"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111827] px-6 py-3.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Start Your Firm <ArrowRight size={16} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            >
              See How It Works
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:mt-16">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="text-3xl font-black tracking-tight text-gray-900">{s.value}</div>
              <div className="mt-1 text-sm font-semibold text-gray-700">{s.label}</div>
              <div className="mt-0.5 text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What you earn */}
      <section className="border-t border-gray-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Revenue Model
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              What you earn on every sale
            </h2>
            <p className="mt-3 text-gray-500 text-sm sm:text-base">
              Partners buy at <strong className="text-gray-800">25% below retail</strong>{' '}
              (wholesale). Add your own markup on top — 100% of it is yours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {earnings.map((e) => (
              <div
                key={e.type}
                className="rounded-xl border border-gray-200 p-6 hover:border-gray-300"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    {e.type}
                  </div>
                  <div className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                    {e.accountSize} account
                  </div>
                </div>
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">FT9ja Retail Price</span>
                    <span className="text-base font-bold text-gray-300 line-through">
                      {e.retail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Your Wholesale (25% off)
                    </span>
                    <span className="text-lg font-black text-gray-700">{e.wholesale}</span>
                  </div>
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: `${e.color}10`, border: `1px solid ${e.color}30` }}
                  >
                    <span className="text-xs font-semibold text-gray-700">
                      Your earnings at 50% markup
                    </span>
                    <span className="text-2xl font-black" style={{ color: e.color }}>
                      {e.exampleEarning}
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                  Set your own markup — higher markup = more per sale. 100% yours to keep.
                </div>
              </div>
            ))}
          </div>

          {/* Revenue at scale — 100 traders, 50% markup, SS */}
          {/* 100 × ₦54,375 = ₦5.4375M/week → Monthly ₦21.75M, Yearly ₦261M */}
          <div className="mt-8 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 p-5 sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Revenue at scale</div>
                <div className="mt-1 text-xs text-gray-500">
                  100 traders/week · SS · 50% markup example
                </div>
              </div>
              <div className="flex gap-10 sm:gap-14">
                <div>
                  <div className="text-xs text-gray-400">Monthly Gross</div>
                  <div className="text-2xl font-black text-gray-900 sm:text-3xl">₦21.75M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Yearly Gross</div>
                  <div className="text-2xl font-black sm:text-3xl" style={{ color: '#16A34A' }}>
                    ₦261M
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ backgroundColor: '#F7F4EF' }} className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Process
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="relative rounded-xl border border-gray-200 bg-white p-6"
              >
                {i < steps.length - 1 && (
                  <div className="absolute -right-3 top-8 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white md:flex">
                    <ArrowRight size={12} className="text-gray-400" />
                  </div>
                )}
                <div className="mb-4 text-4xl font-black text-gray-100">{step.num}</div>
                <div className="mb-2 text-base font-semibold text-gray-900">{step.title}</div>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Pricing
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Simple, flat-rate access
              </h2>
              <p className="mt-3 text-gray-500 text-sm sm:text-base">
                No revenue share. No hidden fees. One monthly license, full access to FT9ja
                infrastructure, and 25% off all evaluation prices.
              </p>

              <div className="mt-8 rounded-xl border border-gray-200 p-6">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-gray-900 sm:text-5xl">₦95,000</span>
                  <span className="mb-1 text-sm text-gray-400">/month</span>
                </div>
                <div className="mt-1 text-sm text-gray-400">≈ $63/month · Billed monthly</div>
                <div className="mt-6 space-y-3">
                  {[
                    'Your own branded subdomain',
                    'Unlimited trader evaluations',
                    'Partner dashboard & analytics',
                    'FT9ja handles all payouts',
                    'Setup fee waived (first 50 partners)',
                    'Onboarding support included',
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#16A34A]" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* Wholesale price reference */}
                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Wholesale Price Reference (25% off)
                  </div>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: 'Standard (SS) — $10k account',
                        retail: '₦145,000',
                        wholesale: '₦108,750',
                      },
                      {
                        label: 'Starter (SSL) — $10k account',
                        retail: '₦49,000',
                        wholesale: '₦36,750',
                      },
                    ].map((p) => (
                      <div key={p.label}>
                        <div className="text-xs font-medium text-gray-500 mb-1">{p.label}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-300 line-through">{p.retail}</span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-sm font-black text-[#16A34A]">{p.wholesale}</span>
                          <span className="rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-xs font-semibold text-[#16A34A]">
                            25% off
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Add your own markup on top — you keep 100% of it.
                  </p>
                </div>

                <Link
                  href="/apply"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Apply for a Spot <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Payment Methods
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Pay your way
              </h2>
              <p className="mt-3 text-gray-500 text-sm sm:text-base">
                We accept multiple payment methods to remove friction from getting started.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    method: 'Bank Transfer (Zenith Bank)',
                    detail:
                      'Pay Asokoro Technologies, Zenith Bank, 1217002454. Upload proof of payment in your application.',
                    icon: '🏦',
                  },
                  {
                    method: 'PayPal',
                    detail:
                      'Send payment to https://www.paypal.me/ft9ja. Include your application reference in the note.',
                    icon: '💳',
                  },
                  {
                    method: 'Cryptocurrency (BTC)',
                    detail:
                      'Pay with BTC to 3CLFanKRsufL2hrMmFuBMQAGVDmThr4RPa and upload your transaction receipt or hash in your application.',
                    icon: '₿',
                  },
                ].map((p) => (
                  <div
                    key={p.method}
                    className="flex gap-4 rounded-xl border border-gray-200 p-4 hover:border-gray-300"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-lg">
                      {p.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{p.method}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{p.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What FT9ja handles */}
      <section style={{ backgroundColor: '#F7F4EF' }} className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Infrastructure
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Everything FT9ja handles for you
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: <Shield size={20} />,
                title: 'Trader Funding',
                desc: 'FT9ja funds all passed accounts. Zero capital risk on your end.',
              },
              {
                icon: <TrendingUp size={20} />,
                title: 'Payout Processing',
                desc: 'Profit splits handled by FT9ja. Partners never touch trader payouts.',
              },
              {
                icon: <Globe size={20} />,
                title: 'Branded Subdomain',
                desc: 'yourfirm.ft9ja.com — live in hours, not months.',
              },
              {
                icon: <Zap size={20} />,
                title: 'Evaluation Engine',
                desc: 'Rules, metrics, and tracking all pre-built by FT9ja.',
              },
              {
                icon: <CheckCircle size={20} />,
                title: 'Compliance Layer',
                desc: 'KYC, AML, and reporting handled at the FT9ja level.',
              },
              {
                icon: <TrendingUp size={20} />,
                title: 'Partner Analytics',
                desc: 'Real-time revenue, trader counts, and conversion data.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300"
              >
                <div className="mb-3 text-[#16A34A]">{item.icon}</div>
                <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                <div className="mt-1 text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-10 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              FAQ
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Common questions
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left gap-3"
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[#111827] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
            Ready to own your firm?
          </h2>
          <p className="mt-4 text-gray-400 text-sm sm:text-base">
            Fewer than 50 spots available at waived setup fee. Apply today.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Apply for Partnership <ArrowRight size={16} />
            </Link>
            <Link
              href="/apexfunds"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-7 py-3.5 text-sm font-semibold text-white hover:border-white/40"
            >
              See a live example
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <FT9jaLogo height={32} />
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
              <Link href="/guide/partner" className="hover:text-gray-700">
                Partner Guide
              </Link>
              <Link href="/guide" className="hover:text-gray-700">
                Trader Guide
              </Link>
              <Link href="/legal" className="hover:text-gray-700">
                Legal
              </Link>
              <Link href="/apply" className="hover:text-gray-700">
                Apply
              </Link>
              <span>accounts@ft9ja.com</span>
            </div>
            <div className="text-xs text-gray-400">© 2026 FT9ja. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
