'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowRight,
  Loader2,
  Shield,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

type Partner = {
  id: number;
  slug: string;
  firm_name: string;
  brand_color: string;
  secondary_color: string;
  tagline: string;
  logo_url: string | null;
  logo_display_url?: string | null;
  status: string;
};

type View = 'signin' | 'register' | 'forgot' | 'set_password';

export default function TraderLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [view, setView] = useState<View>('signin');
  const [showPw, setShowPw] = useState(false);

  // Sign-in
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPw, setSignInPw] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);

  // Set-password (existing account with no password)
  const [setpwTraderId, setSetpwTraderId] = useState<number | null>(null);
  const [setpwEmail, setSetpwEmail] = useState('');
  const [setpwPassword, setSetpwPassword] = useState('');
  const [setpwConfirm, setSetpwConfirm] = useState('');
  const [setpwError, setSetpwError] = useState<string | null>(null);

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const { data: partner, isLoading } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/partners/${slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail.trim(), password: signInPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'no_password') {
          const err = new Error('no_password') as Error & { traderId?: number };
          err.traderId = data.traderId;
          throw err;
        }
        throw new Error(data.error || 'Login failed');
      }
      return data;
    },
    onSuccess: () => router.push(`/${slug}/dashboard`),
    onError: (err: Error & { traderId?: number }) => {
      if (err.message === 'no_account') {
        setSignInError('No account found with that email. Did you mean to register?');
      } else if (err.message === 'no_password') {
        setSetpwEmail(signInEmail.trim());
        setSetpwTraderId(err.traderId ?? null);
        setView('set_password');
        setSignInError(null);
      } else if (err.message === 'invalid_password') {
        setSignInError('Incorrect password. Try again or reset it below.');
      } else {
        setSignInError('Something went wrong. Please try again.');
      }
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async () => {
      if (setpwPassword !== setpwConfirm) throw new Error('Passwords do not match');
      if (setpwPassword.length < 8) throw new Error('Must be at least 8 characters');
      const res = await fetch(`/api/partners/${slug}/auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: setpwEmail,
          traderId: setpwTraderId,
          password: setpwPassword,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => router.push(`/${slug}/dashboard`),
    onError: (e: Error) => setSetpwError(e.message),
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (regPw !== regConfirm) throw new Error('Passwords do not match');
      if (regPw.length < 8) throw new Error('Password must be at least 8 characters');
      const res = await fetch(`/api/partners/${slug}/traders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), password: regPw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register');
      }
      // Auto-login
      const loginRes = await fetch(`/api/partners/${slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.trim(), password: regPw }),
      });
      if (!loginRes.ok) throw new Error('Registered — please sign in.');
      return loginRes.json();
    },
    onSuccess: () => router.push(`/${slug}/dashboard`),
    onError: (err: Error) => setRegError(err.message),
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/partners/${slug}/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => setForgotSent(true),
    onError: (e: Error) => setForgotError(e.message),
  });

  const primary = partner?.brand_color || '#16A34A';
  const firmName = partner?.firm_name || slug;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <div
          className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-gray-600"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
        <style jsx global>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!partner || partner.status === 'suspended') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EF] px-6">
        <p className="text-sm text-gray-500">This firm is not available.</p>
        <Link href="/" className="mt-3 text-xs text-gray-400 underline">
          Go to FT9ja
        </Link>
      </div>
    );
  }

  const isTabView = view === 'signin' || view === 'register';

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/${slug}`} className="flex items-center gap-2">
            {partner.logo_url ? (
              <img
                src={partner.logo_display_url ?? partner.logo_url}
                alt={firmName}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
            )}
            <span className="text-sm font-black text-gray-900">{firmName}</span>
          </Link>
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
          >
            Back to home <ChevronRight size={12} />
          </Link>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            {partner.logo_url ? (
              <img
                src={partner.logo_display_url ?? partner.logo_url}
                alt={firmName}
                className="mx-auto mb-4 h-14 w-14 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white shadow-sm"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
            )}
            <h1 className="text-xl font-black text-gray-900">{firmName}</h1>
            <p className="mt-1 text-sm text-gray-500">Trader Portal</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {isTabView && (
              <div className="flex border-b border-gray-100">
                {(['signin', 'register'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setView(t);
                      setSignInError(null);
                      setRegError(null);
                    }}
                    className={`flex-1 border-b-2 py-3.5 text-sm font-semibold transition-colors ${view === t ? 'text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    style={view === t ? { borderBottomColor: primary } : {}}
                  >
                    {t === 'signin' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {/* ── Sign In ── */}
              {view === 'signin' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={signInEmail}
                      onChange={(e) => {
                        setSignInEmail(e.target.value);
                        setSignInError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">Password</label>
                      <button
                        onClick={() => {
                          setForgotEmail(signInEmail);
                          setView('forgot');
                        }}
                        className="text-xs font-medium underline"
                        style={{ color: primary }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={signInPw}
                        onChange={(e) => {
                          setSignInPw(e.target.value);
                          setSignInError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && signInEmail && signInPw) signInMutation.mutate();
                        }}
                        placeholder="Your password"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {signInError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>
                        {signInError}
                        {signInError.includes('register') && (
                          <button
                            className="ml-1 font-semibold underline"
                            onClick={() => setView('register')}
                          >
                            Register here.
                          </button>
                        )}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => signInMutation.mutate()}
                    disabled={!signInEmail.trim() || !signInPw || signInMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {signInMutation.isPending ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                        Signing in...
                      </>
                    ) : (
                      <>
                        Access Dashboard <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    No account?{' '}
                    <button
                      className="font-semibold underline"
                      style={{ color: primary }}
                      onClick={() => setView('register')}
                    >
                      Register
                    </button>
                  </p>
                </div>
              )}

              {/* ── Set Password (existing account, first time) ── */}
              {view === 'set_password' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    <strong>Welcome back!</strong> Your account exists but has no password yet.
                    Create one to continue.
                  </div>
                  <p className="text-xs text-gray-500">
                    For: <strong>{setpwEmail}</strong>
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={setpwPassword}
                        onChange={(e) => {
                          setSetpwPassword(e.target.value);
                          setSetpwError(null);
                        }}
                        placeholder="At least 8 characters"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Confirm Password
                    </label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={setpwConfirm}
                      onChange={(e) => {
                        setSetpwConfirm(e.target.value);
                        setSetpwError(null);
                      }}
                      placeholder="Repeat password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>
                  {setpwError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" /> {setpwError}
                    </div>
                  )}
                  <button
                    onClick={() => setPasswordMutation.mutate()}
                    disabled={!setpwPassword || !setpwConfirm || setPasswordMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {setPasswordMutation.isPending ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                        Setting...
                      </>
                    ) : (
                      <>
                        Create Password & Sign In <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setView('signin')}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-700"
                  >
                    ← Back to sign in
                  </button>
                </div>
              )}

              {/* ── Register ── */}
              {view === 'register' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Create your trader account with {firmName}.
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setRegError(null);
                      }}
                      placeholder="John Adewale"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setRegError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={regPw}
                        onChange={(e) => {
                          setRegPw(e.target.value);
                          setRegError(null);
                        }}
                        placeholder="At least 8 characters"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Confirm Password
                    </label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={regConfirm}
                      onChange={(e) => {
                        setRegConfirm(e.target.value);
                        setRegError(null);
                      }}
                      placeholder="Repeat password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>
                  {regError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>
                        {regError.includes('already exists') ? (
                          <>
                            Account exists.{' '}
                            <button
                              className="font-semibold underline"
                              onClick={() => {
                                setSignInEmail(regEmail);
                                setView('signin');
                              }}
                            >
                              Sign in instead.
                            </button>
                          </>
                        ) : (
                          regError
                        )}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => registerMutation.mutate()}
                    disabled={
                      !regName.trim() ||
                      !regEmail.trim() ||
                      !regPw ||
                      !regConfirm ||
                      registerMutation.isPending
                    }
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Have an account?{' '}
                    <button
                      className="font-semibold underline"
                      style={{ color: primary }}
                      onClick={() => setView('signin')}
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}

              {/* ── Forgot Password ── */}
              {view === 'forgot' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setView('signin')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                  >
                    ← Back to sign in
                  </button>
                  <div>
                    <h2 className="text-base font-black text-gray-900">Forgot Password</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your email and we'll send a reset link.
                    </p>
                  </div>
                  {forgotSent ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-center">
                      <CheckCircle size={24} className="mx-auto mb-2 text-[#16A34A]" />
                      <p className="text-sm font-semibold text-green-800">Check your inbox</p>
                      <p className="mt-1 text-xs text-green-600">
                        If <strong>{forgotEmail}</strong> has an account, a reset link was sent.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            setForgotError(null);
                          }}
                          placeholder="you@example.com"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        />
                      </div>
                      {forgotError && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {forgotError}
                        </div>
                      )}
                      <button
                        onClick={() => forgotMutation.mutate()}
                        disabled={!forgotEmail.trim() || forgotMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                        style={{ backgroundColor: primary }}
                      >
                        {forgotMutation.isPending ? (
                          <>
                            <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                            Sending...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900">Ready to get funded?</p>
              <p className="text-xs text-gray-400 mt-0.5">Buy an evaluation to get started.</p>
            </div>
            <Link
              href={`/${slug}#evaluations`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Buy Now <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield size={12} />
            Powered by <span className="font-semibold text-[#16A34A]">FT9ja</span>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
