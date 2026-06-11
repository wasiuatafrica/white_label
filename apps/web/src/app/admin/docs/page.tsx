'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Globe,
  Key,
  Mail,
  Server,
  Shield,
  Users,
  Zap,
  BookOpen,
  Code2,
  LayoutDashboard,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  ChevronDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = {
  id: string;
  label: string;
  icon: React.ReactNode;
  subsections?: { id: string; label: string }[];
};

// ─── Nav Sections ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id: 'overview', label: 'Overview', icon: <BookOpen size={14} /> },
  {
    id: 'architecture',
    label: 'Architecture',
    icon: <Server size={14} />,
    subsections: [
      { id: 'arch-pages', label: 'Pages & Routes' },
      { id: 'arch-api', label: 'API Endpoints' },
      { id: 'arch-db', label: 'Database Schema' },
    ],
  },
  {
    id: 'partner-program',
    label: 'Partner Program',
    icon: <Building2 size={14} />,
    subsections: [
      { id: 'partner-apply', label: 'Applying' },
      { id: 'partner-admin', label: 'Partner Admin' },
      { id: 'partner-branding', label: 'Branding & Templates' },
      { id: 'partner-pricing', label: 'Pricing & Markup' },
    ],
  },
  {
    id: 'trader-portal',
    label: 'Trader Portal',
    icon: <Users size={14} />,
    subsections: [
      { id: 'trader-register', label: 'Registration' },
      { id: 'trader-evals', label: 'Evaluations' },
      { id: 'trader-dashboard', label: 'Dashboard' },
      { id: 'trader-kyc', label: 'KYC Verification' },
      { id: 'trader-payouts', label: 'Payouts' },
    ],
  },
  {
    id: 'eval-rules',
    label: 'Evaluation Rules',
    icon: <TrendingUp size={14} />,
    subsections: [
      { id: 'rules-ss', label: 'Standard (SS)' },
      { id: 'rules-ssl', label: 'Starter (SSL)' },
      { id: 'rules-breach', label: 'Breach & Failure' },
    ],
  },
  {
    id: 'api-ref',
    label: 'API Reference',
    icon: <Code2 size={14} />,
    subsections: [
      { id: 'api-partners', label: 'Partners' },
      { id: 'api-traders', label: 'Traders' },
      { id: 'api-evaluations', label: 'Evaluations' },
      { id: 'api-auth', label: 'Authentication' },
      { id: 'api-kyc', label: 'KYC' },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication',
    icon: <Key size={14} />,
    subsections: [
      { id: 'auth-platform', label: 'Platform Auth (Better Auth)' },
      { id: 'auth-trader', label: 'Trader Auth (Custom)' },
    ],
  },
  { id: 'db-schema', label: 'Database', icon: <Database size={14} /> },
  { id: 'emails', label: 'Email Templates', icon: <Mail size={14} /> },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: <Shield size={14} />,
  },
  { id: 'env-vars', label: 'Environment Variables', icon: <Terminal size={14} /> },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 mb-4 scroll-mt-20 text-xl font-black tracking-tight text-gray-900 border-b border-gray-100 pb-3"
    >
      {children}
    </h2>
  );
}

