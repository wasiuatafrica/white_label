'use client';

import { DayCalendar, LegendSwatch, type CalendarCell } from './day-calendar';
import type { PerformanceDay, TradingPerformance } from './shared';

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const EMPTY: CalendarCell = { className: 'bg-gray-100 text-gray-400' };
const DD_GAIN: CalendarCell = { className: 'bg-green-700 text-white' };
const DD_LOW: CalendarCell = { className: 'bg-red-100 text-red-900' };
const DD_HIGH: CalendarCell = { className: 'bg-red-500 text-white' };
const DD_BREACH: CalendarCell = { className: 'bg-red-900 text-white' };

export function DailyDrawdownTab({
  performance,
  startDate,
}: {
  performance: TradingPerformance;
  startDate: string | null;
}) {
  const limit = performance.metrics.max_daily_drawdown;
  const half = limit / 2;

  const cellFor = (day: PerformanceDay | undefined) => {
    if (!day || (day.drawdown === 0 && day.profit <= 0)) return EMPTY;
    if (day.drawdown === 0) return DD_GAIN;
    if (day.drawdown < half) return DD_LOW;
    if (day.drawdown < limit) return DD_HIGH;
    return DD_BREACH;
  };

  const describe = (date: string, day: PerformanceDay | undefined) => {
    if (!day) return `${formatDay(date)}: no account data for this day.`;
    if (day.drawdown === 0) {
      return `${formatDay(date)}: no drawdown${day.profit !== 0 ? `, ${day.profit > 0 ? '+' : ''}${day.profit}% closed P&L` : ''}.`;
    }
    return `${formatDay(date)}: drawdown of ${day.drawdown}% (limit ${limit}%), ${day.profit > 0 ? '+' : ''}${day.profit}% closed P&L.`;
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h3 className="text-sm font-semibold text-gray-900">Your daily drawdown calendar</h3>
        <p className="mt-1 text-xs text-gray-400">
          Each box is a day. Select a box to see that day&apos;s drawdown. Worst day so far:{' '}
          <strong className="text-gray-700">{performance.metrics.daily_drawdown}%</strong> of{' '}
          {limit}% allowed.
        </p>
      </div>
      <DayCalendar
        days={performance.days}
        startDate={startDate}
        cellFor={cellFor}
        describe={describe}
        legend={
          <>
            <LegendSwatch label="No drawdown, in profit" {...DD_GAIN} />
            <LegendSwatch label={`Under ${half}%`} {...DD_LOW} />
            <LegendSwatch label={`${half}–${limit}%`} {...DD_HIGH} />
            <LegendSwatch label={`${limit}%+ (breach)`} {...DD_BREACH} />
            <LegendSwatch label="No activity" {...EMPTY} />
          </>
        }
      />
    </div>
  );
}

export function TradingDaysTab({
  performance,
  startDate,
}: {
  performance: TradingPerformance;
  startDate: string | null;
}) {
  const { trading_days, required_days } = performance.metrics;
  const traded: CalendarCell = { className: 'bg-green-600 text-white' };

  return (
    <div>
      <div className="mb-6 text-center">
        <h3 className="text-sm font-semibold text-gray-900">Your trading days calendar</h3>
        <p className="mt-1 text-xs text-gray-400">
          Each coloured box is a day you closed at least one trade.
        </p>
        <p className="mt-3 text-2xl font-black text-gray-900">
          {trading_days}
          <span className="text-sm font-semibold text-gray-400"> / {required_days} days</span>
        </p>
        <p className={`text-xs ${trading_days >= required_days ? 'text-green-600' : 'text-gray-400'}`}>
          {trading_days >= required_days
            ? 'Minimum trading days met'
            : `${required_days - trading_days} more trading day${required_days - trading_days === 1 ? '' : 's'} needed`}
        </p>
      </div>
      <DayCalendar
        days={performance.days}
        startDate={startDate}
        cellFor={(day) => (day?.traded ? traded : EMPTY)}
        describe={(date, day) =>
          day?.traded
            ? `${formatDay(date)}: traded on this day.`
            : `${formatDay(date)}: no trades closed on this day.`
        }
        legend={
          <>
            <LegendSwatch label="Traded" {...traded} />
            <LegendSwatch label="No trades" {...EMPTY} />
          </>
        }
      />
    </div>
  );
}
