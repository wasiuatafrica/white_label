import { describe, expect, it } from 'vitest';
import { calculateTradingTelemetryMetrics } from './trading-telemetry';

describe('calculateTradingTelemetryMetrics', () => {
  it('calculates profit target, trading days, daily drawdown, and account drawdown', () => {
    const metrics = calculateTradingTelemetryMetrics([
      { account: 41121589, timestamp: 1781568000, balance: 10000, equity: 10000 },
      { account: 41121589, timestamp: 1781571600, balance: 9900, equity: 9400 },
      { account: 41121589, timestamp: 1781654400, balance: 10600, equity: 10500 },
      { account: 41121589, timestamp: 1781658000, balance: 10400, equity: 10300 },
      { account: 41121589, timestamp: 1781740800, balance: 12400, equity: 12350 },
      { account: 41121589, timestamp: 1781827200, balance: 12500, equity: 12450 },
    ]);

    expect(metrics).toMatchObject({
      latest_balance: 12500,
      latest_equity: 12450,
      current_profit: 25,
      profit_target: 25,
      trading_days: 2,
      required_days: 10,
      daily_drawdown: 6,
      max_daily_drawdown: 5,
      account_drawdown: 6,
      max_account_drawdown: 10,
      profit_target_passed: true,
      min_trading_days_passed: false,
      daily_drawdown_breached: true,
      account_drawdown_breached: false,
    });
  });

  it('returns null when there are no usable balance/equity points', () => {
    expect(calculateTradingTelemetryMetrics([])).toBeNull();
  });
});
