import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/utils/send-email', () => ({ sendEmail: vi.fn() }));

import { sendEmail } from '@/app/api/utils/send-email';
import { sendAccountCheckAlert } from './account-checks-alert';

const summary = {
  check: 'daily_drawdown' as const,
  started_at: '2026-10-20T22:30:00.000Z',
  finished_at: '2026-10-20T22:31:00.000Z',
  checked: 40,
  flagged: [],
  errors: 3,
  failures: [{ number: 1001, message: 'connection reset' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ACCOUNT_CHECKS_ALERT_EMAIL;
});

describe('sendAccountCheckAlert', () => {
  it('emails per-account errors to the dev address', async () => {
    await sendAccountCheckAlert('daily_drawdown', { summary });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dev5.ft9a@gmail.com',
        subject: '[FT9ja cron] daily_drawdown: 3 account errors',
        text: expect.stringContaining('MT5 1001: connection reset\n  …and 2 more'),
      })
    );
  });

  it('emails a failed run with the error and honours the env override', async () => {
    process.env.ACCOUNT_CHECKS_ALERT_EMAIL = 'ops@example.com';

    await sendAccountCheckAlert('inactivity', { error: new Error('MONGODB_URL is not configured') });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        subject: '[FT9ja cron] inactivity failed',
        text: expect.stringContaining('MONGODB_URL is not configured'),
      })
    );
  });

  it('does not throw when the email cannot be sent', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('SendGrid down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendAccountCheckAlert('inactivity', { summary })).resolves.toBeUndefined();
    log.mockRestore();
  });
});
