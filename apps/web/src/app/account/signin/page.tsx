'use client';

import Link from 'next/link';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F7F4EF] px-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Sign-in unavailable</h1>
      <p className="max-w-md text-sm text-gray-600">
        Platform account auth is disabled. Use your partner firm login on your
        partner subdomain instead.
      </p>
      <Link href="/" className="text-sm text-gray-900 underline underline-offset-2">
        Back to home
      </Link>
    </main>
  );
}
