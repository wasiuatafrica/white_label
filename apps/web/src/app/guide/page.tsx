'use client';
import FT9jaLogo from '@/components/FT9jaLogo';
import {
    AlertCircle,
    ArrowRight,
    BookOpen,
    CheckCircle,
    ChevronDown,
    Shield,
    TrendingUp,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const sections = [
  {
    id: 'getting-started',
    icon: <Zap size={18} />,
    title: 'Getting Started',
    faqs: [
      {
        q: 'What is a prop trading firm?',
        a: "A proprietary (prop) trading firm provides traders with capital to trade financial markets. Instead of risking your own money, you trade the firm's capital and keep a share of the profits — up to 90% on FT9ja. Standard (SS) accounts require a one-step evaluation; Starter (SSL) accounts have no evaluation and pay talent bonuses instead.",
      },
      {
        q: 'What is an evaluation / challenge?',
        a: 'Standard (SS) is a one-step evaluation on a $10,000 account: grow the account to 25% while staying within drawdown and daily loss rules, then qualify for an Aso funded account. Starter (SSL) has no evaluation or profit target — you trade for talent bonus payouts (5% weekly or 15% monthly) with no path to an Aso account.',
      },
      {
        q: 'Do I need experience to start?',
        a: "You need solid trading knowledge and a proven strategy. This is not a beginner product — evaluations require consistent risk management and discipline. If you're new to trading, practice on a demo account first.",
      },
      {
        q: 'What markets can I trade?',
        a: 'SS and SSL synthetic accounts trade on Deriv and focus on synthetic indices. Depending on your partner firm, you may also have access to volatility indices and related instruments. Check your account details after purchase for the exact instrument list.',
      },
      {
        q: 'How long does it take to get funded?',
        a: 'Account credentials are typically issued within 24 hours of purchase. For SS, there is no time limit to reach the 25% profit target — you qualify for an Aso funded account once you hit 25% without breaching drawdown rules. SSL does not lead to a funded Aso account.',
      },
    ],
  },
  {
    id: 'evaluation-rules',
    icon: <Shield size={18} />,
    title: 'Evaluation Rules',
    faqs: [
      {
        q: 'What is the profit target?',
        a: 'Standard (SS): grow your $10,000 account to 25% ($2,500 profit) to qualify for an Aso funded account. There is no time limit. Starter (SSL): no profit target and no evaluation — you earn talent bonuses on profits made instead of working toward an Aso account.',
      },
      {
        q: 'What is maximum drawdown?',
        a: 'Both SS and SSL allow a maximum overall account drawdown of 10% ($1,000 on a $10,000 account). Drawdown is measured from your highest equity peak using balance and/or equity. Breaching this limit fails the account.',
      },
      {
        q: 'What is the daily loss limit?',
        a: 'Both SS and SSL have a 5% daily drawdown limit ($500 on a $10,000 account). Daily drawdown is recalculated each trading day from your starting balance/equity at 00:00 WAT. Exceeding the daily limit fails the account.',
      },
      {
        q: 'What are minimum trading days?',
        a: 'Both account types require trading on at least 2 days per week and 10 separate days per month. A trading day counts when you open and close at least one position. Accounts become ineligible for payout after two consecutive weeks of inactivity.',
      },
      {
        q: 'Is there a time limit?',
        a: 'No. FT9ja SS and SSL accounts have no time limit to reach profit targets or earn payouts. You trade at your own pace as long as you stay within drawdown and minimum activity rules.',
      },
      {
        q: 'Are Expert Advisors (EAs) and bots allowed?',
        a: 'Expert Advisors and trading signals are allowed on both SS and SSL accounts. Copy trading between FT9ja accounts is strictly prohibited. Positions held for less than 5 minutes are not allowed.',
      },
      {
        q: 'Is news trading allowed?',
        a: 'News trading is allowed on both Standard (SS) and Starter (SSL) synthetic accounts. You must still follow all other trading conduct rules, including drawdown limits and the minimum hold-time rule.',
      },
    ],
  },
  {
    id: 'funded-account',
    icon: <TrendingUp size={18} />,
    title: 'Funded Account & Payouts',
    faqs: [
      {
        q: 'What happens when I pass the evaluation?',
        a: 'For SS: once you grow your account to 25% without breaching drawdown rules, you qualify for an Aso funded account with up to 90% profit split. Your partner firm and FT9ja will provision access. SSL has no evaluation stage and does not lead to an Aso account — traders earn talent bonus payouts on profits instead.',
      },
      {
        q: 'What is the profit split?',
        a: 'SS traders who qualify for an Aso account receive up to 90% of profits. The exact split tier depends on how quickly you qualify (90% within 4 weeks, 60% within 5–8 weeks, 40% after 8 weeks). SSL traders do not receive an Aso profit split — they earn a talent bonus of 5% weekly or 15% monthly on profits made.',
      },
      {
        q: 'What is the talent bonus?',
        a: 'During the SS evaluation (before Aso), you can earn up to 15% of the profit target as a talent bonus. On SSL, talent bonus is 5% of weekly profits or 15% of monthly profits. You are eligible for your first payout after at least 10 trading days.',
      },
      {
        q: 'How do I request a payout?',
        a: 'Payouts are requested through your trader dashboard or partner firm. FT9ja processes payouts on Fridays. Submit your request with your preferred payment method (bank transfer or PayPal). Your partner firm can confirm supported methods and any minimum amounts.',
      },
      {
        q: 'Are the same risk rules in effect on the funded account?',
        a: 'Yes. Aso funded accounts keep drawdown and daily loss rules active. SS and SSL evaluation accounts also have no second-chance option — if you breach rules, the account fails. Classic FT9ja accounts offer a free second chance; synthetic SS/SSL accounts do not.',
      },
      {
        q: 'Can I scale my funded account?',
        a: 'Yes. FT9ja partners offer scaling plans for consistently profitable traders. After demonstrating sustained profitability, you may be eligible for increased capital — up to $100,000 or more. Ask your partner firm about their scaling policy.',
      },
    ],
  },
  {
    id: 'payments',
    icon: <CheckCircle size={18} />,
    title: 'Payments & Refunds',
    faqs: [
      {
        q: 'How do I pay for an evaluation?',
        a: "Evaluation fees are paid via bank transfer, PayPal, or crypto to FT9ja using the instructions on your partner firm's checkout page. After purchasing, upload your payment proof for verification. Account details are typically issued within 24 hours of confirmed payment.",
      },
      {
        q: 'Are evaluation fees refundable?',
        a: 'Evaluation fees are generally non-refundable once your account has been activated. If you failed to receive your account credentials within 24 hours of payment confirmation, contact your partner firm immediately.',
      },
      {
        q: 'What if my payment is not confirmed?',
        a: "If your evaluation has not been activated within 4 business hours of payment, send your proof of payment (screenshot) to your partner firm's support email with your transaction reference. Keep all payment receipts.",
      },
      {
        q: 'Can I get a discount or free retake?',
        a: "Some partner firms offer discounts for repeat purchases or allow you to retake at a reduced fee. This is at each partner firm's discretion. Check your firm's promotions page or contact their support.",
      },
    ],
  },
  {
    id: 'risk',
    icon: <AlertCircle size={18} />,
    title: 'Risk & Important Notices',
    faqs: [
      {
        q: 'Is this real money trading?',
        a: "The evaluation phase uses simulated/demo accounts that mirror real market conditions. The funded phase uses real capital. FT9ja's actual risk exposure is managed through internal hedging — you trade with real market data and real spreads.",
      },
      {
        q: 'Can I lose more than my evaluation fee?',
        a: 'No. Your maximum financial exposure is the evaluation fee you paid. You cannot lose more than that during the challenge. On a funded account, you cannot lose personal money — but you can lose the funded account if you breach risk rules.',
      },
      {
        q: 'Is prop trading regulated?',
        a: 'Prop trading firm services (not brokerage) currently operate in a regulatory grey zone in many jurisdictions including Nigeria. FT9ja operates transparently and complies with all applicable regulations. This is not a brokerage or investment product.',
      },
      {
        q: 'What are the risks of prop trading?',
        a: 'Main risks: (1) Losing your evaluation fee if you fail the challenge. (2) Failing to pass due to inconsistent trading. (3) Losing a funded account by breaching risk rules. Trading involves substantial risk and is not suitable for everyone.',
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
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 pr-4">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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

export default function GuidePage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = (sectionId: string, faqs: { q: string }[]) => {
    const update: Record<string, boolean> = {};
    faqs.forEach((_, i) => {
      update[`${sectionId}-${i}`] = true;
    });
    setOpenItems((prev) => ({ ...prev, ...update }));
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-3">
            <FT9jaLogo height={36} />
            <span className="hidden sm:block text-sm text-gray-400">/</span>
            <span className="hidden sm:block text-sm font-semibold text-gray-700">
              Trader Guide
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/legal" className="text-sm text-gray-500 hover:text-gray-900">
              Legal
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Become a Partner <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-[#16A34A]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#16A34A]">
              Comprehensive Guide
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 md:text-5xl mb-4">
            Trader Guide & FAQ
          </h1>
          <p className="text-lg text-gray-500 max-w-xl">
            Everything you need to know about prop trading evaluations, funding, rules, and payouts
            on the FT9ja Partner platform.
          </p>

          {/* Quick nav */}
          <div className="mt-8 flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {s.icon} {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-14">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-[#16A34A]">
                  {section.icon}
                </div>
                <h2 className="text-xl font-black text-gray-900">{section.title}</h2>
              </div>
              <button
                onClick={() => expandAll(section.id, section.faqs)}
                className="text-xs text-gray-400 hover:text-gray-700 underline"
              >
                Expand all
              </button>
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

        {/* Rules Summary Card */}
        <section id="rules-summary">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-5 bg-gray-50">
              <h2 className="text-lg font-black text-gray-900">Quick Rules Reference</h2>
              <p className="text-xs text-gray-500 mt-1">
                At-a-glance comparison of both evaluation types
              </p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
                        Rule
                      </th>
                      <th className="text-center py-2 px-4 text-xs font-semibold uppercase tracking-widest text-gray-900">
                        Standard (SS)
                      </th>
                      <th className="text-center py-2 px-4 text-xs font-semibold uppercase tracking-widest text-gray-900">
                        Starter (SSL)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      ['Account Size', '$10,000', '$10,000'],
                      ['Evaluation Fee', '₦145,000', '₦49,000'],
                      ['Evaluation', '25% profit target', 'No evaluation'],
                      ['Profit Target', '25% ($2,500)', 'None'],
                      ['Max Drawdown', '10% ($1,000)', '10% ($1,000)'],
                      ['Daily Loss Limit', '5% ($500)', '5% ($500)'],
                      ['Min Trading Days', '10/mo, 2/week', '10/mo, 2/week'],
                      ['News Trading', '✅ Allowed', '✅ Allowed'],
                      ['EA / Bots', '✅ Allowed', '✅ Allowed'],
                      ['Payouts', 'Up to 90% (Aso)', 'Talent bonus only'],
                      ['Second Chance', '❌ No', '❌ No'],
                    ].map(([rule, ss, ssl]) => (
                      <tr key={rule}>
                        <td className="py-3 pr-6 text-xs font-medium text-gray-500">{rule}</td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-gray-900">
                          {ss}
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-gray-900">
                          {ssl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-[#111827] p-8 text-center">
          <h3 className="text-xl font-black text-white mb-2">Ready to get funded?</h3>
          <p className="text-sm text-gray-400 mb-6">
            Find a partner firm and start your evaluation today.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Browse Partner Firms <ArrowRight size={14} />
            </Link>
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
            >
              Read Legal Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-3 md:flex-row">
          <FT9jaLogo height={32} />
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/guide" className="hover:text-gray-700">
              Guide
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
