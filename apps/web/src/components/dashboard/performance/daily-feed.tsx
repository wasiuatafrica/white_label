'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyFeedDay } from '@/lib/trading-performance';
import { formatMoney, PanelLoading, PanelMessage, PROFIT_GREEN } from './shared';

const RANGES = [
  { days: 1, label: 'Current day' },
  { days: 3, label: 'Last 3 days' },
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
] as const;

const REFRESH_MS = 5 * 60_000;

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(t: number) {
  return new Date(t * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function DayCard({
  day,
  primary,
  dailyLimit,
}: {
  day: DailyFeedDay;
  primary: string;
  dailyLimit: number;
}) {
  const bars = [
    { name: 'Profit', value: day.profit, fill: day.profit >= 0 ? PROFIT_GREEN : '#DC2626' },
    {
      name: 'Drawdown',
      value: day.drawdown,
      fill: day.drawdown >= dailyLimit * 0.8 ? '#DC2626' : '#FCA5A5',
    },
  ];
  const values = day.points.flatMap((p) => [p.balance, p.equity]);
  const domain = [Math.floor(Math.min(...values) - 50), Math.ceil(Math.max(...values) + 50)];

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{formatDay(day.date)}</h4>
        <span className="text-xs text-gray-400">
          Profit{' '}
          <strong className={day.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            {day.profit > 0 ? '+' : ''}
            {day.profit}%
          </strong>{' '}
          · Drawdown{' '}
          <strong className={day.drawdown >= dailyLimit ? 'text-red-600' : 'text-gray-700'}>
            {day.drawdown}%
          </strong>{' '}
          of {dailyLimit}%{day.traded ? '' : ' · no trades closed'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)]">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} unit="%" axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#9CA3AF" />
              <ReferenceLine y={dailyLimit} stroke="#DC2626" strokeDasharray="3 3" />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, '']} cursor={false} />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={44} isAnimationActive={false}>
                {bars.map((b) => (
                  <Cell key={b.name} fill={b.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                  style={{ fontSize: 11, fontWeight: 600, fill: '#111827' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={day.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`feed-eq-${day.date}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F77E27" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F77E27" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`feed-bal-${day.date}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4353" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1D4353" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTime}
                tick={{ fontSize: 10 }}
                minTickGap={28}
              />
              <YAxis
                domain={domain}
                tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                tick={{ fontSize: 10 }}
                width={64}
              />
              <Tooltip
                labelFormatter={(t) => `${formatTime(Number(t))} UTC`}
                formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="#1D4353"
                fill={`url(#feed-bal-${day.date})`}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="equity"
                name="Equity"
                stroke="#F77E27"
                fill={`url(#feed-eq-${day.date})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** Per-day profit/drawdown and intraday equity/balance, like the FT9ja dashboard feed. */
export function DailyFeed({
  slug,
  evaluationId,
  primary,
  dailyLimit,
}: {
  slug: string;
  evaluationId: number;
  primary: string;
  dailyLimit: number;
}) {
  const [days, setDays] = useState<(typeof RANGES)[number]['days']>(1);

  const { data, isLoading, isError, isFetching } = useQuery<{ days: DailyFeedDay[] }>({
    queryKey: ['evaluation-daily-feed', slug, evaluationId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/partners/${slug}/evaluations/${evaluationId}/daily-feed?days=${days}`
      );
      if (!res.ok) throw new Error('Failed to load daily feed');
      return res.json();
    },
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
  });

  const feed = data?.days ?? [];

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Daily breakdown</h3>
          <p className="text-xs text-gray-400">
            Each day&apos;s profit, drawdown and intraday equity &amp; balance (UTC).
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-gray-200" role="group">
          {RANGES.map((r) => {
            const active = r.days === days;
            return (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                aria-pressed={active}
                className={`border-r border-gray-200 px-3 py-1.5 text-xs font-semibold last:border-r-0 ${active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={active ? { backgroundColor: primary } : undefined}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <PanelLoading label="Loading daily breakdown..." />
      ) : isError && feed.length === 0 ? (
        <PanelMessage>Could not load the daily breakdown. Please try again shortly.</PanelMessage>
      ) : feed.length === 0 ? (
        <PanelMessage>No daily data yet.</PanelMessage>
      ) : (
        <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {days === 1 && (
            <p className="text-xs text-gray-400">
              Showing the latest day with account data.
            </p>
          )}
          {feed.map((day) => (
            <DayCard key={day.date} day={day} primary={primary} dailyLimit={dailyLimit} />
          ))}
        </div>
      )}
    </div>
  );
}
