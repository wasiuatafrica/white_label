'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import QRCode from 'react-qr-code';

const LOGO_LIGHT =
  'https://dtvoeevhaseb5.cloudfront.net/user-uploads/4eccdbc1-dabd-439b-8e76-68c9cf5bb8a4.png';

type AdminInfo = { id: number; email: string; name: string };

type LoginStep = 'credentials' | 'totp' | 'totp-setup';

export function AdminLoginPanel({ onAuthed }: { onAuthed: (admin: AdminInfo) => void }) {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitCredentials() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Invalid credentials');
        return;
      }

      setPassword('');
      if (data.requiresTotpSetup) {
        setStep('totp-setup');
        await beginTotpSetup();
        return;
      }
      setStep('totp');
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function beginTotpSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/auth/setup-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'begin' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Failed to start authenticator setup');
        return;
      }
      setOtpauthUrl(data.otpauthUrl);
      setSetupSecret(data.secret);
    } catch {
      setError('Failed to start authenticator setup');
    } finally {
      setLoading(false);
    }
  }

  async function submitTotp() {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        step === 'totp-setup' ? '/api/admin/auth/setup-totp' : '/api/admin/auth/verify-totp';
      const body =
        step === 'totp-setup'
          ? { action: 'confirm', code }
          : { code };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Invalid authentication code');
        return;
      }

      setCode('');
      onAuthed(data.admin);
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-1.5">
            <img src={LOGO_LIGHT} alt="FT9ja" className="h-8 w-auto" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Super Admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'credentials' && 'Sign in with your admin account.'}
            {step === 'totp' && 'Enter the 6-digit code from your authenticator app.'}
            {step === 'totp-setup' && 'Set up your authenticator app to continue.'}
          </p>
        </div>

        {step === 'credentials' && (
          <>
            <input
              type="email"
              className="mb-3 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitCredentials();
              }}
            />
            <input
              type="password"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#16A34A]/20 ${error ? 'border-red-300 focus:border-red-300' : 'border-gray-200 focus:border-[#16A34A]'}`}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitCredentials();
              }}
            />
            <button
              onClick={() => void submitCredentials()}
              disabled={!email || !password || loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Continue
            </button>
          </>
        )}

        {(step === 'totp' || step === 'totp-setup') && (
          <>
            {step === 'totp-setup' && otpauthUrl && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-3 text-center text-xs font-semibold text-gray-800">
                  Scan with your authenticator app
                </p>
                <div className="mx-auto flex w-fit rounded-lg border border-gray-100 bg-white p-3">
                  <QRCode value={otpauthUrl} size={168} />
                </div>
                {setupSecret && (
                  <details className="mt-3 text-xs text-gray-500">
                    <summary className="cursor-pointer font-medium text-gray-700">
                      Can&apos;t scan? Enter key manually
                    </summary>
                    <p className="mt-2 break-all font-mono text-[11px] text-gray-600">{setupSecret}</p>
                  </details>
                )}
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`w-full rounded-lg border px-4 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-[#16A34A]/20 ${error ? 'border-red-300' : 'border-gray-200 focus:border-[#16A34A]'}`}
              placeholder="000000"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitTotp();
              }}
            />
            <button
              onClick={() => void submitTotp()}
              disabled={code.length !== 6 || loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Verify
            </button>
          </>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
