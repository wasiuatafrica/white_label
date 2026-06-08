'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Eye,
  X,
  Building2,
  Users,
  ChevronRight,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { EMAIL_TEMPLATES, type EmailTemplate } from './data';
import JSZip from 'jszip';

const CATEGORIES = [
  {
    id: 'ft9ja-to-partner',
    label: 'FT9ja → Partners',
    icon: <Building2 size={15} />,
    color: '#16A34A',
    desc: '10 emails from FT9ja to partner firms',
  },
  {
    id: 'partner-to-trader',
    label: 'Partners → Traders',
    icon: <Users size={15} />,
    color: '#2563EB',
    desc: '10 emails from partner firms to their traders',
  },
] as const;

const README = `# FT9ja Email Templates
Generated: June 2026
Total: 20 templates (10 per category)

## Folder Structure
/ft9ja-to-partner/   — Emails from FT9ja to Partner firms
/partner-to-trader/  — Emails from Partner firms to their Traders

## Variables (replace before sending)
{{OWNER_NAME}}, {{FIRM_NAME}}, {{SLUG}}, {{TRADER_NAME}},
{{BRAND_COLOR}}, {{EVAL_TYPE}}, {{ACCOUNT_SIZE}}, {{AMOUNT}},
{{PROFIT_TARGET}}, {{MAX_DRAWDOWN}}, {{REQUIRED_DAYS}},
{{CURRENT_PROFIT}}, {{CURRENT_DRAWDOWN}}, {{TRADING_DAYS}},
{{DASHBOARD_URL}}, {{ADMIN_URL}}, {{EVAL_ID}}, {{DATE}},
{{MONTH}}, {{YEAR}}, {{URL}}, {{OWNER_EMAIL}}, {{FAIL_REASON}},
{{VERIFIED_DATE}}, {{NEXT_DUE_DATE}}, {{DUE_DATE}}, {{REF}}

## Usage
All templates are self-contained HTML files compatible with major
email clients (Gmail, Outlook, Apple Mail, Yahoo Mail).
Replace {{VARIABLES}} with real values before sending.
For partner-to-trader emails, replace {{BRAND_COLOR}} with the
partner firm hex colour (e.g. #16A34A).

## Notes
- Max 200 words per template
- Mobile-responsive table layout
- Inline CSS only (email client compatible)
- FT9ja (c) 2026
`;

export default function EmailTemplatesPage() {
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ft9ja-to-partner' | 'partner-to-trader'>('all');

  async function downloadZip() {
    const zip = new JSZip();
    const partnerFolder = zip.folder('ft9ja-to-partner');
    const traderFolder = zip.folder('partner-to-trader');
    for (const t of EMAIL_TEMPLATES) {
      if (t.category === 'ft9ja-to-partner') {
        partnerFolder?.file(t.filename, t.html);
      } else {
        traderFolder?.file(t.filename, t.html);
      }
    }
    zip.file('README.md', README);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ft9ja-email-templates.zip';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  }

  const visible = EMAIL_TEMPLATES.filter((t) => filter === 'all' || t.category === filter);

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700"
            >
              <ArrowLeft size={13} /> Admin
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-sm font-semibold text-gray-900">Email Templates</span>
          </div>
          <button
            onClick={downloadZip}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: downloaded ? '#16A34A' : '#111827' }}
          >
            {downloaded ? (
              <>
                <CheckCircle size={14} /> Downloaded!
              </>
            ) : (
              <>
                <Download size={14} /> Download ZIP (20 templates)
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            20 ready-to-send HTML email templates. Download as a ZIP to customise and deploy.
          </p>
        </div>

        {/* Category cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const count = EMAIL_TEMPLATES.filter((t) => t.category === cat.id).length;
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{cat.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{cat.desc}</div>
                </div>
                <div className="text-3xl font-black" style={{ color: cat.color }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'All 20' },
              { id: 'ft9ja-to-partner', label: 'FT9ja → Partners' },
              { id: 'partner-to-trader', label: 'Partners → Traders' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${filter === f.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Templates table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-12 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            <div className="col-span-1">#</div>
            <div className="col-span-3">File</div>
            <div className="col-span-4">Subject Line</div>
            <div className="col-span-3">When to Send</div>
            <div className="col-span-1 text-right">Preview</div>
          </div>

          <div className="divide-y divide-gray-100">
            {visible.map((t, i) => {
              const cat = CATEGORIES.find((c) => c.id === t.category);
              return (
                <div
                  key={t.id}
                  className="flex md:grid md:grid-cols-12 flex-col md:flex-row items-start md:items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="md:col-span-1">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white"
                      style={{ backgroundColor: cat?.color || '#6B7280' }}
                    >
                      {i + 1}
                    </div>
                  </div>
                  <div className="md:col-span-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="shrink-0 text-gray-300" />
                      <span className="text-xs font-mono text-gray-600 truncate">{t.filename}</span>
                    </div>
                    <span
                      className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: cat?.color || '#6B7280' }}
                    >
                      {t.category === 'ft9ja-to-partner' ? 'FT9ja → Partner' : 'Partner → Trader'}
                    </span>
                  </div>
                  <div className="md:col-span-4">
                    <div className="text-sm font-semibold text-gray-900 leading-snug">
                      {t.subject}
                    </div>
                  </div>
                  <div className="md:col-span-3 hidden md:block">
                    <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>
                  </div>
                  <div className="md:col-span-1 flex md:justify-end">
                    <button
                      onClick={() => setPreview(t)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Variables legend */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Template Variables</h3>
          <p className="mb-3 text-xs text-gray-500">
            Replace these placeholders with real values before sending. For partner-to-trader
            emails, swap{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{{BRAND_COLOR}}'}</code> with the
            partner hex colour.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              '{{OWNER_NAME}}',
              '{{FIRM_NAME}}',
              '{{SLUG}}',
              '{{TRADER_NAME}}',
              '{{BRAND_COLOR}}',
              '{{EVAL_TYPE}}',
              '{{ACCOUNT_SIZE}}',
              '{{AMOUNT}}',
              '{{PROFIT_TARGET}}',
              '{{MAX_DRAWDOWN}}',
              '{{REQUIRED_DAYS}}',
              '{{CURRENT_PROFIT}}',
              '{{CURRENT_DRAWDOWN}}',
              '{{TRADING_DAYS}}',
              '{{DASHBOARD_URL}}',
              '{{ADMIN_URL}}',
              '{{EVAL_ID}}',
              '{{DATE}}',
              '{{MONTH}}',
              '{{YEAR}}',
              '{{URL}}',
              '{{OWNER_EMAIL}}',
              '{{FAIL_REASON}}',
              '{{VERIFIED_DATE}}',
            ].map((v) => (
              <code
                key={v}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
              >
                {v}
              </code>
            ))}
          </div>
        </div>

        {/* Download CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-gray-900 bg-gray-900 px-6 py-5">
          <div>
            <div className="text-sm font-semibold text-white">
              Download all 20 templates as a ZIP
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Organised in two folders + a README with usage instructions.
            </div>
          </div>
          <button
            onClick={downloadZip}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {downloaded ? <CheckCircle size={15} /> : <Download size={15} />}
            {downloaded ? 'Downloaded!' : 'Download ZIP'}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-6 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-gray-400">{preview.filename}</div>
                <div className="text-sm font-semibold text-white mt-0.5">{preview.subject}</div>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <iframe
                srcDoc={preview.html}
                title={preview.subject}
                className="h-[600px] w-full bg-white"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                <strong className="text-gray-300">When to send:</strong> {preview.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
