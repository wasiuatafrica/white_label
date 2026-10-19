'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Inbox,
  Printer,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Fragment, use, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OrderAction, ReportPosition, TradeReport } from '@/lib/trading-report';

type Partner = {
  firm_name: string;
  brand_color: string;
  logo_url?: string | null;
  logo_display_url?: string | null;
};

type ReportResponse = { account_number: number | null; report: TradeReport | null };

const PAGE_SIZE = 50;

const FILTERS = [
  { value: 1, label: 'All Positions' },
  { value: 2, label: 'Closed (2+ tickets)' },
  { value: 3, label: 'Scaling (3+ tickets)' },
] as const;

const ACTION_CLS: Record<OrderAction, string> = {
  BUY: 'bg-green-100 text-green-700',
  SELL: 'bg-red-100 text-red-700',
  CLOSE_BY: 'bg-amber-100 text-amber-800',
  UNKNOWN: 'bg-gray-100 text-gray-600',
};

class ReportError extends Error {
  constructor(public status: number) {
    super(`Report request failed (${status})`);
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDiff(ms: number | null) {
  if (ms == null) return '-';
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function csvCell(value: string | number | boolean | null) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(positions: ReportPosition[], accountNumber: number | null) {
  const header = [
    'Position ID',
    'Symbol',
    'Ticket',
    'Time (UTC)',
    'Action',
    'Volume',
    'Time Diff',
    'Rapid (<5m)',
  ];
  const rows = positions.flatMap((p) =>
    p.tickets.map((t) => [
      p.position_id,
      p.symbol,
      t.ticket,
      t.time,
      t.action,
      t.volume,
      formatDiff(t.diff_ms),
      t.rapid ? 'YES' : '',
    ]),
  );
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `MT5_${accountNumber ?? 'report'}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  title,
  value,
  sub,
  icon,
  tile,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  tile: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="mt-1 text-sm text-gray-500">{sub}</p>
      </div>
      <div className={`rounded-lg p-3 text-white ${tile}`}>{icon}</div>
    </div>
  );
}

function TicketSequence({ position }: { position: ReportPosition }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Clock size={14} /> Ticket Sequence Analysis
      </h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500">
              {['Ticket ID', 'Time', 'Action', 'Vol', 'Time Diff', 'Rapid (<5m)'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {position.tickets.map((t, i) => (
              <tr key={`${t.ticket}-${i}`}>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-800">{t.ticket}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                  {formatDateTime(t.time)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${ACTION_CLS[t.action]}`}
                  >
                    {t.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">{t.volume ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-700">
                  {formatDiff(t.diff_ms)}
                </td>
                <td className="px-3 py-2">
                  {t.rapid ? (
                    <span className="inline-flex items-center gap-1 font-bold text-red-600">
                      <AlertCircle size={12} /> YES
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TradeReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const evaluationId = Number(searchParams.get('eval_id'));

  const [search, setSearch] = useState('');
  const [minTickets, setMinTickets] = useState<1 | 2 | 3>(2);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: partner } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const { data, isLoading, error } = useQuery<ReportResponse, ReportError>({
    queryKey: ['evaluation-trade-report', slug, evaluationId],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/evaluations/${evaluationId}/report`);
      if (!res.ok) throw new ReportError(res.status);
      return res.json();
    },
    enabled: Number.isInteger(evaluationId) && evaluationId > 0,
    retry: false,
  });

  const report = data?.report ?? null;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (report?.positions ?? []).filter(
      (p) =>
        p.ticket_count >= minTickets &&
        (!term || p.position_id.includes(term) || p.symbol.toLowerCase().includes(term)),
    );
  }, [report, search, minTickets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const primary = partner?.brand_color || '#16A34A';
  const firmName = partner?.firm_name || slug;
  const logo = partner?.logo_display_url ?? partner?.logo_url;

  let body: React.ReactNode;
  if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
    body = <StateMessage title="No account selected" text="Open this page from your dashboard." />;
  } else if (isLoading) {
    body = (
      <div className="flex flex-col items-center gap-3 py-24">
        <div
          className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-600"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
        <p className="text-sm text-gray-500">Loading report data...</p>
      </div>
    );
  } else if (error) {
    body =
      error.status === 401 ? (
        <StateMessage
          title="Sign in to view this report"
          text="Your session has expired or you don't have access to this account."
          action={
            <Link
              href={`/${slug}/login`}
              className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              Sign in
            </Link>
          }
        />
      ) : (
        <StateMessage title="Error loading report" text="Please try again shortly." />
      );
  } else if (!data?.account_number) {
    body = (
      <StateMessage
        title="MT5 account not linked"
        text="Link an MT5 account to see its trade history."
      />
    );
  } else if (!report || report.total_tickets === 0) {
    body = (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="mb-5 rounded-full bg-white p-6 shadow-sm">
          <Inbox size={36} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">No Trading Data Yet</h2>
        <p className="mt-2 text-sm text-gray-500">
          This account doesn&apos;t have any trade data to analyze yet.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Once trades are recorded, you&apos;ll see position insights here.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-8">
        <div className="flex flex-wrap justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={() => downloadCsv(filtered, data.account_number)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} /> Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Positions"
            value={report.total_positions}
            sub={`${report.total_tickets.toLocaleString()} total tickets`}
            icon={<FileText size={24} />}
            tile="bg-blue-500"
          />
          <StatCard
            title="Closed Positions"
            value={report.closed_positions}
            sub="Positions with > 1 ticket"
            icon={<Activity size={24} />}
            tile="bg-green-500"
          />
          <StatCard
            title="Complex Scaling"
            value={report.scaling_positions}
            sub="Positions with 3+ tickets"
            icon={<ArrowUpRight size={24} />}
            tile="bg-purple-500"
          />
          <StatCard
            title="Rapid Events"
            value={report.rapid_positions}
            sub="Positions with < 5min actions"
            icon={<Clock size={24} />}
            tile="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-800">Trades per Symbol</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, report.symbols.length * 28)}>
              <BarChart
                data={report.symbols}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar
                  dataKey="count"
                  name="Positions"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Orders per Position Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={report.orders_per_position}
                margin={{ top: 5, right: 20, left: 0, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="orders"
                  label={{ value: 'Tickets', position: 'insideBottom', offset: -10 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar
                  dataKey="count"
                  name="Positions"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="w-full md:w-auto">
              <h3 className="text-xl font-bold text-gray-900">Position Analysis</h3>
              <p className="text-sm text-gray-500">
                Deep dive into trade lifecycle and scaling behavior
              </p>
            </div>
            <div className="flex w-full gap-3 md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search Symbol or ID..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm md:w-64"
                />
              </div>
              <select
                value={minTickets}
                onChange={(e) => {
                  setMinTickets(Number(e.target.value) as 1 | 2 | 3);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                aria-label="Filter positions"
              >
                {FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {['', 'Position ID', 'Date', 'Symbol', 'Total Tickets', 'Warnings'].map(
                    (h, i) => (
                      <th key={`${h}-${i}`} className="whitespace-nowrap px-4 py-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                      No positions found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p) => {
                    const open = expanded === p.position_id;
                    return (
                      <Fragment key={p.position_id}>
                        <tr
                          onClick={() => setExpanded(open ? null : p.position_id)}
                          className={`cursor-pointer hover:bg-blue-50 ${open ? 'bg-blue-50' : ''}`}
                          aria-expanded={open}
                        >
                          <td className="px-4 py-3 text-gray-400">
                            {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                            {p.position_id}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {formatDate(p.entry_time)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700">
                              {p.symbol}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.ticket_count >= 3 ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {p.ticket_count}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.has_rapid && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600">
                                <Clock size={12} /> Rapid Actions
                              </span>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={6} className="px-4 pb-4">
                              <TicketSequence position={p} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {pageRows.length} of {filtered.length.toLocaleString()} positions
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2 print:hidden">
                <span>
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(currentPage + 1, pageCount))}
                  disabled={currentPage >= pageCount}
                  className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          Times are shown in your local time zone. Based on MT5 orders collected for this account.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-inter">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white print:static">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={firmName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
            )}
            <span className="truncate text-sm font-black text-gray-900">{firmName}</span>
            <span className="text-gray-300">/</span>
            <h1 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <Activity size={16} style={{ color: primary }} /> Trade Analyzer
              {data?.account_number ? (
                <span className="font-normal text-gray-400">· MT5 {data.account_number}</span>
              ) : null}
            </h1>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-6">{body}</main>
    </div>
  );
}

function StateMessage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-24 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
      {action}
    </div>
  );
}
