import type { TradeHistoryPage, TradingPerformance } from '@/lib/trading-performance';

export type { PerformanceDay, TradeHistoryPage, TradeHistoryRow, TradingPerformance } from '@/lib/trading-performance';

export type PerformanceResponse = { performance: TradingPerformance | null };
export type TradesResponse = TradeHistoryPage;

export const ACCOUNT_SIZE = 10000;
/** Gains are always green, whatever the partner's brand colour. */
export const PROFIT_GREEN = '#16A34A';

export function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PanelMessage({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-gray-400">{children}</p>;
}

export function PanelLoading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <div
        className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-gray-600"
        style={{ animation: 'spin 0.8s linear infinite' }}
      />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
