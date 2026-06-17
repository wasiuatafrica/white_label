'use client';
import FT9jaLogo from '@/components/FT9jaLogo';
import {
    AlertCircle,
    ArrowRight,
    Banknote,
    BarChart3,
    BookOpen,
    CheckCircle,
    ChevronDown,
    Clock,
    DollarSign,
    Globe,
    Settings,
    Shield,
    Star,
    TrendingUp,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type FAQ = { q: string; a: string };
type Section = { id: string; icon: React.ReactNode; title: string; color: string; faqs: FAQ[] };

const sections: Section[] = [
  {
    id: 'getting-started',
    icon: <Zap size={18} />,
    title: 'Getting Started',
    color: '#16A34A',
    faqs: [
      {
        q: 'What exactly is the FT9ja Partner Program?',
        a: 'The FT9ja Partner Program lets you launch a fully branded prop trading firm under your own name in under 1 hour — without building infrastructure, handling payouts, or managing compliance. You pay a monthly license fee (₦95,000), brand the firm as yours, and earn 100% of your markup on every evaluation sold.',
      },
      {
        q: 'Who is this for?',
        a: "This is ideal for: trading educators with a YouTube/Telegram/community audience, influencers in the forex/crypto space, trading coaches and signal providers, or anyone with a network of traders. You don't need trading infrastructure — you need an audience and ambition.",
      },
      {
        q: 'How fast can I go live?',
        a: 'Within 1 hour of approval and payment. You receive your subdomain (yourfirm.ft9ja.com), access to your partner dashboard, and a fully branded landing page. Configure your colors, logo, and tagline — then you are ready to sell.',
      },
      {
        q: 'Do I need any technical skills?',
        a: 'Zero. Everything is point-and-click. Your dashboard handles branding, trader management, evaluation activation, payout tracking, and analytics. No coding, no servers, no compliance headaches.',
      },
      {
        q: 'What is the difference between FT9ja and my branded firm?',
        a: 'FT9ja is the infrastructure layer — we handle capital, funded accounts, compliance, and payouts. Your branded firm is the front end — the name, logo, pricing, and customer relationships all belong to you. Traders see your brand, not FT9ja.',
      },
    ],
  },
  {
    id: 'revenue',
    icon: <DollarSign size={18} />,
    title: 'Revenue & Earnings',
    color: '#F59E0B',
    faqs: [
      {
        q: 'How exactly do I make money?',
        a: 'FT9ja gives partners 25% off the retail price (wholesale pricing). You then add your own markup and sell to traders at your retail price. Every naira above your wholesale cost is 100% yours. Example: SS retail ₦145,000 → you buy at ₦108,750 (25% off). Add 50% markup → earn ₦54,375 per sale.',
      },
      {
        q: 'What are the wholesale prices?',
        a: 'Standard Evaluation (SS) — $10,000 account, 25% evaluation to qualify for Aso (up to 90% split): FT9ja retail ₦145,000, your wholesale ₦108,750 (25% off). Starter Evaluation (SSL) — $10,000 account, no evaluation, talent bonus payouts only: FT9ja retail ₦49,000, your wholesale ₦36,750 (25% off). You set your own retail price — your markup is 100% yours.',
      },
      {
        q: 'Is there a revenue share or commission to FT9ja?',
        a: 'No. Zero revenue share. You pay a flat ₦95,000/month license and keep 100% of your markup. If you sell 50 evaluations a month at ₦30,000 markup, you keep all ₦1,500,000 of that — FT9ja does not take a cut.',
      },
      {
        q: 'How realistic are the earnings?',
        a: 'At 50% markup on SS: earn ₦54,375/eval. 3/week = ₦652,500/month. 10/week = ₦2.175M/month. 25/week = ₦5.4M/month. After the ₦95K license fee, top partners earn ₦1M–₦5M+/month net with a strong audience.',
      },
      {
        q: 'When and how do I receive my earnings?',
        a: 'Your earnings accumulate in your partner dashboard as traders pay and evaluations are activated. Request a payout anytime through the Payouts tab — provide your bank details and FT9ja processes it within 24–48 hours.',
      },
      {
        q: "Is the license fee refundable if I don't make sales?",
        a: 'The monthly license fee is non-refundable. However, the first month is typically enough to make multiple sales if you have an existing audience. We offer full onboarding support to help you hit the ground running.',
      },
    ],
  },
  {
    id: 'operations',
    icon: <Settings size={18} />,
    title: 'Running Your Firm',
    color: '#2563EB',
    faqs: [
      {
        q: "How do I activate a trader's evaluation?",
        a: 'When a trader pays their evaluation fee, they appear in your partner dashboard under Payments with a Pending status. Once you confirm their bank transfer, click Activate on their evaluation. FT9ja automatically provisions their trading account within 2 hours.',
      },
      {
        q: 'Do I handle payouts to traders?',
        a: 'No. Funded account payouts to successful traders are handled entirely by FT9ja. Your job is to sell evaluations and confirm payments. FT9ja manages the rest — account provisioning, trading infrastructure, and profit payouts.',
      },
      {
        q: 'What happens when a trader passes their evaluation?',
        a: 'For SS: when a trader grows their account to 25% without breaching drawdown rules, they qualify for an Aso funded account (up to 90% profit split). FT9ja provisions the Aso account and you see the status in your dashboard. For SSL: there is no evaluation or Aso account — traders earn talent bonus payouts (5% weekly / 15% monthly) on profits. You have already earned your markup on the purchase fee either way.',
      },
      {
        q: 'Can I have multiple evaluation types and pricing?',
        a: 'Yes. You offer both Standard (SS) and Starter (SSL). SS is a one-step 25% evaluation leading to an Aso account. SSL has no evaluation or profit target and pays talent bonuses only. Both use $10,000 accounts with 5% daily and 10% max drawdown. You set one markup amount across both tiers in Settings.',
      },
      {
        q: 'Can I add traders manually to my system?',
        a: 'Yes. In your partner dashboard under Traders, you can manually add traders by name and email. This is useful if traders pay you directly and need to be registered in the system.',
      },
    ],
  },
  {
    id: 'branding',
    icon: <Globe size={18} />,
    title: 'Branding & Customisation',
    color: '#7C3AED',
    faqs: [
      {
        q: "How much can I customise my firm's branding?",
        a: 'Almost everything: firm name, logo, brand colors (primary + accent), tagline, description, and landing page template (minimal, bold, or dark). Your subdomain is yourfirmname.ft9ja.com. Traders only see your brand. Your landing page shows accurate SS/SSL rules sourced from FT9ja pricing — including the 25% SS evaluation path and SSL talent-bonus model.',
      },
      {
        q: 'Can I generate a logo with AI?',
        a: "Yes. Your partner dashboard includes an AI logo generator — enter your firm name, pick a style (modern, bold, elegant), and generate multiple logo options instantly. Select one and it's live on your landing page immediately.",
      },
      {
        q: 'What does my trader-facing landing page look like?',
        a: "Your landing page shows your logo, tagline, evaluation packages with your pricing, how it works, rules comparison (SS vs SSL), payment instructions, and a login portal for traders. It's clean, professional, and conversion-optimised.",
      },
    ],
  },
  {
    id: 'compliance',
    icon: <Shield size={18} />,
    title: 'Compliance & Legal',
    color: '#DC2626',
    faqs: [
      {
        q: 'Do I need a financial license to operate?',
        a: 'FT9ja partners operate as marketing affiliates and resellers of evaluation services — not as brokers or investment managers. This structure does not require a financial services license in Nigeria. Always verify the latest regulations in your jurisdiction.',
      },
      {
        q: 'Are there prohibited practices?',
        a: 'Yes. You cannot: guarantee trading profits, accept client funds for investment purposes, represent yourself as a regulated broker, or engage in misleading advertising. FT9ja monitors partner landing pages and reserves the right to suspend non-compliant partners.',
      },
      {
        q: 'Who is responsible if a trader loses money?',
        a: 'During evaluations, traders are on demo/simulated accounts. There are no real losses beyond the evaluation fee. On funded accounts, FT9ja bears the capital risk. Partners are not liable for trading losses.',
      },
    ],
  },
  {
    id: 'analytics',
    icon: <BarChart3 size={18} />,
    title: 'Dashboard & Analytics',
    color: '#0891B2',
    faqs: [
      {
        q: 'What data can I see in my partner dashboard?',
        a: 'Your dashboard shows: total traders, active evaluations, passed/failed rates, revenue collected, your earnings, monthly revenue chart, evaluation type breakdown, top traders, KYC pipeline status, and payout request history.',
      },
      {
        q: 'How do I track my earnings?',
        a: 'The Payouts tab shows your total earned (markup × confirmed evaluations), total paid out, and available balance. You can request a payout at any time when your balance is positive.',
      },
      {
        q: 'Can I see which traders have passed or failed?',
        a: 'Yes. The Traders tab shows each trader, their evaluation count, KYC status, and active evaluation status. The Analytics tab shows pass rates, evaluation breakdowns by type, and your trader leaderboard.',
      },
    ],
  },
];

function AccordionItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors gap-3"
      >
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <ChevronDown
          size={16}
          className={`mt-0.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function PartnerGuidePage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpenItems((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-3">
            <FT9jaLogo height={36} />
            <span className="hidden sm:block text-sm text-gray-400">/</span>
            <span className="hidden sm:block text-sm font-semibold text-gray-700">
              Partner Guide
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/guide"
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900"
            >
              Trader Guide
            </Link>
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
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[#16A34A]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#16A34A]">
              Partner Guide
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl md:text-5xl mb-4">
            Launch Your Prop Firm.
            <br />
            <span className="text-[#16A34A]">Everything You Need to Know.</span>
          </h1>
          <p className="text-base text-gray-500 max-w-xl sm:text-lg">
            From setup to your first sale — a complete guide to running a profitable FT9ja partner
            firm. Go live in <strong className="text-gray-800">hours (not months)</strong>.
          </p>

          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Time to Go Live', value: '1 hour', icon: <Clock size={14} /> },
              { label: 'Monthly License', value: '₦95K', icon: <Banknote size={14} /> },
              { label: 'Revenue Share', value: '0%', icon: <TrendingUp size={14} /> },
              { label: 'Markup Yours', value: '100%', icon: <Star size={14} /> },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-1.5 text-[#16A34A] mb-1.5">
                  {s.icon}
                  <span className="text-xs font-medium text-gray-400">{s.label}</span>
                </div>
                <div className="text-xl font-black text-gray-900">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Quick nav */}
          <div className="mt-6 flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                <span style={{ color: s.color }}>{s.icon}</span> {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Steps banner */}
      <div className="border-b border-gray-200 bg-[#111827] py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            How it works in 3 steps
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Apply & Pay License',
                desc: 'Submit application, pay ₦95K/month license. Setup fee waived for first 50 partners.',
                icon: '📝',
              },
              {
                step: '02',
                title: 'Brand Your Firm',
                desc: 'Set your name, logo, colors, subdomain. Your landing page is live in minutes.',
                icon: '🎨',
              },
              {
                step: '03',
                title: 'Sell & Earn',
                desc: 'Share your link. Traders pay you. You activate evaluations. Keep 100% markup.',
                icon: '💰',
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className="relative rounded-xl border border-white/10 bg-white/5 p-5"
              >
                {i < 2 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden sm:flex text-gray-600 text-lg">
                    →
                  </div>
                )}
                <div className="mb-2 text-3xl">{s.icon}</div>
                <div className="text-xs font-bold text-gray-500 mb-1">Step {s.step}</div>
                <div className="text-sm font-semibold text-white mb-1">{s.title}</div>
                <div className="text-xs text-gray-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wholesale & Earnings Reference */}
      <div className="border-b border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16A34A]/10 text-[#16A34A]">
              <DollarSign size={18} />
            </div>
            <h2 className="text-xl font-black text-gray-900">Wholesale Pricing & Earnings</h2>
          </div>
          {/* Wholesale prices */}
          <div className="mb-6 rounded-2xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Partner Wholesale (25% off FT9ja retail)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">
                      Product
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      Account
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      FT9ja Retail
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      Your Wholesale
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      At 50% markup earn
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    {
                      name: 'Standard (SS)',
                      size: '$10,000',
                      retail: '₦145,000',
                      wholesale: '₦108,750',
                      earn: '₦54,375',
                    },
                    {
                      name: 'Starter (SSL)',
                      size: '$10,000',
                      retail: '₦49,000',
                      wholesale: '₦36,750',
                      earn: '₦18,375',
                    },
                  ].map((r) => (
                    <tr key={r.name}>
                      <td className="px-5 py-3 font-semibold text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.size}</td>
                      <td className="px-4 py-3 text-center text-gray-300 line-through font-medium">
                        {r.retail}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-gray-800">
                        {r.wholesale}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-[#16A34A]">{r.earn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 bg-[#16A34A]/5 px-5 py-3">
              <p className="text-xs text-[#16A34A] font-medium">
                Set any markup above wholesale — 100% of the difference is yours to keep.
              </p>
            </div>
          </div>

          {/* Product rules reference */}
          <div className="mb-6 rounded-2xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                What you are selling — FT9ja rules (per ft9ja.com/pricing)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">
                      Rule
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900">
                      Standard (SS)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900">
                      Starter (SSL)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Account size', '$10,000', '$10,000'],
                    ['Evaluation', '25% profit target', 'No evaluation'],
                    ['Aso funded account', 'Yes (up to 90% split)', 'No'],
                    ['Talent bonus', 'Up to 15% of profit target', '5% weekly / 15% monthly'],
                    ['Max drawdown', '10%', '10%'],
                    ['Daily drawdown', '5%', '5%'],
                    ['Min trading days', '10/mo, 2/week', '10/mo, 2/week'],
                    ['Expert advisors', 'Allowed', 'Allowed'],
                    ['Second chance', 'No', 'No'],
                    ['Broker', 'Deriv', 'Deriv'],
                  ].map(([rule, ss, ssl]) => (
                    <tr key={rule}>
                      <td className="px-5 py-3 text-xs font-medium text-gray-500">{rule}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {ss}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {ssl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly earnings table */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Monthly Earnings by Scale (SS at 50% markup = ₦54,375/eval)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">
                      Traders/week
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      Monthly Gross
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">
                      Yearly Gross
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { t: 10, monthly: '₦2.175M', yearly: '₦26.1M' },
                    { t: 25, monthly: '₦5.44M', yearly: '₦65.25M' },
                    { t: 50, monthly: '₦10.875M', yearly: '₦130.5M' },
                    { t: 100, monthly: '₦21.75M', yearly: '₦261M' },
                  ].map((r) => (
                    <tr key={r.t}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.t}/week</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">{r.monthly}</td>
                      <td className="px-4 py-3 text-center font-black text-[#16A34A]">
                        {r.yearly}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 bg-amber-50 px-5 py-3">
              <p className="text-xs text-amber-700">
                <AlertCircle size={11} className="inline mr-1" />
                Before deducting ₦95K monthly license fee. Figures based on SS evaluations at 50%
                markup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-12">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white"
                style={{ color: section.color }}
              >
                {section.icon}
              </div>
              <h2 className="text-xl font-black text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  isOpen={!!openItems[`${section.id}-${i}`]}
                  onToggle={() => toggle(`${section.id}-${i}`)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Launch checklist */}
        <section>
          <div className="rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/5 p-6 sm:p-8">
            <h2 className="mb-5 text-xl font-black text-gray-900">Partner Launch Checklist</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                'Submit partner application at ft9ja.com/apply',
                'Pay ₦95,000 monthly license fee',
                'Receive approval email within 24 hours',
                'Log in to your partner dashboard',
                'Set firm name, logo, tagline, and colors',
                'Set your evaluation markup in Settings',
                'Share your branded link with your audience',
                'Activate trader evaluations as payments come in',
                'Request payout when balance is available',
                'Monitor analytics to optimize your sales',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#16A34A]" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-[#111827] p-8 text-center">
          <h3 className="text-xl font-black text-white mb-2">Ready to launch your firm?</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Join the FT9ja Partner Program. Go live in 1 hour. Start earning from day one.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Apply Now <ArrowRight size={14} />
            </Link>
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
            >
              Read Partner Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col items-center justify-between gap-4 md:flex-row">
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
          <p className="text-xs text-gray-400">© 2026 FT9ja. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
