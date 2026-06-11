'use client';
import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

const sections = [
  {
    id: 'terms',
    title: 'Terms of Service',
    content: [
      {
        heading: '1. Acceptance of Terms',
        text: 'By accessing or using any FT9ja service — including the Partner Program, trader evaluations, funded accounts, or any associated platform — you agree to be bound by these Terms of Service. If you do not agree, you must not use our services.',
      },
      {
        heading: '2. Partner Program',
        text: 'FT9ja Partner Program allows approved individuals and entities ("Partners") to operate a white-label prop trading brand using FT9ja\'s infrastructure. Partners pay a monthly license fee of ₦95,000 and are responsible for their own marketing, trader acquisition, and customer communication. FT9ja is not responsible for representations made by Partners to their traders beyond what is documented in these terms.',
      },
      {
        heading: '3. Evaluation Services',
        text: 'FT9ja provides simulated trading evaluations through its partner network. Evaluation accounts are demo/simulated environments that mirror real market conditions. Evaluation fees are non-refundable once an account has been activated. Passing an evaluation does not guarantee a funded account — all accounts are subject to final review.',
      },
      {
        heading: '4. Funded Accounts',
        text: 'Traders who successfully pass an evaluation may receive a funded trading account. Funded accounts are subject to ongoing risk rules. Breach of risk parameters (maximum drawdown, daily loss limit) will result in immediate account termination. FT9ja reserves the right to terminate funded accounts at any time with cause.',
      },
      {
        heading: '5. Profit Sharing',
        text: 'Funded traders receive up to 90% of net profits generated on their funded account. Profit splits are calculated and paid on a schedule determined by each Partner firm. FT9ja processes all profit distributions and bears the financial responsibility for payouts. Profit splits are taxable income and traders are responsible for their own tax obligations.',
      },
      {
        heading: '6. Prohibited Activities',
        text: 'The following are strictly prohibited: (a) any form of collusion between multiple accounts; (b) trading strategies designed to exploit platform errors or latency; (c) providing false or misleading information during account creation; (d) copy trading from other FT9ja accounts; (e) holding positions over weekends on certain instruments as specified; (f) any activity that constitutes market manipulation.',
      },
      {
        heading: '7. Intellectual Property',
        text: 'All FT9ja branding, technology, and content is the intellectual property of FT9ja Trading Ltd. Partners are granted a limited, non-exclusive, revocable license to use FT9ja branding within the scope of the Partner Program. This license terminates immediately upon cancellation or termination of the partner agreement.',
      },
      {
        heading: '8. Limitation of Liability',
        text: "FT9ja's total liability to any user or partner shall not exceed the amount paid to FT9ja in the 12 months preceding the claim. FT9ja is not liable for indirect, consequential, or incidental damages, including lost profits. FT9ja is not liable for trading losses on evaluation or funded accounts.",
      },
      {
        heading: '9. Termination',
        text: "FT9ja may terminate or suspend access to any service at any time for breach of these terms, suspected fraud, or at FT9ja's sole discretion. Partners may cancel the monthly license at any time. No refunds are issued for partial months. Outstanding obligations (e.g. pending payouts to traders) survive termination.",
      },
      {
        heading: '10. Governing Law',
        text: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos State, Nigeria, or through arbitration as determined by FT9ja.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    content: [
      {
        heading: '1. Information We Collect',
        text: 'We collect: (a) Identity information — name, email address, phone number; (b) Payment information — bank account details, transaction records; (c) Trading data — evaluation performance, funded account activity; (d) Technical data — IP address, browser type, device identifiers; (e) Communications — emails, support tickets, and messages sent to us.',
      },
      {
        heading: '2. How We Use Your Information',
        text: 'We use your data to: (a) Operate and provide the evaluation and funding services; (b) Process payments and profit distributions; (c) Communicate service updates, account status, and support; (d) Detect fraud and ensure compliance with risk rules; (e) Improve our platform and partner offerings; (f) Comply with legal and regulatory obligations.',
      },
      {
        heading: '3. Data Sharing',
        text: 'We share your data with: (a) Your chosen Partner firm, who is responsible for your evaluation purchase and client relationship; (b) Payment processors for financial transactions; (c) Technology providers who power our infrastructure (under confidentiality agreements); (d) Regulatory authorities when required by law. We do not sell your personal data to third parties.',
      },
      {
        heading: '4. Data Retention',
        text: 'We retain your personal data for as long as necessary to provide services and comply with legal obligations — typically 7 years for financial records. You may request deletion of non-essential data by contacting privacy@ft9ja.com, subject to legal retention requirements.',
      },
      {
        heading: '5. Your Rights',
        text: 'You have the right to: (a) Access a copy of your personal data; (b) Correct inaccurate information; (c) Request deletion of data where legally permissible; (d) Object to processing of your data; (e) Lodge a complaint with a data protection authority. Contact privacy@ft9ja.com to exercise these rights.',
      },
      {
        heading: '6. Cookies',
        text: 'Our platform uses essential cookies to maintain sessions and security. We do not use third-party tracking or advertising cookies without your consent. You may disable non-essential cookies in your browser settings.',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Disclaimer',
    content: [
      {
        heading: 'Trading Risk Warning',
        text: 'Trading financial instruments — including Forex, commodities, indices, and cryptocurrencies — involves significant risk of loss. Past performance of any trading strategy is not indicative of future results. You should carefully consider whether trading is appropriate for you in light of your experience, objectives, financial resources, and risk tolerance.',
      },
      {
        heading: 'Evaluation Risk',
        text: 'Evaluation fees are non-refundable. You may fail an evaluation and lose the fee paid. There is no guarantee that you will pass any evaluation or receive a funded account. Your success depends entirely on your trading performance, discipline, and adherence to risk rules.',
      },
      {
        heading: 'Not Financial Advice',
        text: 'Nothing on the FT9ja platform or from its partner firms constitutes financial advice, investment advice, or a recommendation to trade. All content is for informational and educational purposes only. You should consult an independent financial advisor before making any trading decisions.',
      },
      {
        heading: 'Prop Trading Nature',
        text: 'FT9ja is a proprietary trading firm operator, not a licensed broker or investment firm. Trading evaluation and funded accounts are proprietary products, not regulated brokerage accounts. Funds in evaluation accounts are not protected by any deposit protection scheme.',
      },
      {
        heading: 'Market Conditions',
        text: 'Financial markets can be highly volatile. Market gaps, slippage, and unexpected events (e.g. central bank interventions, geopolitical events) can cause losses that exceed normal risk parameters. FT9ja is not liable for losses caused by extraordinary market conditions.',
      },
    ],
  },
  {
    id: 'partner-agreement',
    title: 'Partner Agreement Summary',
    content: [
      {
        heading: 'License Grant',
        text: 'Upon approval and payment, FT9ja grants you a limited, non-exclusive, revocable license to operate a white-label prop trading brand using FT9ja infrastructure for the duration of your active license.',
      },
      {
        heading: 'Partner Obligations',
        text: 'As a Partner you must: (a) Pay the ₦95,000 monthly license fee on time; (b) Truthfully represent the nature of the evaluation product to your traders; (c) Not make guarantees of profit or funding that exceed what FT9ja offers; (d) Handle customer communications professionally; (e) Comply with all applicable laws in your jurisdiction; (f) Not sub-license FT9ja infrastructure to other parties.',
      },
      {
        heading: 'Revenue Model',
        text: 'Partners set their own evaluation prices and earn the difference between their retail price and the FT9ja wholesale price. FT9ja handles all funded account obligations and profit payouts to traders. Partners do not receive a share of funded trader profits — revenue comes from evaluation sales markup only.',
      },
      {
        heading: 'Partner Termination',
        text: 'Either party may terminate the partner relationship with 30 days written notice. FT9ja may terminate immediately for: (a) Non-payment of license fees; (b) Fraudulent activity; (c) Misrepresentation to traders; (d) Violation of these terms. Upon termination, existing trader accounts remain active through their current evaluation period.',
      },
      {
        heading: 'Liability & Indemnification',
        text: "Partners indemnify FT9ja against claims arising from the Partner's own marketing, representations, or actions. FT9ja is not liable for the Partner's revenue, business success, or relationship with their traders. FT9ja's obligations are limited to the infrastructure and evaluation services described in these terms.",
      },
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#16A34A]">
                <span className="text-xs font-black text-white">FT</span>
              </div>
              <span className="text-lg font-black tracking-tight text-gray-900">9ja</span>
            </div>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm font-semibold text-gray-700">Legal</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/guide" className="text-sm text-gray-500 hover:text-gray-900">
              Guide
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Apply <ArrowRight size={14} />
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
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-3">
            Legal & Compliance
          </h1>
          <p className="text-base text-gray-500 max-w-xl">
            FT9ja&apos;s terms of service, privacy policy, risk disclosures, and partner agreement.
            Last updated June 2026.
          </p>
          {/* Jump links */}
          <div className="mt-6 flex flex-wrap gap-2">
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
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-12">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
                <h2 className="text-lg font-black text-gray-900">{section.title}</h2>
              </div>
              <div className="divide-y divide-gray-50 px-6">
                {section.content.map((item) => (
                  <div key={item.heading} className="py-5">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">{item.heading}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Legal Enquiries</h3>
          <p className="mb-4 text-sm text-gray-500">
            For legal questions, data requests, or compliance matters, contact our legal team
            directly.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:legal@ft9ja.com"
              className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              legal@ft9ja.com
            </a>
            <a
              href="mailto:privacy@ft9ja.com"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              privacy@ft9ja.com
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          These terms apply to all FT9ja services and partner programs. FT9ja Trading Ltd, Lagos,
          Nigeria. © 2026.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-4">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#16A34A]">
              <span className="text-[10px] font-black text-white">FT</span>
            </div>
            <span className="text-sm font-black tracking-tight text-gray-900">9ja</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/guide" className="hover:text-gray-700">
              Trader Guide
            </Link>
            <Link href="/legal" className="hover:text-gray-700 font-semibold text-gray-700">
              Legal
            </Link>
            <Link href="/apply" className="hover:text-gray-700">
              Apply
            </Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 FT9ja. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
