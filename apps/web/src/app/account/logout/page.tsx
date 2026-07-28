'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LogoutPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F7F4EF] px-6 text-center">
      <p className="text-sm text-gray-600">Redirecting…</p>
      <Link href="/" className="text-sm text-gray-900 underline underline-offset-2">
        Home
      </Link>
    </main>
  );
}
