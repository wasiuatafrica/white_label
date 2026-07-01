'use client';

import { ClipboardList, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

type AuditRow = {
  id: number;
  admin_email: string;
  admin_name: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export function AuditTab() {
  const { data: rows = [], isLoading } = useQuery<AuditRow[]>({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-gray-700" />
          <h2 className="text-sm font-bold text-gray-900">Audit log</h2>
        </div>
        <p className="mt-1 text-xs text-gray-500">Who did what across super admin actions.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-gray-300" size={20} />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-500">No audit events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Admin</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Resource</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="text-gray-700">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.admin_name}</div>
                    <div className="text-gray-500">{row.admin_email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.resource_type}
                    {row.resource_id ? ` #${row.resource_id}` : ''}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                    {row.metadata ? JSON.stringify(row.metadata) : row.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
