'use client';
import {
  FT9JA_LEGAL_EVALUATION_RULES,
} from '@/lib/ft9ja-support-content';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

type Partner = {
  slug: string;
  firm_name: string;
  brand_color: string;
  logo_url: string | null;
  logo_display_url?: string | null;
  owner_email: string;
};

export default function PartnerLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: partner, isLoading } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const primary = partner?.brand_color || '#16A34A';
  const firmName = partner?.firm_name || slug;

  const sections = [
    {
      id: 'terms',
      title: 'Terms of Service',
      content: [
        {
          heading: '1. Acceptance',
          text: `By purchasing an evaluation or creating a trader account with ${firmName}, you agree to these terms in full. ${firmName} is a partner of FT9ja and operates under FT9ja's infrastructure and compliance framework.`,
        },
        {
          heading: '2. Evaluation Services',
          text: `${firmName} offers proprietary trading evaluations powered by FT9ja. Evaluation accounts are simulated environments with real market data. All evaluation fees are non-refundable once your account has been activated.`,
        },
        {
          heading: '3. Funded Accounts',
          text: `Traders who pass the evaluation may receive a live funded account. Funded accounts are subject to ongoing risk rules (maximum drawdown, daily loss limits). Breach of risk parameters results in immediate account termination. Funded accounts are managed and backed by FT9ja.`,
        },
        {
          heading: '4. Profit Sharing',
          text: `Funded traders receive up to 90% of net profits. All profit distributions are processed by FT9ja on behalf of ${firmName}. Profits are your income and you are responsible for applicable taxes in your jurisdiction.`,
        },
        {
          heading: '5. Prohibited Activities',
          text: 'Strictly prohibited: account collusion, exploiting platform errors, providing false information, copy trading from other funded accounts, and any form of market manipulation. Violation results in immediate account termination with no refund.',
        },
        {
          heading: '6. Governing Law',
          text: `These terms are governed by the laws of the Federal Republic of Nigeria. The relationship between ${firmName} and its traders is facilitated through Asokoro Technologies. Any disputes are subject to FT9ja's dispute resolution process.`,
        },
      ],
    },
    {
      id: 'rules',
      title: 'Evaluation Rules',
      content: FT9JA_LEGAL_EVALUATION_RULES,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      content: [
        {
          heading: 'Data We Collect',
          text: `${firmName} and FT9ja collect: your name, email address, payment information, and trading activity data. This information is used to manage your account, process payments, and provide trading services.`,
        },
        {
          heading: 'Data Sharing',
          text: `Your data is shared between ${firmName} and FT9ja to operate the evaluation and funded account services. Neither party sells your personal data. Data may be shared with payment processors and regulatory authorities as required.`,
        },
        {
          heading: 'Data Retention',
          text: 'Financial and trading records are retained for a minimum of 7 years in compliance with Nigerian financial regulations. You may request a copy of your data or deletion of non-essential records by contacting us.',
        },
        {
          heading: 'Your Rights',
          text: 'You have the right to access, correct, and request deletion of your personal data where legally permissible. Contact us at the email below to exercise your data rights.',
        },
      ],
    },
    {
      id: 'risk',
      title: 'Risk Disclaimer',
      content: [
        {
          heading: 'Trading Involves Risk',
          text: 'Trading financial instruments involves substantial risk of loss. Past performance is not indicative of future results. Only trade with capital (evaluation fees) you can afford to lose. Evaluations are not suitable for everyone.',
        },
        {
          heading: 'No Financial Advice',
          text: `Nothing communicated by ${firmName} or FT9ja constitutes financial advice or a recommendation to trade. All content is for informational purposes only. Consult an independent financial advisor before making trading decisions.`,
        },
        {
          heading: 'Evaluation Fees',
          text: 'Evaluation fees are non-refundable. There is no guarantee of passing any evaluation or receiving a funded account. Your success depends entirely on your trading performance and risk management.',
        },
        {
          heading: 'Prop Trading Nature',
          text: `${firmName} is a prop trading brand operating on FT9ja infrastructure. It is not a licensed broker, bank, or investment firm. Evaluation accounts are proprietary products, not regulated brokerage or savings accounts.`,
        },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <div
          className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-gray-600"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
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

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${slug}`} className="flex items-center gap-2">
            {partner?.logo_url ? (
              <img
                src={partner.logo_display_url ?? partner.logo_url}
                alt={firmName}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
            )}
            <span className="text-sm font-black text-gray-900">{firmName}</span>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm font-semibold text-gray-700">Legal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/${slug}/login`} className="text-sm text-gray-500 hover:text-gray-900">
              Trader Login
            </Link>
            <Link
              href={`/${slug}#evaluations`}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Get Funded <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Legal Documentation
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            {firmName} — Legal & Terms
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            {firmName} operates on FT9ja infrastructure. The following terms govern your use of our
            evaluation and funded account services. Last updated June 2026.
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h2 className="text-base font-black text-gray-900">{section.title}</h2>
              </div>
              <div className="divide-y divide-gray-50 px-6">
                {section.content.map((item) => (
                  <div key={item.heading} className="py-4">
                    <h3 className="mb-1.5 text-sm font-semibold text-gray-900">{item.heading}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-2 text-base font-semibold text-gray-900">Contact & Support</h3>
          <p className="mb-4 text-sm text-gray-500">
            For questions about these terms, your evaluation, or account issues, contact {firmName}{' '}
            directly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {partner?.owner_email && (
              <a
                href={`mailto:${partner.owner_email}`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                {partner.owner_email}
              </a>
            )}
            <a
              href="mailto:accounts@ft9ja.com"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              FT9ja Support
            </a>
          </div>
        </div>

        {/* FT9ja link */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700">{firmName} is Powered by FT9ja</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Full FT9ja Terms, Privacy Policy, and Risk Disclosures also apply.
            </p>
          </div>
          <Link
            href="/legal"
            className="text-xs font-semibold text-[#16A34A] hover:underline whitespace-nowrap"
          >
            View FT9ja Legal →
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 {firmName}. Powered by Asokoro Technologies, Lagos, Nigeria. All rights reserved.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-4">
        <div className="mx-auto max-w-5xl px-6 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-2">
            {partner?.logo_url ? (
              <img src={partner.logo_display_url ?? partner.logo_url} alt={firmName} className="h-5 w-5 rounded object-cover" />
            ) : (
              <div
                className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-black"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
            )}
            <span className="text-sm font-black text-gray-900">{firmName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href={`/${slug}`} className="hover:text-gray-700">
              Home
            </Link>
            <Link href={`/${slug}/login`} className="hover:text-gray-700">
              Trader Login
            </Link>
            <Link
              href={`/${slug}/legal`}
              className="hover:text-gray-700 font-semibold text-gray-600"
            >
              Legal
            </Link>
            <Link href="/legal" className="hover:text-gray-700">
              FT9ja Legal
            </Link>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-gray-400">
            Powered by <span className="font-semibold text-[#16A34A] ml-1">FT9ja</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
