'use client';

import { PasswordInput } from '@/components/ui/password-input';
import { Loader2, Shield, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type AdminRow = {
  id: number;
  email: string;
  name: string;
  totp_enabled: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export function AdminsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ admins: AdminRow[]; max: number }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/admins');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const createAdmin = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed');
      return payload;
    },
    onSuccess: () => {
      setForm({ email: '', name: '', password: '' });
      setError(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const admins = data?.admins ?? [];
  const max = data?.max ?? 5;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-gray-700" />
          <h2 className="text-sm font-bold text-gray-900">Add admin ({admins.length}/{max})</h2>
        </div>
        {admins.length < max ? (
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <PasswordInput
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Temporary password (12+ chars)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Maximum of {max} admins reached.</p>
        )}
        {admins.length < max && (
          <button
            onClick={() => createAdmin.mutate()}
            disabled={createAdmin.isPending || !form.email || !form.name || form.password.length < 12}
            className="mt-3 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createAdmin.isPending ? 'Creating...' : 'Create admin'}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <p className="mt-3 text-xs text-gray-500">
          New admins must set up an authenticator app on first login. You can also run{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">yarn workspace web create-admin</code>{' '}
          from the terminal.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-gray-700" />
            <h2 className="text-sm font-bold text-gray-900">Admin accounts</h2>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-300" size={20} />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <div key={admin.id} className="px-5 py-4">
                <p className="text-sm font-semibold text-gray-900">{admin.name}</p>
                <p className="text-xs text-gray-500">{admin.email}</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  2FA {admin.totp_enabled ? 'enabled' : 'pending setup'}
                  {admin.last_login_at ? ` · last login ${new Date(admin.last_login_at).toLocaleString()}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
