import { describe, expect, it } from 'vitest';
import {
  addCalendarMonthsLagos,
  getPartnerLicenseFee,
  PARTNER_LICENSE_FEE,
  PARTNER_LICENSE_INTRO_FEE,
} from './partner-pricing';

describe('addCalendarMonthsLagos', () => {
  it('adds 3 calendar months from 18 Sep 2026 to 18 Dec 2026', () => {
    const activated = new Date(Date.UTC(2026, 8, 18, 0, 0, 0));
    const ends = addCalendarMonthsLagos(activated, 3);
    expect(ends.toISOString()).toBe('2026-12-18T00:00:00.000Z');
  });
});

describe('getPartnerLicenseFee', () => {
  const introEndsAt = new Date(Date.UTC(2026, 11, 18, 0, 0, 0));

  it('returns the standard fee when introEndsAt is null', () => {
    expect(getPartnerLicenseFee(null, new Date(Date.UTC(2026, 8, 18)))).toBe(PARTNER_LICENSE_FEE);
    expect(getPartnerLicenseFee(undefined, new Date(Date.UTC(2026, 8, 18)))).toBe(
      PARTNER_LICENSE_FEE
    );
  });

  it('returns the intro fee when periodStart is before introEndsAt', () => {
    expect(getPartnerLicenseFee(introEndsAt, new Date(Date.UTC(2026, 8, 18)))).toBe(
      PARTNER_LICENSE_INTRO_FEE
    );
    expect(getPartnerLicenseFee(introEndsAt, new Date(Date.UTC(2026, 9, 18)))).toBe(
      PARTNER_LICENSE_INTRO_FEE
    );
    expect(getPartnerLicenseFee(introEndsAt, new Date(Date.UTC(2026, 10, 18)))).toBe(
      PARTNER_LICENSE_INTRO_FEE
    );
    expect(getPartnerLicenseFee(introEndsAt, new Date(introEndsAt.getTime() - 1))).toBe(
      PARTNER_LICENSE_INTRO_FEE
    );
  });

  it('returns the standard fee when periodStart is on or after introEndsAt', () => {
    expect(getPartnerLicenseFee(introEndsAt, introEndsAt)).toBe(PARTNER_LICENSE_FEE);
    expect(getPartnerLicenseFee(introEndsAt, new Date(Date.UTC(2026, 11, 18)))).toBe(
      PARTNER_LICENSE_FEE
    );
  });

  it('prices a renewal on or after the intro window end at the standard fee', () => {
    const firstPeriodStart = new Date(Date.UTC(2026, 8, 18, 0, 0, 0));
    const ends = addCalendarMonthsLagos(firstPeriodStart, 3);
    expect(getPartnerLicenseFee(ends, ends)).toBe(PARTNER_LICENSE_FEE);
    const ninetyOneDaysLater = new Date(firstPeriodStart.getTime() + 91 * 24 * 60 * 60 * 1000);
    expect(getPartnerLicenseFee(ends, ninetyOneDaysLater)).toBe(PARTNER_LICENSE_FEE);
  });
});
