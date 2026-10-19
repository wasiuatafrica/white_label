'use client';

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
import { ACCOUNT_SIZE, formatMoney, PanelMessage, type TradingPerformance } from './shared';

function formatTickDate(t: number) {
  return new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProgressTab({
  performance,
  primary,
  hasProfitTarget,
}: {
  performance: TradingPerformance;
  primary: string;
  hasProfitTarget: boolean;
}) {
  const { metrics, series } = performance;
  const drawdownNearLimit = metrics.account_drawdown >= metrics.max_account_drawdown * 0.8;
  const bars = [
    {
      name: 'Profit',
      value: metrics.current_profit,
      fill: metrics.current_profit >= 0 ? primary : '#DC2626',
    },
    {
      name: 'Drawdown',
      value: metrics.account_drawdown,
      fill: drawdownNearLimit ? '#DC2626' : '#FCA5A5',
    },
  ];

  const values = series.flatMap((p) => [p.balance, p.equity]);
  const floor = ACCOUNT_SIZE * (1 - metrics.max_account_drawdown / 100);
  const target = ACCOUNT_SIZE * (1 + metrics.profit_target / 100);
  const lowest = Math.min(...values, floor);
  const highest = Math.max(...values, hasProfitTarget ? target : ACCOUNT_SIZE);
  const domain = [Math.floor(lowest - 100), Math.ceil(highest + 100)];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Profit vs Drawdown</h3>
        <p className="mb-4 text-xs text-gray-400">
          {hasProfitTarget ? `Target ${metrics.profit_target}% · ` : ''}Max drawdown{' '}
          {metrics.max_account_drawdown}%
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#9CA3AF" />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, '']} cursor={false} />
              <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={64}>
                {bars.map((b) => (
                  <Cell key={b.name} fill={b.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#111827' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Equity &amp; Balance</h3>
        <p className="mb-4 text-xs text-gray-400">
          Balance {metrics.latest_balance != null ? formatMoney(metrics.latest_balance) : '—'} ·
          Equity {metrics.latest_equity != null ? formatMoney(metrics.latest_equity) : '—'}
        </p>
        {series.length === 0 ? (
          <PanelMessage>No balance or equity data yet.</PanelMessage>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perf-equity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F77E27" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#F77E27" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="perf-balance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4353" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1D4353" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatTickDate}
                  tick={{ fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  domain={domain}
                  tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                  tick={{ fontSize: 11 }}
                  width={72}
                />
                <Tooltip
                  labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()}
                  formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
                />
                <ReferenceLine
                  y={floor}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{ value: 'Max drawdown', fontSize: 10, fill: '#DC2626', position: 'insideBottomLeft' }}
                />
                {hasProfitTarget && (
                  <ReferenceLine
                    y={target}
                    stroke="#16A34A"
                    strokeDasharray="4 4"
                    label={{ value: 'Profit target', fontSize: 10, fill: '#16A34A', position: 'insideTopLeft' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#1D4353"
                  fill="url(#perf-balance)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  name="Equity"
                  stroke="#F77E27"
                  fill="url(#perf-equity)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
