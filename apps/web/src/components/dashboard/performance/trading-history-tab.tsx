'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import {
  formatDateTime,
  PanelLoading,
  PanelMessage,
  type TradeHistoryRow,
  type TradesResponse,
} from './shared';

const PAGE_SIZE = 20;

type ShortFilter = 'all' | 'short' | 'long';

function formatNumber(value: number | null, digits = 5) {
  return value == null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function TradeDetails({ trade }: { trade: TradeHistoryRow }) {
  const rows: [string, string][] = [
    ['Volume', formatNumber(trade.volume, 2)],
    ['Open price', formatNumber(trade.price_open)],
    ['Close price', formatNumber(trade.price_close)],
    ['Open time', formatDateTime(trade.time_open)],
    ['Close time', formatDateTime(trade.time_close)],
    ['Duration (mins)', formatNumber(trade.duration_minutes, 2)],
    ['Comment', trade.comment || '—'],
    ['Short trade (< 5 mins)', trade.short_trade ? 'Yes' : 'No'],
  ];
  return (
    <dl className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 text-xs">
          <dt className="text-gray-400">{label}</dt>
          <dd className="text-right font-medium text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TradingHistoryTab({
  slug,
  evaluationId,
  primary,
}: {
  slug: string;
  evaluationId: number;
  primary: string;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ShortFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching } = useQuery<TradesResponse>({
    queryKey: ['evaluation-trades', slug, evaluationId, page, PAGE_SIZE, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (filter !== 'all') params.set('short', String(filter === 'short'));
      const res = await fetch(
        `/api/partners/${slug}/evaluations/${evaluationId}/trades?${params.toString()}`,
      );
      if (!res.ok) throw new Error('Failed to load trading history');
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const trades = data?.trades ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Trading history</h3>
          <p className="text-xs text-gray-400">Closed positions, newest first.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as ShortFilter);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
            aria-label="Filter by trade duration"
          >
            <option value="all">All trades</option>
            <option value="short">Under 5 minutes</option>
            <option value="long">5 minutes or longer</option>
          </select>
          <a
            href={`/${slug}/dashboard/report?eval_id=${evaluationId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: primary, color: primary }}
          >
            Full History <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {isLoading ? (
        <PanelLoading label="Loading trades..." />
      ) : isError ? (
        <PanelMessage>Could not load trading history. Please try again shortly.</PanelMessage>
      ) : trades.length === 0 ? (
        <PanelMessage>
          {filter === 'all'
            ? 'There is no trading history for this account.'
            : 'No trades match this filter.'}
        </PanelMessage>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
                  {[
                    'Position ID',
                    'Symbol',
                    'Volume',
                    'Open price',
                    'Close price',
                    'Open time',
                    'Close time',
                    'Duration (mins)',
                    'Comment',
                    '< 5 mins',
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr
                    key={`${t.position_id}-${i}`}
                    className={`border-b border-gray-50 ${i % 2 ? 'bg-gray-50/60' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">{t.position_id}</td>
                    <td className="px-3 py-2 text-gray-900">{t.symbol}</td>
                    <td className="px-3 py-2">{formatNumber(t.volume, 2)}</td>
                    <td className="px-3 py-2">{formatNumber(t.price_open)}</td>
                    <td className="px-3 py-2">{formatNumber(t.price_close)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(t.time_open)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(t.time_close)}</td>
                    <td className="px-3 py-2">{formatNumber(t.duration_minutes, 2)}</td>
                    <td className="max-w-40 truncate px-3 py-2 text-gray-500" title={t.comment}>
                      {t.comment || '—'}
                    </td>
                    <td
                      className={`px-3 py-2 font-medium ${t.short_trade ? 'text-orange-600' : 'text-gray-500'}`}
                    >
                      {t.short_trade ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {trades.map((t, i) => {
              const key = `${t.position_id}-${i}`;
              const open = expanded === key;
              return (
                <div key={key} className="rounded-lg border border-gray-200 p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : key)}
                    className="flex w-full items-center justify-between text-left"
                    aria-expanded={open}
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t.symbol}</div>
                      <div className="text-[11px] text-gray-400">
                        #{t.position_id} · {formatDateTime(t.time_close)}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && <TradeDetails trade={t} />}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {page} of {pageCount} ({total} trade{total === 1 ? '' : 's'})
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                disabled={page >= pageCount}
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
