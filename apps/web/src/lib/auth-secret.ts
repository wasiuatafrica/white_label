const DEV_FALLBACK = 'ft9ja-dev-only-secret';

export function requireAuthSecret(envKeys: string[], label: string): string {
  for (const key of envKeys) {
    const value = process.env[key];
    if (value) return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${label} is required in production (${envKeys.join(' or ')})`);
  }

  return DEV_FALLBACK;
}

export function getTraderSessionSecret() {
  return requireAuthSecret(['AUTH_SECRET', 'BETTER_AUTH_SECRET'], 'Trader session secret');
}

export function getPartnerAdminSessionSecret() {
  return requireAuthSecret(
    ['PARTNER_ADMIN_SESSION_SECRET', 'BETTER_AUTH_SECRET', 'AUTH_SECRET'],
    'Partner admin session secret'
  );
}

export function getAdminSessionSecret() {
  return requireAuthSecret(
    ['ADMIN_SESSION_SECRET', 'BETTER_AUTH_SECRET', 'AUTH_SECRET'],
    'Admin session secret'
  );
}

export function getTraderSetupTokenSecret() {
  return requireAuthSecret(
    ['TRADER_SETUP_TOKEN_SECRET', 'BETTER_AUTH_SECRET', 'AUTH_SECRET'],
    'Trader setup token secret'
  );
}
