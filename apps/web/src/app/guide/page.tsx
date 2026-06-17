'use client';
import FT9jaLogo from '@/components/FT9jaLogo';
import {
  FT9JA_GUIDE_FAQ_SECTIONS,
  FT9JA_RULES_QUICK_REFERENCE,
} from '@/lib/ft9ja-support-content';
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

const sectionIcons: Record<string, React.ReactNode> = {
  'getting-started': <Zap size={18} />,
  'evaluation-rules': <Shield size={18} />,
  'funded-account': <TrendingUp size={18} />,
  payments: <CheckCircle size={18} />,
  risk: <AlertCircle size={18} />,
};

const sections = FT9JA_GUIDE_FAQ_SECTIONS.map((section) => ({
  ...section,
  icon: sectionIcons[section.id] ?? <BookOpen size={18} />,
}));

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
                    {FT9JA_RULES_QUICK_REFERENCE.map(([rule, ss, ssl]) => (
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
