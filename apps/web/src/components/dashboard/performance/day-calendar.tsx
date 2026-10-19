'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PerformanceDay } from './shared';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type CalendarCell = { className?: string; style?: React.CSSProperties };

type Month = { year: number; month: number };

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthsBetween(start: Month, end: Month) {
  const months: Month[] = [];
  let { year, month } = start;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return months;
}

function toMonth(date: Date): Month {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

/** UTC month-by-month calendar spanning the evaluation, newest month first. */
export function DayCalendar({
  days,
  startDate,
  cellFor,
  describe,
  legend,
}: {
  days: PerformanceDay[];
  startDate: string | null;
  cellFor: (day: PerformanceDay | undefined) => CalendarCell;
  describe: (date: string, day: PerformanceDay | undefined) => string;
  legend: React.ReactNode;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const months = useMemo(() => {
    const now = new Date();
    const candidates = [now];
    const purchase = startDate ? new Date(startDate) : null;
    if (purchase && !Number.isNaN(purchase.getTime())) candidates.push(purchase);
    if (days[0]) candidates.push(new Date(`${days[0].date}T00:00:00Z`));
    const earliest = new Date(Math.min(...candidates.map((d) => d.getTime())));
    return monthsBetween(toMonth(earliest), toMonth(now));
  }, [days, startDate]);

  const [index, setIndex] = useState(months.length - 1);
  const [selected, setSelected] = useState<string | null>(null);
  const current = months[Math.min(index, months.length - 1)] as Month;

  const firstWeekday = (new Date(Date.UTC(current.year, current.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(current.year, current.month + 1, 0)).getUTCDate();
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(Date.UTC(current.year, current.month, 1)).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index <= 0}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(i + 1, months.length - 1))}
          disabled={index >= months.length - 1}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-semibold uppercase text-gray-400">
            {d}
          </div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const key = dayKey(current.year, current.month, i + 1);
          const cell = cellFor(byDate.get(key));
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`aspect-square rounded-md text-[11px] font-medium transition-shadow ${cell.className ?? ''} ${selected === key ? 'ring-2 ring-gray-900 ring-offset-1' : ''} ${key === todayKey ? 'underline' : ''}`}
              style={cell.style}
              title={describe(key, byDate.get(key))}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-500">
        {legend}
      </div>

      <p className="mt-4 min-h-5 text-center text-sm text-gray-700">
        {selected ? describe(selected, byDate.get(selected)) : 'Select a day to see its details.'}
      </p>
      <p className="mt-1 text-center text-[11px] text-gray-400">Days are in UTC.</p>
    </div>
  );
}

export function LegendSwatch({ label, className, style }: CalendarCell & { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${className ?? ''}`} style={style} />
      {label}
    </span>
  );
}
