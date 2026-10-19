'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DailyDrawdownTab, TradingDaysTab } from './calendar-tabs';
import { ProgressTab } from './progress-tab';
import { PanelLoading, PanelMessage, type PerformanceResponse } from './shared';
import { TradingHistoryTab } from './trading-history-tab';

const REFRESH_MS = 5 * 60_000;

const TABS = [
  { id: 'progress', label: 'Progress' },
  { id: 'daily-drawdown', label: 'Daily DrawDown' },
  { id: 'trading-days', label: 'Minimum Trading Days' },
  { id: 'history', label: 'Trading History' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function EvaluationPerformanceTabs({
  slug,
  evaluationId,
  primary,
  accountLinked,
  hasProfitTarget,
  startDate,
}: {
  slug: string;
  evaluationId: number;
  primary: string;
  accountLinked: boolean;
  hasProfitTarget: boolean;
  startDate: string | null;
}) {
  const [tab, setTab] = useState<TabId>('progress');

  const { data, isLoading, isError } = useQuery<PerformanceResponse>({
    queryKey: ['evaluation-performance', slug, evaluationId],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/evaluations/${evaluationId}/performance`);
      if (!res.ok) throw new Error('Failed to load trading performance');
      return res.json();
    },
    enabled: accountLinked && tab !== 'history',
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
  });

  const performance = data?.performance ?? null;

  let body: React.ReactNode;
  if (!accountLinked) {
    body = <PanelMessage>Link your MT5 account to see your trading performance.</PanelMessage>;
  } else if (tab === 'history') {
    body = <TradingHistoryTab slug={slug} evaluationId={evaluationId} primary={primary} />;
  } else if (isLoading) {
    body = <PanelLoading label="Loading chart..." />;
  } else if (isError && !performance) {
    body = <PanelMessage>Could not load trading data. Please try again shortly.</PanelMessage>;
  } else if (!performance) {
    body = (
      <PanelMessage>
        No trade data yet. It appears here after your first sync (within about 15 minutes).
      </PanelMessage>
    );
  } else if (tab === 'progress') {
    body = <ProgressTab performance={performance} primary={primary} hasProfitTarget={hasProfitTarget} />;
  } else if (tab === 'daily-drawdown') {
    body = <DailyDrawdownTab performance={performance} startDate={startDate} />;
  } else {
    body = <TradingDaysTab performance={performance} startDate={startDate} primary={primary} />;
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto border-b border-gray-200" role="tablist">
        <div className="flex min-w-max">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`border-r border-gray-200 px-5 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={active ? { backgroundColor: primary } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6" role="tabpanel">
        {body}
      </div>
    </div>
  );
}
