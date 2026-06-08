'use client';
import { use, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Shield, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

type Partner = {
  firm_name: string;
  brand_color: string;
  logo_url: string | null;
};

export default function ResetPasswordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: partner, isLoading } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirm) throw new Error('Passwords do not match');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      const res = await fetch(`/api/partners/${slug}/auth/reset`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => setError(e.message),
  });

  const primary = partner?.brand_color || '#16A34A';
  const firmName = partner?.firm_name || slug;

  if (!token || !email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EF] px-6">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-black text-gray-900">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-gray-500">
            This link is missing required information. Please request a new one.
          </p>
          <Link
            href={`/${slug}/login`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            {partner?.logo_url ? (
              <img
                src={partner.logo_url}
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
            <p className="mt-1 text-sm text-gray-500">Set a new password</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {done ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle size={40} className="mx-auto mb-4 text-[#16A34A]" />
                <h2 className="mb-2 text-base font-black text-gray-900">Password Updated!</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Your password has been changed. You can now sign in.
                </p>
                <Link
                  href={`/${slug}/login`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: primary }}
                >
                  Sign In Now
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <p className="mb-5 text-sm text-gray-500">
                  Resetting password for <strong className="text-gray-700">{email}</strong>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        placeholder="At least 8 characters"
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
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Confirm Password
                    </label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setError(null);
                      }}
                      placeholder="Repeat new password"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={() => resetMutation.mutate()}
                    disabled={!password || !confirm || resetMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {resetMutation.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Updating...
                      </>
                    ) : (
                      'Set New Password'
                    )}
                  </button>
                </div>

                <p className="mt-5 text-center text-xs text-gray-400">
                  Remember your password?{' '}
                  <Link
                    href={`/${slug}/login`}
                    className="font-semibold underline"
                    style={{ color: primary }}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield size={12} />
            Powered by <span className="font-semibold text-[#16A34A]">FT9ja</span>
          </div>
        </div>
      </div>
    </div>
  );
}