function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-8 mb-3 scroll-mt-20 text-base font-bold text-gray-900">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-gray-600">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
      {children}
    </code>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
      {label && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-400">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto bg-gray-950 px-4 py-4 text-xs leading-relaxed text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PATCH: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PUT: 'bg-purple-100 text-purple-700',
  };
  const methods = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'];
  const statusColors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  function renderCell(cell: string, _colIdx: number) {
    if (methods.includes(cell)) {
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-black ${methodColors[cell]}`}
        >
          {cell}
        </span>
      );
    }
    if (
      cell.startsWith('/') ||
      cell.startsWith('{') ||
      (cell.includes('_') && cell === cell.toLowerCase() && !cell.includes(' '))
    ) {
      return (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
          {cell}
        </code>
      );
    }
    if (cell.startsWith('[[STATUS:')) {
      const [statusKey, label] = cell.replace('[[STATUS:', '').replace(']]', '').split('|');
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[statusKey] || statusColors.gray}`}
        >
          {label}
        </span>
      );
    }
    return <span>{cell}</span>;
  }
  return (
    <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-xs text-gray-700">
                  {renderCell(cell, j)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  type,
  children,
}: {
  type: 'info' | 'warning' | 'success';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  const icons = {
    info: <Zap size={14} />,
    warning: <AlertTriangle size={14} />,
    success: <CheckCircle2 size={14} />,
  };
  return (
    <div className={`mb-4 flex gap-3 rounded-xl border p-4 ${styles[type]}`}>
      <span className="shrink-0 mt-0.5">{icons[type]}</span>
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color] || colors.gray}`}
    >
      {children}
    </span>
  );
}

function Endpoint({
  method,
  path,
  desc,
  auth,
  body,
  response,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  desc: string;
  auth?: string;
  body?: string;
  response?: string;
}) {
  const [open, setOpen] = useState(false);
  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PATCH: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PUT: 'bg-purple-100 text-purple-700',
  };
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${methodColors[method]}`}
        >
          {method}
        </span>
        <code className="flex-1 font-mono text-xs text-gray-800">{path}</code>
        <span className="text-xs text-gray-400 hidden sm:block">{desc}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
          <p className="text-xs text-gray-600">{desc}</p>
          {auth && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Auth:</span>
              <Badge color="gray">{auth}</Badge>
            </div>
          )}
          {body && (
            <div>
              <div className="mb-1 text-xs font-semibold text-gray-400">Request Body</div>
              <pre className="rounded-lg bg-gray-900 p-3 text-xs text-gray-300 overflow-x-auto">
                <code>{body}</code>
              </pre>
            </div>
          )}
          {response && (
            <div>
              <div className="mb-1 text-xs font-semibold text-gray-400">Response</div>
              <pre className="rounded-lg bg-gray-900 p-3 text-xs text-gray-300 overflow-x-auto">
                <code>{response}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active }: { active: string }) {
  const [open, setOpen] = useState<string[]>([
    'architecture',
    'partner-program',
    'trader-portal',
    'eval-rules',
    'api-ref',
    'auth',
  ]);

  const toggle = (id: string) => {
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <nav className="w-56 shrink-0">
      <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2 pb-10">
        {SECTIONS.map((s) => (
          <div key={s.id} className="mb-0.5">
            <div className="flex items-center">
              <a
                href={`#${s.id}`}
                onClick={() => s.subsections && toggle(s.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active === s.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="shrink-0">{s.icon}</span>
                {s.label}
                {s.subsections && (
                  <ChevronDown
                    size={11}
                    className={`ml-auto shrink-0 transition-transform ${open.includes(s.id) ? 'rotate-180' : ''}`}
                  />
                )}
              </a>
            </div>
            {s.subsections && open.includes(s.id) && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                {s.subsections.map((sub) => (
                  <a
                    key={sub.id}
                    href={`#${sub.id}`}
                    className={`block rounded py-1.5 pl-2 text-xs transition-colors ${
                      active === sub.id
                        ? 'font-semibold text-gray-900'
                        : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {sub.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [active, setActive] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allIds = SECTIONS.flatMap((s) => [s.id, ...(s.subsections?.map((sub) => sub.id) || [])]);
    const observers: IntersectionObserver[] = [];

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

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
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <BookOpen size={14} /> Documentation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/emails"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              <Mail size={10} /> Email Templates
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              <Globe size={10} /> Live Site
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-10 px-6 py-10">
        {/* Sidebar */}
        <div className="hidden lg:block">
          <Sidebar active={active} />
        </div>

        {/* Content */}
        <div ref={contentRef} className="min-w-0 flex-1">
          {/* ── OVERVIEW ───────────────────────────────────────────── */}
          <div id="overview" className="scroll-mt-20">
            <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#16A34A]/20 bg-[#16A34A]/5 px-3 py-1 text-xs font-semibold text-[#16A34A]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Internal Documentation
              </div>
              <h1 className="mb-3 text-3xl font-black tracking-tight text-gray-900">
                FT9ja Partner Platform
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-gray-500 max-w-2xl">
                FT9ja is a white-label prop trading platform that lets partner firms create branded
                storefronts, sell trader evaluations, manage traders, and earn revenue — all powered
                by FT9ja infrastructure. This document covers every page, API route, database table,
                auth system, and operational process.
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Pages', value: '12', color: '#16A34A' },
                  { label: 'API Routes', value: '23', color: '#2563EB' },
                  { label: 'DB Tables', value: '3', color: '#7C3AED' },
                  { label: 'Email Templates', value: '20', color: '#D97706' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
                  >
                    <div className="text-2xl font-black" style={{ color: s.color }}>
                      {s.value}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <H2 id="overview">Platform Overview</H2>
            <P>
              FT9ja operates two tiers. <strong>FT9ja (super-admin)</strong> manages the partner
              network — approving/suspending firms, monitoring revenue, and controlling platform
              settings. <strong>Partner firms</strong> are white-label operators that run their own
              trader communities under a branded subdomain (<Code>&#123;slug&#125;.ft9ja.com</Code>
              ), sell evaluations, manage traders, confirm payments, and review KYC documents.
            </P>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  icon: <Building2 size={18} />,
                  title: 'FT9ja (Super Admin)',
                  items: [
                    'Approve / suspend partners',
                    'View platform-wide metrics',
                    'Manage email templates',
                    'Access all partner admin pages',
                  ],
                  color: '#16A34A',
                },
                {
                  icon: <LayoutDashboard size={18} />,
                  title: 'Partner Firm',
                  items: [
                    'Branded storefront & pricing',
                    'Add / manage traders',
                    'Confirm payments',
                    'Approve KYC submissions',
                  ],
                  color: '#2563EB',
                },
                {
                  icon: <Users size={18} />,
                  title: 'Trader',
                  items: [
                    'Buy evaluations',
                    'Track progress live',
                    'Submit KYC documents',
                    'Request payouts',
                  ],
                  color: '#7C3AED',
                },
              ].map((t) => (
                <div key={t.title} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.icon}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{t.title}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {t.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-gray-500">
                        <span className="mt-0.5 text-gray-300">—</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ── ARCHITECTURE ──────────────────────────────────────────── */}
          <H2 id="architecture">Architecture</H2>
          <P>
            The platform is a Next.js 16 App Router monorepo with a single Neon PostgreSQL database.
            All pages are React 19 client components; all backend logic lives in serverless API
            route handlers. The mobile app (Expo) delegates auth to the web app via WebView and
            token exchange endpoints.
          </P>

          <H3 id="arch-pages">Pages & Routes</H3>
          <Table
            headers={['Route', 'File', 'Description', 'Auth']}
            rows={[
              ['/app/page.tsx', 'FT9ja Partner Program marketing landing', 'None'],
              ['/apply/page.tsx', 'Multi-step partner application wizard', 'None'],
              ['/guide/page.tsx', 'Full trader FAQ & evaluation guide', 'None'],
              ['/legal/page.tsx', 'Platform-wide legal, T&C, privacy', 'None'],
              ['/admin/page.tsx', 'FT9ja super admin (password gated)', 'Admin PW'],
              ['/admin/emails/page.tsx', '20 email template previews & ZIP download', 'Admin PW'],
              ['/admin/docs/page.tsx', 'This documentation page', 'Admin PW'],
              [
                '/&#123;slug&#125;/page.tsx',
                'White-label partner storefront (3 templates)',
                'None',
              ],
              [
                '/&#123;slug&#125;/login/page.tsx',
                'Trader login, register, forgot password',
                'None',
              ],
              [
                '/&#123;slug&#125;/dashboard/page.tsx',
                'Trader dashboard — evaluations, KYC, profile',
                'Trader session',
              ],
              ['/&#123;slug&#125;/admin/page.tsx', 'Partner admin panel (PIN gated)', 'Admin PIN'],
              ['/&#123;slug&#125;/legal/page.tsx', 'Partner-branded terms & legal page', 'None'],
              [
                '/&#123;slug&#125;/reset-password/page.tsx',
                'Password reset via email token',
                'Reset token',
              ],
              ['/account/signin/page.tsx', 'Better Auth email/password sign-in', 'None'],
              ['/account/signup/page.tsx', 'Better Auth email/password sign-up', 'None'],
              ['/account/logout/page.tsx', 'Better Auth sign-out', 'Session'],
            ]}
          />

          <H3 id="arch-api">API Endpoints</H3>
          <P>
            All routes live under <Code>/api</Code>. See the full API Reference section below for
            request/response shapes.
          </P>
          <Table
            headers={['Method', 'Endpoint', 'Purpose']}
            rows={[
              ['GET', '/api/partners', 'List all partners (super admin)'],
              ['POST', '/api/partners', 'Submit partner application'],
              ['GET', '/api/partners/[slug]', 'Get partner public profile'],
              ['PATCH', '/api/partners/[slug]', 'Update partner (status, branding, markup, PIN)'],
              ['DELETE', '/api/partners/[slug]', 'Delete partner record'],
              ['POST', '/api/partners/[slug]/verify-pin', 'Verify partner admin PIN'],
              ['GET', '/api/partners/[slug]/traders', 'List traders for partner'],
              ['POST', '/api/partners/[slug]/traders', 'Create trader account'],
              ['GET', '/api/partners/[slug]/traders/[id]', 'Get trader profile (session)'],
              ['PATCH', '/api/partners/[slug]/traders/[id]', 'Update name / change password'],
              ['GET', '/api/partners/[slug]/traders/[id]/kyc', 'Get KYC submission'],
              ['POST', '/api/partners/[slug]/traders/[id]/kyc', 'Submit KYC documents'],
              ['PATCH', '/api/partners/[slug]/traders/[id]/kyc', 'Approve/reject KYC (admin PIN)'],
              [
                'GET',
                '/api/partners/[slug]/evaluations',
                'List evaluations (trader or admin view)',
              ],
              ['POST', '/api/partners/[slug]/evaluations', 'Create evaluation purchase order'],
              [
                'PATCH',
                '/api/partners/[slug]/evaluations/[id]',
                'Update evaluation status/progress',
              ],
              ['GET', '/api/partners/[slug]/auth', 'Check trader session cookie'],
              ['POST', '/api/partners/[slug]/auth', 'Trader login (email + password)'],
              ['PATCH', '/api/partners/[slug]/auth', 'Set password for passwordless accounts'],
              ['DELETE', '/api/partners/[slug]/auth', 'Trader logout (clear cookie)'],
              ['POST', '/api/partners/[slug]/auth/reset', 'Request password reset email'],
              ['PUT', '/api/partners/[slug]/auth/reset', 'Confirm password reset (token + new PW)'],
              ['POST', '/api/partners/[slug]/generate-logo', 'AI logo generation (Nano Banana)'],
              ['GET', '/api/session', 'Better Auth session (platform users)'],
              ['GET', '/api/auth/token', 'Mobile JWT token exchange'],
            ]}
          />

          <H3 id="arch-db">Database Schema</H3>
          <P>
            Five application tables in a single Neon PostgreSQL database, defined in{' '}
            <Code>src/db/schema/</Code> and accessed via Drizzle ORM query modules in{' '}
            <Code>src/db/queries/</Code>. Run <Code>npm run db:generate</Code> or{' '}
            <Code>npm run db:push</Code> from <Code>apps/web</Code> to sync schema changes.
          </P>

          {/* ── PARTNER PROGRAM ───────────────────────────────────────── */}
          <H2 id="partner-program">Partner Program</H2>

          <H3 id="partner-apply">Applying to Become a Partner</H3>
          <P>
            Prospective partners complete a multi-step application at <Code>/apply</Code>. The form
            collects firm details, branding preferences (primary & secondary colours), payment
            method, and a required payment receipt upload. On submission it calls{' '}
            <Code>POST /api/partners</Code>, which creates a row with <Code>status = pending</Code>.
          </P>
          <Callout type="warning">
            <strong>Setup fee:</strong> Partners must pay a one-time setup fee before their firm
            goes live. The super admin marks <Code>setup_fee_waived</Code> and{' '}
            <Code>status = active</Code> after confirming payment.
          </Callout>
          <Table
            headers={['Field', 'Required', 'Notes']}
            rows={[
              ['firm_name', 'Yes', 'Public name shown on storefront'],
              ['slug', 'Yes', 'URL identifier — must be unique, lowercase, no spaces'],
              ['owner_name', 'Yes', 'Contact person name'],
              ['owner_email', 'Yes', 'Used for support contact display & email notifications'],
              ['brand_color', 'No', 'Primary hex colour (default: #16A34A)'],
              ['secondary_color', 'No', 'Secondary hex colour (default: #F59E0B)'],
              ['tagline', 'No', 'Hero headline shown on storefront'],
              ['description', 'No', 'Paragraph description below tagline'],
              ['payment_proof_url', 'Yes', 'Receipt URL uploaded to AWS S3'],
            ]}
          />

          <H3 id="partner-admin">Partner Admin Panel</H3>
          <P>
            Each partner has a private admin panel at <Code>/&#123;slug&#125;/admin</Code>. Access
            is gated by a generated PIN stored in the <Code>partners.admin_pin</Code> column. The
            PIN is sent in the partner approval email and can be changed from Settings.
          </P>
          <P>From the partner admin, a partner can:</P>
          <ul className="mb-6 space-y-2">
            {[
              'View all traders and their evaluation status',
              'Activate pending-payment evaluations after confirming bank transfer',
              "Manually add traders (by the admin on a trader's behalf)",
              'Review and approve/reject KYC document submissions',
              'Update branding: firm name, tagline, description, colours, logo',
              'Switch between 3 storefront templates (Minimal, Bold, Dark)',
              'Set a fee markup to add to base evaluation prices',
              'Generate AI logo options via the Nano Banana integration',
              'Change the admin PIN',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#16A34A]" />
                {item}
              </li>
            ))}
          </ul>

          <H3 id="partner-branding">Branding & Templates</H3>
          <P>Partners can customise their storefront appearance. Three templates are available:</P>
          <Table
            headers={['Template', 'Key', 'Description']}
            rows={[
              [
                'Minimal',
                'minimal',
                'Clean white layout, light background hero, professional look. Default.',
              ],
              ['Bold', 'bold', 'Dark navy header, large typography, accent-heavy cards.'],
              ['Dark', 'dark', 'Full dark (#080B10) background, gradient glow hero, premium feel.'],
            ]}
          />
          <P>
            All templates support: custom logo URL, <Code>brand_color</Code>,{' '}
            <Code>secondary_color</Code>, tagline, description, and FAQ/rules/contact sections
            (shared across all templates).
          </P>

          <H3 id="partner-pricing">Pricing & Fee Markup</H3>
          <P>
            FT9ja sets two base evaluation prices: <strong>₦149,000 (SS — Standard)</strong> and{' '}
            <strong>₦52,000 (SSL — Starter)</strong>. Partners can add a flat naira markup via the{' '}
            <Code>fee_markup</Code> field. The markup is applied to both products equally at display
            time. All revenue is remitted through FT9ja; the partner earns the difference.
          </P>
          <Callout type="info">
            Partners also pay a <strong>₦95,000/month platform license fee</strong> to FT9ja. This
            keeps their firm active. Failure to pay results in temporary suspension.
          </Callout>

          {/* ── TRADER PORTAL ─────────────────────────────────────────── */}
          <H2 id="trader-portal">Trader Portal</H2>

          <H3 id="trader-register">Registration & Login</H3>
          <P>
            Traders access the portal via <Code>/&#123;slug&#125;/login</Code>. The login page is
            branded with the partner's colours and logo. There are three flows on this page:
          </P>
          <Table
            headers={['Flow', 'Trigger', 'Action']}
            rows={[
              [
                'Register',
                'Email not found in DB',
                'Creates trader with hashed password, sets session cookie, redirects to dashboard',
              ],
              [
                'Login',
                'Email found, password set',
                'Verifies argon2 hash, sets session cookie, redirects to dashboard',
              ],
              [
                'Set Password',
                'Email found, no password yet',
                'Account created via purchase flow — allows setting first password',
              ],
              [
                'Forgot Password',
                'User clicks "forgot"',
                'Sends reset link to email via Resend, token stored in traders table',
              ],
            ]}
          />
          <Callout type="info">
            Traders created through the purchase modal (before they ever visit the login page) do
            NOT have a password set. Their first login prompts them to create one.
          </Callout>

          <H3 id="trader-evals">Evaluations</H3>
          <P>
            A trader purchases an evaluation from the partner storefront. The purchase modal
            collects name + email, then calls{' '}
            <Code>POST /api/partners/&#123;slug&#125;/evaluations</Code>. The system finds or
            creates the trader and creates an evaluation record with status{' '}
            <Code>pending_payment</Code>.
          </P>
          <Table
            headers={['Status', 'Meaning']}
            rows={[
              [
                '[[STATUS:amber|pending_payment]]',
                'Order placed, awaiting bank transfer confirmation from partner admin',
              ],
              ['[[STATUS:blue|active]]', 'Payment confirmed by partner — evaluation timer started'],
              [
                '[[STATUS:green|passed]]',
                'All conditions met (profit target + min days + no breach)',
              ],
              ['[[STATUS:red|failed]]', 'Drawdown or daily loss limit breached'],
              ['[[STATUS:gray|suspended]]', 'Manually suspended by partner admin'],
            ]}
          />

          <H3 id="trader-dashboard">Dashboard</H3>
          <P>
            The trader dashboard at <Code>/&#123;slug&#125;/dashboard</Code> shows all evaluations
            for the logged-in trader. Each evaluation card displays real-time progress: profit %,
            current drawdown %, trading days completed vs required, and a rules checklist. The
            dashboard can also be accessed without login via a <Code>?email=</Code> query param
            (read-only) — this is used immediately after purchase before the trader sets a password.
          </P>

          <H3 id="trader-kyc">KYC Verification</H3>
          <P>
            KYC is required before payouts can be processed. Traders submit KYC documents from
            within their dashboard. The partner admin reviews and approves or rejects.
          </P>
          <Table
            headers={['Field', 'Description']}
            rows={[
              ['kyc_full_name', 'Legal full name (must match ID)'],
              ['kyc_id_type', "NIN / Passport / Driver's License / Voter's Card"],
              ['kyc_id_number', 'Document number'],
              ['kyc_id_url', 'Image upload URL (Uploadcare CDN)'],
              ['kyc_address', 'Full residential address'],
              ['kyc_selfie_url', 'Optional selfie holding ID — upload URL'],
              ['kyc_status', 'not_started | submitted | approved | rejected'],
              ['kyc_submitted_at', 'Timestamp of submission'],
            ]}
          />

          <H3 id="trader-payouts">Payouts</H3>
          <P>
            FT9ja does not process payouts directly from the platform at this time. Once a trader
            passes their evaluation and has approved KYC, the partner firm contacts the trader
            directly to set up a live funded account. Payout target is 7 business days from request.
            Funded traders keep <strong>up to 80% of net profits</strong>.
          </P>

          {/* ── EVALUATION RULES ──────────────────────────────────────── */}
          <H2 id="eval-rules">Evaluation Rules</H2>

          <H3 id="rules-ss">Standard Evaluation (SS) — ₦149,000</H3>
          <Table
            headers={['Rule', 'Value', 'Notes']}
            rows={[
              ['Account Size', '$10,000', 'Simulated account capital'],
              ['Profit Target', '10% ($1,000)', 'Must be reached without breaching drawdown'],
              ['Max Total Drawdown', '10% ($1,000)', 'Measured from highest equity peak'],
              ['Daily Loss Limit', '5% ($500)', 'Resets at server midnight'],
              ['Min Trading Days', '30 days', 'A day counts when ≥1 trade is fully closed'],
              ['News Trading', 'Allowed', 'High-impact news events permitted'],
              ['Expert Advisors', 'Restricted', 'Certain high-frequency EAs not permitted'],
              ['Copy Trading', 'Prohibited', 'From funded accounts'],
              ['Profit Split', 'Up to 80%', 'On net profits after passing'],
            ]}
          />

          <H3 id="rules-ssl">Starter Evaluation (SSL) — ₦52,000</H3>
          <Table
            headers={['Rule', 'Value', 'Notes']}
            rows={[
              ['Account Size', '$5,000', 'Simulated account capital'],
              ['Profit Target', '8% ($400)', 'Must be reached without breaching drawdown'],
              ['Max Total Drawdown', '8% ($400)', 'Measured from highest equity peak'],
              ['Daily Loss Limit', '4% ($200)', 'Resets at server midnight'],
              ['Min Trading Days', '21 days', 'A day counts when ≥1 trade is fully closed'],
              ['News Trading', 'Restricted', 'High-impact news events not allowed'],
              ['Expert Advisors', 'Allowed', 'All EAs permitted'],
              ['Copy Trading', 'Prohibited', 'From funded accounts'],
              ['Profit Split', 'Up to 80%', 'On net profits after passing'],
            ]}
          />

          <H3 id="rules-breach">Breach & Failure</H3>
          <P>
            Any of the following immediately fails the evaluation — the system updates status to{' '}
            <Code>failed</Code> and no payout is made:
          </P>
          <ul className="mb-6 space-y-2">
            {[
              'Total drawdown (from highest equity peak including open trades) reaches or exceeds the maximum',
              'Single-day loss reaches or exceeds the daily loss limit',
              'Trading during restricted news events (SSL only)',
              'Use of prohibited EAs or copy trading from funded accounts',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                {item}
              </li>
            ))}
          </ul>
          <Callout type="warning">
            Evaluation fees are <strong>non-refundable</strong> once the account is activated. If
            activation hasn't occurred within 4 business hours of confirmed payment, the trader
            should contact the partner firm.
          </Callout>

          {/* ── API REFERENCE ─────────────────────────────────────────── */}
          <H2 id="api-ref">API Reference</H2>
          <P>
            All endpoints return JSON. Error responses include an <Code>error</Code> string. Click
            any endpoint to expand details.
          </P>

          <H3 id="api-partners">Partners</H3>
          <Endpoint
            method="GET"
            path="/api/partners"
            desc="List all partners. Used by super admin dashboard."
            response={`[\n  {\n    "id": 1,\n    "slug": "apexfunds",\n    "firm_name": "Apex Funds",\n    "owner_email": "admin@apexfunds.com",\n    "status": "active",\n    "total_traders": 14,\n    "total_revenue": "2100000.00",\n    "monthly_fee_paid": true\n  }\n]`}
          />
          <Endpoint
            method="POST"
            path="/api/partners"
            desc="Submit a new partner application. Sets status to 'pending'."
            body={`{\n  "firm_name": "Apex Funds",\n  "slug": "apexfunds",\n  "owner_name": "John Doe",\n  "owner_email": "john@apex.com",\n  "brand_color": "#16A34A",\n  "secondary_color": "#F59E0B",\n  "tagline": "Trade Prop. Get Funded.",\n  "payment_proof_url": "https://ucarecdn.com/..."\n}`}
            response={`{ "id": 1, "slug": "apexfunds", "status": "pending" }`}
          />
          <Endpoint
            method="GET"
            path="/api/partners/[slug]"
            desc="Get a partner's public profile. Does NOT return admin_pin."
            response={`{\n  "id": 1, "slug": "apexfunds",\n  "firm_name": "Apex Funds",\n  "brand_color": "#16A34A",\n  "template": "minimal",\n  "fee_markup": 10000,\n  "status": "active"\n}`}
          />
          <Endpoint
            method="PATCH"
            path="/api/partners/[slug]"
            desc="Update partner fields. Any subset of fields can be sent."
            body={`{\n  "status": "active",\n  "brand_color": "#1D4ED8",\n  "template": "bold",\n  "fee_markup": 15000,\n  "admin_pin": "1234",\n  "monthly_fee_paid": true\n}`}
          />

          <H3 id="api-traders">Traders</H3>
          <Endpoint
            method="GET"
            path="/api/partners/[slug]/traders"
            desc="List all traders belonging to a partner (admin view)."
            response={`[\n  { "id": 1, "name": "John Adewale", "email": "john@gmail.com",\n    "status": "active", "kyc_status": "approved",\n    "created_at": "2026-01-10T09:00:00Z" }\n]`}
          />
          <Endpoint
            method="POST"
            path="/api/partners/[slug]/traders"
            desc="Create a new trader. Used by purchase flow and partner admin. Hashes password with argon2 if provided."
            body={`{\n  "name": "John Adewale",\n  "email": "john@gmail.com",\n  "password": "SecurePass123"\n}`}
            response={`{ "id": 5, "name": "John Adewale", "email": "john@gmail.com" }`}
          />
          <Endpoint
            method="PATCH"
            path="/api/partners/[slug]/traders/[id]"
            desc="Update trader name or change password. Requires valid trader session cookie."
            auth="Trader session cookie (ft9ja_trader_{slug})"
            body={`{\n  "name": "John A. Adewale",\n  "current_password": "OldPass",\n  "new_password": "NewPass123"\n}`}
          />

          <H3 id="api-evaluations">Evaluations</H3>
          <Endpoint
            method="GET"
            path="/api/partners/[slug]/evaluations"
            desc="List evaluations. With ?email= returns that trader's evals. Without email returns all (admin view with trader info)."
          />
          <Endpoint
            method="POST"
            path="/api/partners/[slug]/evaluations"
            desc="Create an evaluation purchase. Finds or creates the trader. Sets status to pending_payment."
            body={`{\n  "name": "John Adewale",\n  "email": "john@gmail.com",\n  "eval_type": "SS",\n  "amount": 149000\n}`}
            response={`{\n  "evaluation": { "id": 12, "status": "pending_payment",\n    "eval_type": "SS", "amount": "149000.00" },\n  "trader": { "id": 5, "email": "john@gmail.com" }\n}`}
          />
          <Endpoint
            method="PATCH"
            path="/api/partners/[slug]/evaluations/[id]"
            desc="Update evaluation — used by partner admin to activate after payment, or update progress metrics."
            auth="No auth required (PIN checked client-side before request in UI)"
            body={`{\n  "status": "active",\n  "current_profit": 4.5,\n  "current_drawdown": 2.1,\n  "trading_days": 7\n}`}
          />

          <H3 id="api-auth">Authentication (Trader)</H3>
          <Endpoint
            method="GET"
            path="/api/partners/[slug]/auth"
            desc="Check current trader session. Returns trader info or 401."
            response={`{ "trader": { "id": 5, "email": "john@gmail.com", "name": "John A." } }`}
          />
          <Endpoint
            method="POST"
            path="/api/partners/[slug]/auth"
            desc="Trader login. Verifies email + argon2 password. Sets HttpOnly session cookie."
            body={`{ "email": "john@gmail.com", "password": "SecurePass123" }`}
            response={`{ "trader": { "id": 5, "email": "john@gmail.com" } }`}
          />
          <Endpoint
            method="PATCH"
            path="/api/partners/[slug]/auth"
            desc="Set password for a trader who has no password yet (created via purchase flow)."
            body={`{ "email": "john@gmail.com", "password": "NewPass123" }`}
          />
          <Endpoint
            method="DELETE"
            path="/api/partners/[slug]/auth"
            desc="Logout — clears the session cookie."
          />
          <Endpoint
            method="POST"
            path="/api/partners/[slug]/auth/reset"
            desc="Request a password reset email. Stores token + expiry in traders table, sends link via Resend."
            body={`{ "email": "john@gmail.com" }`}
          />
          <Endpoint
            method="PUT"
            path="/api/partners/[slug]/auth/reset"
            desc="Confirm password reset using the token from the email link."
            body={`{\n  "email": "john@gmail.com",\n  "token": "abc123...",\n  "password": "NewSecurePass"\n}`}
          />

          <H3 id="api-kyc">KYC</H3>
          <Endpoint
            method="POST"
            path="/api/partners/[slug]/traders/[id]/kyc"
            desc="Trader submits KYC documents. Sets kyc_status to 'submitted'."
            auth="Trader session cookie"
            body={`{\n  "full_name": "John Adewale",\n  "id_type": "NIN",\n  "id_number": "12345678901",\n  "id_url": "https://ucarecdn.com/...",\n  "address": "12 Lagos Island, Lagos",\n  "selfie_url": "https://ucarecdn.com/..."\n}`}
          />
          <Endpoint
            method="PATCH"
            path="/api/partners/[slug]/traders/[id]/kyc"
            desc="Partner admin approves or rejects a KYC submission. Requires admin PIN in request body."
            auth="admin_pin in request body"
            body={`{\n  "admin_pin": "1234",\n  "kyc_status": "approved"\n}`}
          />

          {/* ── AUTH SYSTEMS ──────────────────────────────────────────── */}
          <H2 id="auth">Authentication</H2>
          <P>
            The platform uses <strong>two completely separate auth systems</strong>. They never
            intersect — do not confuse them.
          </P>

          <H3 id="auth-platform">Platform Auth (Better Auth)</H3>
          <P>
            Used for <strong>FT9ja internal accounts only</strong> — currently scaffolded but not
            actively used in the partner program UI. It powers the mobile app auth flow.
          </P>
          <Table
            headers={['Route', 'Description']}
            rows={[
              ['/api/auth/*', 'Better Auth catch-all handler'],
              ['/api/session', 'Returns current Better Auth session'],
              ['/api/auth/token', 'Returns JWT for mobile clients'],
              ['/api/auth/expo-web-success', 'PostMessages auth result to mobile WebView'],
              ['/account/signin', 'Better Auth sign-in page'],
              ['/account/signup', 'Better Auth sign-up page'],
              ['/account/logout', 'Better Auth logout'],
            ]}
          />

          <H3 id="auth-trader">Trader Auth (Custom Cookie Sessions)</H3>
          <P>
            Each partner has its own isolated auth domain. Trader sessions are stored as an
            HMAC-signed base64 JSON cookie named <Code>ft9ja_trader_&#123;slug&#125;</Code>{' '}
            (HttpOnly, SameSite=Strict). The token contains trader ID, email, slug, and an expiry
            timestamp. Passwords are hashed with <strong>argon2id</strong>.
          </P>
          <CodeBlock label="Cookie format (decoded)">{`{
  "traderId": 5,
  "email": "john@gmail.com",
  "slug": "apexfunds",
  "exp": 1783000000   // Unix timestamp
}`}</CodeBlock>
          <Callout type="warning">
            The trader auth cookie is <strong>slug-scoped</strong>. A trader logged in at apexfunds
            cannot access another partner's dashboard even with the same email.
          </Callout>

          {/* ── DATABASE ──────────────────────────────────────────────── */}
          <H2 id="db-schema">Database</H2>
          <P>
            All tables live in a single Neon PostgreSQL 17 database. Schema is defined with{' '}
            <Code>Drizzle ORM</Code> under <Code>src/db/schema/</Code>. Run{' '}
            <Code>npm run db:generate</Code> to create migrations and <Code>npm run db:push</Code>{' '}
            to sync schema to Neon.
          </P>

          <H3>partners</H3>
          <Table
            headers={['Column', 'Type', 'Default', 'Notes']}
            rows={[
              ['id', 'SERIAL PK', '—', 'Auto-increment'],
              ['slug', 'VARCHAR(100)', '—', 'UNIQUE. URL identifier'],
              ['firm_name', 'VARCHAR(255)', '—', 'Display name'],
              ['owner_name', 'VARCHAR(255)', 'NULL', '—'],
              ['owner_email', 'VARCHAR(255)', '—', 'Contact email'],
              ['logo_url', 'TEXT', 'NULL', 'Uploadcare CDN URL'],
              ['brand_color', 'VARCHAR(7)', '#16A34A', 'Primary hex'],
              ['secondary_color', 'VARCHAR(7)', '#F59E0B', 'Secondary hex'],
              ['tagline', 'TEXT', 'Trade smarter...', 'Hero headline'],
              ['description', 'TEXT', 'NULL', '—'],
              ['template', 'VARCHAR(20)', 'minimal', 'minimal | bold | dark'],
              ['status', 'VARCHAR(20)', 'pending', 'pending | active | suspended'],
              ['admin_pin', 'VARCHAR(20)', 'none', 'Generated partner admin PIN'],
              ['fee_markup', 'NUMERIC(10,2)', '0', 'Added to base eval prices'],
              ['monthly_fee_paid', 'BOOLEAN', 'false', '—'],
              ['setup_fee_waived', 'BOOLEAN', 'false', '—'],
              ['total_traders', 'INTEGER', '0', 'Incremented on trader create'],
              ['total_revenue', 'NUMERIC(14,2)', '0', 'Incremented on eval purchase'],
              ['payment_proof_url', 'TEXT', 'NULL', 'Setup fee proof upload'],
              ['created_at', 'TIMESTAMP', 'now()', '—'],
              ['updated_at', 'TIMESTAMP', 'now()', '—'],
            ]}
          />

          <H3>traders</H3>
          <Table
            headers={['Column', 'Type', 'Notes']}
            rows={[
              ['id', 'SERIAL PK', '—'],
              ['partner_id', 'INT FK → partners.id', 'CASCADE DELETE'],
              ['name', 'VARCHAR(255)', '—'],
              ['email', 'VARCHAR(255)', '—'],
              ['password_hash', 'TEXT', 'argon2id hash — NULL until trader sets password'],
              ['status', 'VARCHAR(20)', 'active | suspended'],
              ['reset_token', 'TEXT', 'Password reset token'],
              ['reset_token_expires', 'TIMESTAMP', 'Token expiry'],
              ['kyc_status', 'VARCHAR(20)', 'not_started | submitted | approved | rejected'],
              ['kyc_full_name', 'TEXT', 'Legal name'],
              ['kyc_id_type', 'VARCHAR(50)', 'NIN / Passport / etc.'],
              ['kyc_id_number', 'VARCHAR(100)', 'Document number'],
              ['kyc_id_url', 'TEXT', 'Uploadcare URL'],
              ['kyc_address', 'TEXT', 'Residential address'],
              ['kyc_selfie_url', 'TEXT', 'Optional selfie URL'],
              ['kyc_submitted_at', 'TIMESTAMP', '—'],
              ['created_at', 'TIMESTAMP', 'now()'],
            ]}
          />

          <H3>evaluations</H3>
          <Table
            headers={['Column', 'Type', 'Notes']}
            rows={[
              ['id', 'SERIAL PK', '—'],
              ['trader_id', 'INT FK → traders.id', 'CASCADE DELETE'],
              ['partner_id', 'INT FK → partners.id', 'CASCADE DELETE'],
              ['eval_type', 'VARCHAR(10)', 'SS or SSL'],
              ['amount', 'NUMERIC(12,2)', 'Price paid incl. fee markup'],
              ['status', 'VARCHAR(20)', 'pending_payment | active | passed | failed | suspended'],
              ['profit_target', 'NUMERIC(5,2)', 'Default: 10.0 (SS) / 8.0 (SSL)'],
              ['current_profit', 'NUMERIC(5,2)', 'Updated by partner admin or integration'],
              ['max_drawdown', 'NUMERIC(5,2)', 'Default: 10.0 (SS) / 8.0 (SSL)'],
              ['current_drawdown', 'NUMERIC(5,2)', 'Updated live'],
              ['trading_days', 'INTEGER', 'Completed trading days'],
              ['required_days', 'INTEGER', 'Default: 30 (SS) / 21 (SSL)'],
              ['purchase_date', 'TIMESTAMP', 'now()'],
              ['updated_at', 'TIMESTAMP', 'now()'],
              ['payout_status', 'ENUM', 'NULL', 'processing | paid — set after eval passes'],
            ]}
          />

          <H3>trader_requests</H3>
          <Table
            headers={['Column', 'Type', 'Notes']}
            rows={[
              ['id', 'SERIAL PK', '—'],
              ['trader_id', 'INT FK → traders.id', 'CASCADE DELETE'],
              ['partner_id', 'INT FK → partners.id', 'CASCADE DELETE'],
              ['eval_id', 'INT FK → evaluations.id', 'CASCADE DELETE'],
              ['request_type', 'ENUM', 'talent_bonus | aso_payout_ssl | aso_account'],
              ['notes', 'TEXT', 'Trader notes'],
              ['admin_notes', 'TEXT', 'Admin response'],
              ['status', 'ENUM', 'pending | approved | rejected'],
              ['created_at', 'TIMESTAMP', 'now()'],
              ['updated_at', 'TIMESTAMP', 'now()'],
            ]}
          />

          <H3>partner_payout_requests</H3>
          <Table
            headers={['Column', 'Type', 'Notes']}
            rows={[
              ['id', 'SERIAL PK', '—'],
              ['partner_id', 'INT FK → partners.id', 'CASCADE DELETE'],
              ['amount_requested', 'NUMERIC(14,2)', '—'],
              ['bank_name', 'TEXT', '—'],
              ['account_number', 'TEXT', '—'],
              ['account_name', 'TEXT', '—'],
              ['notes', 'TEXT', 'Optional'],
              ['status', 'ENUM', 'pending | approved | rejected | paid'],
              ['created_at', 'TIMESTAMP', 'now()'],
            ]}
          />

          {/* ── EMAIL TEMPLATES ───────────────────────────────────────── */}
          <H2 id="emails">Email Templates</H2>
          <P>
            20 HTML email templates are available at{' '}
            <Link href="/admin/emails" className="text-[#16A34A] underline font-semibold">
              /admin/emails
            </Link>
            . All templates are self-contained, mobile-responsive HTML with inline CSS, compatible
            with Gmail, Outlook, Apple Mail, and Yahoo Mail.
          </P>
          <Table
            headers={['#', 'Filename', 'When to Send']}
            rows={[
              ['P-01', 'p-01-welcome.html', 'Partner application approved'],
              ['P-02', 'p-02-firm-live.html', 'Firm status goes active for first time'],
              ['P-03', 'p-03-invoice.html', '1st of each month — license invoice'],
              ['P-04', 'p-04-payment-confirmed.html', 'License payment confirmed'],
              ['P-05', 'p-05-payment-overdue.html', '7+ days after missed payment'],
              ['P-06', 'p-06-suspension.html', 'Firm suspended for non-payment'],
              ['P-07', 'p-07-monthly-report.html', 'Last day of each month — stats'],
              ['P-08', 'p-08-trader-milestone.html', 'At 10, 25, 50, 100 traders reached'],
              ['P-09', 'p-09-feature-update.html', 'Significant platform feature releases'],
              ['P-10', 'p-10-compliance.html', 'Policy or legal updates'],
              ['T-01', 't-01-welcome.html', 'Trader account created'],
              ['T-02', 't-02-eval-pending.html', 'Evaluation order placed, awaiting payment'],
              ['T-03', 't-03-eval-activated.html', 'Partner confirms payment, eval goes active'],
              ['T-04', 't-04-weekly-progress.html', 'Every Monday for active evaluations'],
              ['T-05', 't-05-drawdown-warning.html', 'Drawdown reaches 80% of maximum limit'],
              ['T-06', 't-06-profit-target.html', 'Profit target hit, days requirement pending'],
              ['T-07', 't-07-eval-passed.html', 'All eval conditions met — trader passes'],
              ['T-08', 't-08-eval-failed.html', 'Rule breach or max drawdown hit'],
              ['T-09', 't-09-kyc-reminder.html', '24 hours after signup with no KYC started'],
              ['T-10', 't-10-kyc-approved.html', 'Partner approves trader KYC'],
            ]}
          />
          <Callout type="info">
            All <Code>&#123;&#123;VARIABLE&#125;&#125;</Code> placeholders must be replaced with
            real values before sending. Download the ZIP from the email templates page for the full
            variable reference.
          </Callout>

          {/* ── SUPER ADMIN ───────────────────────────────────────────── */}
          <H2 id="super-admin">Super Admin</H2>
          <P>
            The super admin panel at <Code>/admin</Code> is password-protected using the{' '}
            <Code>SUPER_ADMIN_PASSWORD</Code> environment variable. It provides a complete view of
            all partners on the platform.
          </P>
          <Table
            headers={['Feature', 'Description']}
            rows={[
              [
                'Partner List',
                'View all registered firms with status, trader count, revenue, and fee payment status',
              ],
              ['Approve', 'Moves a pending partner to active — their storefront goes live'],
              ['Reject', 'Moves a pending partner to suspended'],
              ['Suspend', "Temporarily disables an active partner's storefront"],
              ['Reinstate', 'Restores a suspended partner to active'],
              ['View Partner Admin', 'Deep links to /{slug}/admin for any partner'],
              ['Email Templates', 'Access 20 HTML templates and download ZIP'],
              ['Documentation', 'This page'],
            ]}
          />
          <Callout type="warning">
            Set <Code>SUPER_ADMIN_PASSWORD</Code> in every deployed environment. Do not use a{' '}
            <Code>NEXT_PUBLIC_</Code> variable for this value.
          </Callout>

          {/* ── ENV VARS ──────────────────────────────────────────────── */}
          <H2 id="env-vars">Environment Variables</H2>
          <Table
            headers={['Variable', 'Where Used', 'Description']}
            rows={[
              ['DATABASE_URL', 'Backend', 'Neon PostgreSQL connection string'],
              [
                'RESEND_API_KEY',
                'Backend (send-email.js)',
                'Resend API key for sending transactional emails',
              ],
              [
                'AUTH_SECRET / BETTER_AUTH_SECRET',
                'Backend (auth.ts)',
                'Better Auth session signing secret',
              ],
              [
                'AUTH_URL / BETTER_AUTH_URL',
                'Backend (auth.ts)',
                'Canonical app URL for Better Auth',
              ],
              [
                'NEXT_PUBLIC_CREATE_BASE_URL',
                'Backend (API routes)',
                'Base URL for Anything platform integrations (logo gen)',
              ],
              [
                'ANYTHING_PROJECT_TOKEN',
                'Backend (API routes)',
                'Bearer token for integration API calls',
              ],
              ['AWS_ACCESS_KEY_ID', 'Backend (API routes)', 'AWS access key for S3 uploads'],
              ['AWS_SECRET_ACCESS_KEY', 'Backend (API routes)', 'AWS secret key for S3 uploads'],
              ['AWS_REGION', 'Backend (API routes)', 'AWS region for the receipt bucket'],
              ['AWS_S3_BUCKET', 'Backend (API routes)', 'S3 bucket for uploaded receipts'],
              ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'Frontend', 'Google Maps API key (if maps used)'],
              [
                'STRIPE_SECRET_KEY',
                'Backend (if Stripe added)',
                'Stripe secret for payments (currently unused)',
              ],
            ]}
          />
          <Callout type="info">
            Environment variables prefixed with <Code>NEXT_PUBLIC_</Code> are exposed to the
            browser. Never put secrets in <Code>NEXT_PUBLIC_</Code> variables. All secret values
            should only be read in API route handlers or server-side code.
          </Callout>

          {/* Footer */}
          <div className="mt-16 rounded-xl border border-gray-200 bg-white p-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#16A34A]">
                <span className="text-xs font-black text-white">FT</span>
              </div>
              <span className="text-sm font-black text-gray-900">9ja Internal Docs</span>
            </div>
            <p className="text-xs text-gray-400">
              Last updated: June 2026 · FT9ja Partner Platform v1.0 ·{' '}
              <Link href="/admin" className="text-[#16A34A] hover:underline">
                Back to Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
