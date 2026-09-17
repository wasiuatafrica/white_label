'use client';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLoginPanel } from '@/components/admin/admin-login-panel';
import { AdminsTab } from '@/components/admin/admins-tab';
import { AuditTab } from '@/components/admin/audit-tab';
import { adminTabPath, type AdminTabId } from '@/lib/admin-tabs';
import { getPartnerUrl, resolvePartnerAdminViewBounceUrl } from '@/lib/tenant';
import { splitVerifiedAmount, type EvalType } from '@/lib/partner-pricing';
import {
  getInvoiceLifecycleStatus,
  licenseLifecycleBadgeClass,
  licenseLifecycleLabel,
  nextDueAtForInvoice,
} from '@/lib/partner-license-billing';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  TrendingUp,
  Search,
  Eye,
  Mail,
  BookOpen,
  X,
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  Banknote,
  Loader2,
  ChevronRight,
  FileText,
  ZoomIn,
  MessageSquare,
  Shield,
  UserPlus,
  KeyRound,
  LogOut,
  ClipboardList,
  Gift,
  ShieldCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Partner = {
  id: number;
  slug: string;
  firm_name: string;
  owner_name: string;
  owner_email: string;
  brand_color: string;
  status: string;
  monthly_fee_paid: boolean;
  total_traders: number;
  total_revenue: string;
  payment_proof_url: string | null;
  admin_pin_configured: boolean;
  created_at: string;
  license_coverage?: {
    isCovered: boolean;
    status: 'paid' | 'waived' | 'receipt_uploaded' | 'overdue' | 'pending' | 'expired' | 'none' | 'exempt';
    periodStart: string | null;
    periodEnd: string | null;
    nextDueAt: string | null;
    latestInvoice?: unknown;
  };
};

type AdminLicenseInvoiceRow = {
  id: number;
  partner_id: number;
  invoice_number: string;
  amount: string;
  status: 'pending' | 'receipt_uploaded' | 'overdue' | 'paid' | 'waived';
  period_start: string;
  period_end: string;
  due_at: string;
  payment_proof_url?: string | null;
  receipt_uploaded_at?: string | null;
  paid_at?: string | null;
  verified_amount?: string | null;
  verified_by?: string | null;
  verification_note?: string | null;
  created_at: string;
  updated_at: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_owner_name: string | null;
  partner_owner_email: string;
  partner_status: string;
  partner_brand_color: string;
};

type KYCRow = {
  trader_id: number;
  trader_name: string;
  trader_email: string;
  kyc_status: string;
  kyc_full_name: string;
  kyc_id_type: string;
  kyc_id_number: string;
  kyc_id_url: string;
  kyc_address: string;
  kyc_selfie_url: string | null;
  kyc_submitted_at: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
};

type TraderRow = {
  trader_id: number;
  trader_name: string;
  trader_email: string;
  trader_status: string;
  kyc_status: string;
  trader_created_at: string;
  partner_id: number;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
  partner_status: string;
};

type TradeAccountRow = {
  trade_account_id: number;
  number: number;
  platform: string;
  broker: string;
  type_of_account: string;
  acc_size: string;
  creation_code: string;
  blown: boolean;
  inactive: boolean;
  has_aso: number | null;
  aso_account_number: number | null;
  created_at: string;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  partner_id: number;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
  partner_status: string;
  eval_id: number | null;
  eval_type: string | null;
  is_completed: boolean;
};

type PartnerSignupRow = {
  id: number;
  attempt_id: string;
  status: string;
  last_step: string;
  firm_name: string | null;
  slug: string | null;
  owner_name: string | null;
  owner_email: string | null;
  payment_method: string | null;
  form_data: {
    firm_name?: string;
    slug?: string;
    owner_name?: string;
    owner_email?: string;
    tagline?: string;
    brand_color?: string;
    secondary_color?: string;
    payment_method?: string;
    has_payment_proof?: boolean;
  };
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  abandoned_at: string | null;
  submitted_at: string | null;
};

type PaymentRow = {
  eval_id: number;
  eval_type: string;
  amount: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  status: string;
  purchase_date: string;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
};

type EvaluationPaymentRow = PaymentRow & {
  verified_amount: string | null;
  markup_amount: string | null;
  wholesale_amount: string | null;
  partner_earnings_amount: string | null;
  verification_note: string | null;
  profit_target: string;
  max_drawdown: string;
  required_days: number;
  partner_id: number;
  partner_status: string;
  fee_markup: string | null;
};

type PartnerPayoutRequestRow = {
  id: number;
  partner_id: number;
  amount_requested: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  notes: string | null;
  admin_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  partner_slug: string | null;
  partner_firm_name: string | null;
  partner_brand_color: string | null;
  available_balance: number;
};

type PayoutRow = {
  eval_id: number;
  eval_type: string;
  amount: string;
  payout_status: string | null;
  current_profit: string;
  trading_days: number;
  required_days: number;
  passed_at: string;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  kyc_status: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
};

type RequestRow = {
  id: number;
  request_type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  eval_id: number;
  eval_type: string;
  amount: string;
  eval_status: string;
  payout_status: string | null;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  kyc_status: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
};
type AsoRequestRow = {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  ss_account_id: number;
  ss_account_number: number;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  eligibility_profit: string | null;
  eligibility_profit_target: string | null;
  approval_token_expires_at: string | null;
  approval_token_used_at: string | null;
  aso_account_id: number | null;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  kyc_status: string;
  partner_slug: string;
  partner_firm_name: string;
  partner_brand_color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  if (status === 'active') return { label: 'Active', color: '#16A34A', dot: 'bg-green-500' };
  if (status === 'suspended') return { label: 'Suspended', color: '#DC2626', dot: 'bg-red-500' };
  return { label: 'Pending', color: '#F59E0B', dot: 'bg-yellow-500' };
}

function formatRevenue(v: string) {
  const n = parseFloat(v);
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n}`;
}

function formatDate(d: string) {
  if (!d) return '—';
  // Parse ISO string directly (e.g. "2026-06-05T09:30:00.000Z") without new Date()
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const datePart = d.split('T')[0] ?? '';
  const timePart = (d.split('T')[1] ?? '').replace('Z', '').split('.')[0] ?? '';
  const [yr, mo, day] = datePart.split('-');
  const [hh, mm] = timePart.split(':');
  const month = months[parseInt(mo ?? '1', 10) - 1] ?? '';
  return `${parseInt(day ?? '1', 10)} ${month} ${yr}, ${hh ?? '00'}:${mm ?? '00'}`;
}

function formatAccountType(type: string) {
  if (type === 'Synthetic-Signals') return 'SS';
  if (type === 'Synthetic-Signals-Lite') return 'SSL';
  if (type === 'Aso') return 'ASO';
  return type;
}

function formatPaymentMethod(method: string | null) {
  if (method === 'paypal') return 'PayPal';
  if (method === 'crypto') return 'Crypto';
  if (method === 'bank') return 'Bank Transfer';
  return method ? 'Transfer' : '—';
}

function formatSignupStep(step: string) {
  if (step === 'details') return 'Details';
  if (step === 'branding') return 'Branding';
  if (step === 'payment') return 'Payment';
  if (step === 'review') return 'Review';
  return step;
}

function getSignupStatusBadge(status: string) {
  if (status === 'abandoned') return <Badge color="amber">Abandoned</Badge>;
  if (status === 'submitted') return <Badge color="green">Submitted</Badge>;
  if (status === 'payment_started') return <Badge color="blue">Payment started</Badge>;
  if (status === 'continued') return <Badge color="gray">In progress</Badge>;
  return <Badge color="gray">Started</Badge>;
}

const REQUEST_META_ADMIN: Record<string, { label: string; icon: string }> = {
  talent_bonus: { label: 'Talent Bonus', icon: '🏆' },
  aso_payout_ssl: { label: 'Aso Payout (SSL)', icon: '💰' },
  aso_account: { label: 'Aso Account', icon: '🏦' },
};

function Badge({
  color,
  children,
}: {
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple';
  children: React.ReactNode;
}) {
  const styles = {
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[color]}`}
    >
      {children}
    </span>
  );
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {children}
      </tr>
    </thead>
  );
}

function AdminTh({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-3 ${className}`}>{children}</th>;
}

function AdminTd({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

// ─── KYC Review Drawer ────────────────────────────────────────────────────────

function KYCDrawer({
  row,
  onClose,
  onDecision,
  onOpenDocument,
  loading,
}: {
  row: KYCRow;
  onClose: () => void;
  onDecision: (status: 'approved' | 'rejected') => void;
  onOpenDocument: (documentUrl: string) => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              KYC Review
            </p>
            <h2 className="text-base font-black text-gray-900">{row.trader_name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Firm */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
              style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
            >
              {row.partner_firm_name[0]}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">{row.partner_firm_name}</div>
              <div className="text-xs text-gray-400">{row.partner_slug}.ft9ja.com</div>
            </div>
            <div className="ml-auto">
              {row.kyc_status === 'submitted' && <Badge color="amber">Submitted</Badge>}
              {row.kyc_status === 'approved' && <Badge color="green">Approved</Badge>}
              {row.kyc_status === 'rejected' && <Badge color="red">Rejected</Badge>}
            </div>
          </div>

          {/* Trader identity */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Identity
            </p>
            <div className="space-y-2 rounded-xl border border-gray-100 bg-white overflow-hidden">
              {[
                ['Legal Name', row.kyc_full_name],
                ['Email', row.trader_email],
                ['ID Type', row.kyc_id_type],
                ['ID Number', row.kyc_id_number],
                ['Address', row.kyc_address],
                ['Submitted', formatDate(row.kyc_submitted_at)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between px-4 py-2.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs font-medium text-gray-400 w-24 shrink-0">{label}</span>
                  <span className="text-xs text-gray-800 text-right">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Documents
            </p>
            <div className="grid grid-cols-2 gap-3">
              {row.kyc_id_url && (
                <button
                  type="button"
                  onClick={() => onOpenDocument(row.kyc_id_url)}
                  className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 transition-colors"
                >
                  <FileText size={20} className="text-gray-400 group-hover:text-[#16A34A]" />
                  <span className="text-xs font-medium text-gray-500">ID Document</span>
                  <ZoomIn size={12} className="text-gray-400" />
                </button>
              )}
              {row.kyc_selfie_url ? (
                <button
                  type="button"
                  onClick={() => onOpenDocument(row.kyc_selfie_url!)}
                  className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 transition-colors"
                >
                  <Eye size={20} className="text-gray-400 group-hover:text-[#16A34A]" />
                  <span className="text-xs font-medium text-gray-500">Selfie with ID</span>
                  <ZoomIn size={12} className="text-gray-400" />
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 p-5 opacity-40">
                  <Eye size={20} className="text-gray-300" />
                  <span className="text-xs text-gray-400">No selfie</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {row.kyc_status === 'submitted' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onDecision('rejected')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject KYC
              </button>
              <button
                onClick={() => onDecision('approved')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Approve KYC
              </button>
            </div>
          )}
          {row.kyc_status !== 'submitted' && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-xs text-gray-400">
              This KYC has already been{' '}
              <strong className={row.kyc_status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                {row.kyc_status}
              </strong>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Partners Tab ─────────────────────────────────────────────────────────────

function PartnersTab({
  onOpenReceipt,
  openingReceiptUrl,
}: {
  onOpenReceipt: (receiptUrl: string) => void;
  openingReceiptUrl: string | null;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openingAdminSlug, setOpeningAdminSlug] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery<Partner[]>({
    queryKey: ['admin-partners'],
    queryFn: async () => {
      const res = await fetch('/api/partners');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ slug, status }: { slug: string; status: string }) => {
      const res = await fetch(`/api/partners/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });

  const filtered = partners.filter((p) => {
    const matchSearch =
      p.firm_name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = partners.reduce((s, p) => s + parseFloat(p.total_revenue || '0'), 0);
  const activeCount = partners.filter((p) => p.status === 'active').length;
  const pendingCount = partners.filter((p) => p.status === 'pending').length;

  const openPartnerAdminView = async (slug: string) => {
    setOpeningAdminSlug(slug);
    try {
      const res = await fetch('/api/admin/partner-admin-view-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { view_token?: string };
      if (!data.view_token) return;
      window.open(
        resolvePartnerAdminViewBounceUrl(slug, data.view_token, window.location.origin),
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      console.error('Failed to open partner admin view:', error);
    } finally {
      setOpeningAdminSlug(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total Partners',
            value: partners.length,
            icon: <Users size={16} />,
            color: '#6B7280',
          },
          {
            label: 'Active Firms',
            value: activeCount,
            icon: <CheckCircle size={16} />,
            color: '#16A34A',
          },
          {
            label: 'Pending Review',
            value: pendingCount,
            icon: <Clock size={16} />,
            color: '#F59E0B',
          },
          {
            label: 'Platform Revenue',
            value: `₦${(totalRevenue / 1000).toFixed(0)}K`,
            icon: <TrendingUp size={16} />,
            color: '#2563EB',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <div className="mt-2 text-xl font-black text-gray-900 sm:text-2xl">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All Partners</h2>
            <p className="text-xs text-gray-400">{partners.length} registered firms</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#16A34A] sm:w-52"
                placeholder="Search partners..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 overflow-x-auto">
              {['all', 'active', 'pending', 'suspended'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors sm:px-3 ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading partners...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No partners found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Firm</AdminTh>
                <AdminTh>Email</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Receipt</AdminTh>
                <AdminTh>PIN</AdminTh>
                <AdminTh>Traders</AdminTh>
                <AdminTh>Revenue</AdminTh>
                <AdminTh>License</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const sc = getStatusConfig(p.status);
                  return (
                      <tr key={p.id} className="hover:bg-gray-50/80">
                        <AdminTd className="sm:px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                              style={{ backgroundColor: p.brand_color }}
                            >
                              {p.firm_name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{p.firm_name}</div>
                              <div className="text-xs text-gray-400">{p.slug}</div>
                            </div>
                          </div>
                        </AdminTd>
                        <AdminTd className="text-xs text-gray-600">{p.owner_email}</AdminTd>
                        <AdminTd>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium"
                            style={{ color: sc.color }}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </AdminTd>
                        <AdminTd>
                          {p.payment_proof_url ? (
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(p.payment_proof_url!)}
                              disabled={openingReceiptUrl === p.payment_proof_url}
                              className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              {openingReceiptUrl === p.payment_proof_url ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <FileText size={11} />
                              )}{' '}
                              Receipt
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                              <AlertTriangle size={11} /> None
                            </span>
                          )}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap text-xs text-gray-700">
                          {p.admin_pin_configured ? (
                            <span className="inline-flex items-center gap-1">
                              <KeyRound size={11} /> Configured
                            </span>
                          ) : (
                            'Not set'
                          )}
                        </AdminTd>
                        <AdminTd className="text-xs font-semibold text-gray-900">
                          {p.total_traders}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap text-xs font-semibold text-gray-900">
                          {formatRevenue(p.total_revenue)}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap">
                          <div className="text-sm font-semibold">
                            {p.license_coverage?.status === 'exempt' ? (
                              <span className="text-blue-600">Exempt</span>
                            ) : p.license_coverage?.isCovered &&
                              p.license_coverage.status === 'waived' ? (
                              <span className="text-blue-600">Complimentary</span>
                            ) : p.license_coverage?.isCovered ? (
                              <span className="text-[#16A34A]">Paid ✓</span>
                            ) : p.license_coverage?.status === 'receipt_uploaded' ? (
                              <span className="text-amber-600">Review</span>
                            ) : p.license_coverage?.status === 'overdue' ||
                              p.license_coverage?.status === 'expired' ? (
                              <span className="text-red-500">Expired</span>
                            ) : (
                              <span className="text-red-500">Unpaid</span>
                            )}
                          </div>
                          {p.license_coverage?.status === 'exempt' ? (
                            <div className="text-[10px] text-gray-400">No recurring fee</div>
                          ) : p.license_coverage?.periodEnd ? (
                            <div className="text-[10px] text-gray-400">
                              thru {formatDate(p.license_coverage.periodEnd)}
                            </div>
                          ) : null}
                        </AdminTd>
                        <AdminTd className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openPartnerAdminView(p.slug)}
                              disabled={openingAdminSlug === p.slug}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Eye size={12} /> {openingAdminSlug === p.slug ? 'Opening…' : 'View'}
                            </button>
                            {p.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateStatus.mutate({ slug: p.slug, status: 'active' })}
                                  disabled={updateStatus.isPending || !p.payment_proof_url}
                                  title={!p.payment_proof_url ? 'Receipt is required before approval' : ''}
                                  className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-1.5 text-xs font-medium text-[#16A34A] hover:bg-[#16A34A]/20 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    updateStatus.mutate({ slug: p.slug, status: 'suspended' })
                                  }
                                  disabled={updateStatus.isPending}
                                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {p.status === 'active' && (
                              <button
                                onClick={() =>
                                  updateStatus.mutate({ slug: p.slug, status: 'suspended' })
                                }
                                disabled={updateStatus.isPending}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}
                            {p.status === 'suspended' && (
                              <button
                                onClick={() => updateStatus.mutate({ slug: p.slug, status: 'active' })}
                                disabled={updateStatus.isPending}
                                className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-1.5 text-xs font-medium text-[#16A34A] disabled:opacity-50"
                              >
                                Reinstate
                              </button>
                            )}
                          </div>
                        </AdminTd>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KYC Queue Tab ────────────────────────────────────────────────────────────

function KYCTab() {
  const [selected, setSelected] = useState<KYCRow | null>(null);
  const [filter, setFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery<KYCRow[]>({
    queryKey: ['admin-kyc'],
    queryFn: async () => {
      const res = await fetch('/api/admin/kyc');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const decide = useMutation({
    mutationFn: async ({ trader_id, kyc_status }: { trader_id: number; kyc_status: string }) => {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trader_id, kyc_status }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-kyc'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setSelected(null);
    },
  });

  const openKycDocument = async (documentUrl: string) => {
    const opened = window.open('', '_blank');
    if (opened) {
      opened.opener = null;
    }

    try {
      const res = await fetch(`/api/admin/receipts?url=${encodeURIComponent(documentUrl)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Unable to open document');
      }

      if (opened) {
        opened.location.href = data.url;
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if (opened) opened.close();
      console.error(error);
      alert(error instanceof Error ? error.message : 'Unable to open document');
    }
  };

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.kyc_status === filter);
  const pendingCount = rows.filter((r) => r.kyc_status === 'submitted').length;

  return (
    <div className="space-y-5">
      {selected && (
        <KYCDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onDecision={(status) =>
            decide.mutate({ trader_id: selected.trader_id, kyc_status: status })
          }
          onOpenDocument={openKycDocument}
          loading={decide.isPending}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Awaiting Review',
            value: rows.filter((r) => r.kyc_status === 'submitted').length,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
          {
            label: 'Approved',
            value: rows.filter((r) => r.kyc_status === 'approved').length,
            color: '#16A34A',
            icon: <BadgeCheck size={16} />,
          },
          {
            label: 'Rejected',
            value: rows.filter((r) => r.kyc_status === 'rejected').length,
            color: '#DC2626',
            icon: <X size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">KYC Submissions</h2>
            <p className="text-xs text-gray-400">
              {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All up to date'}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {(['submitted', 'approved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors sm:px-3 ${filter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BadgeCheck size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">
              No {filter === 'all' ? '' : filter} submissions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Trader</AdminTh>
                <AdminTh>Email</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>ID Type</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className="text-right"> </AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr
                    key={row.trader_id}
                    className="cursor-pointer hover:bg-gray-50/80"
                    onClick={() => setSelected(row)}
                  >
                    <AdminTd className="sm:px-5">
                      <div className="font-semibold text-gray-900">{row.trader_name}</div>
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-600">{row.trader_email}</AdminTd>
                    <AdminTd className="text-xs text-gray-600">{row.partner_firm_name}</AdminTd>
                    <AdminTd className="text-xs text-gray-600">{row.kyc_id_type}</AdminTd>
                    <AdminTd>
                      {row.kyc_status === 'submitted' && <Badge color="amber">Submitted</Badge>}
                      {row.kyc_status === 'approved' && <Badge color="green">Approved</Badge>}
                      {row.kyc_status === 'rejected' && <Badge color="red">Rejected</Badge>}
                    </AdminTd>
                    <AdminTd className="text-right">
                      <ChevronRight size={14} className="ml-auto text-gray-300" />
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Traders Tab ─────────────────────────────────────────────────────────────

function TradersTab() {
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');

  const { data: rows = [], isLoading } = useQuery<TraderRow[]>({
    queryKey: ['admin-traders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/traders');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const partners = Array.from(
    new Map(
      rows.map((row) => [
        row.partner_id,
        {
          id: row.partner_id,
          slug: row.partner_slug,
          firmName: row.partner_firm_name,
          brandColor: row.partner_brand_color,
          status: row.partner_status,
        },
      ])
    ).values()
  );

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.trader_name.toLowerCase().includes(q) ||
      row.trader_email.toLowerCase().includes(q) ||
      row.partner_firm_name.toLowerCase().includes(q);
    const matchesPartner = partnerFilter === 'all' || String(row.partner_id) === partnerFilter;
    return matchesSearch && matchesPartner;
  });

  const grouped = partners
    .map((partner) => ({
      partner,
      traders: filtered.filter((row) => row.partner_id === partner.id),
    }))
    .filter((group) => group.traders.length > 0);

  const activeTraders = rows.filter((row) => row.trader_status === 'active').length;
  const kycApproved = rows.filter((row) => row.kyc_status === 'approved').length;

  const getKycBadge = (status: string) => {
    if (status === 'approved') return <Badge color="green">KYC Approved</Badge>;
    if (status === 'submitted') return <Badge color="amber">KYC Submitted</Badge>;
    if (status === 'rejected') return <Badge color="red">KYC Rejected</Badge>;
    return <Badge color="gray">No KYC</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Registered Traders',
            value: rows.length,
            color: '#111827',
            icon: <Users size={16} />,
          },
          {
            label: 'Active Traders',
            value: activeTraders,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
          {
            label: 'KYC Approved',
            value: kycApproved,
            color: '#2563EB',
            icon: <BadgeCheck size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Traders</h2>
            <p className="text-xs text-gray-400">
              {filtered.length} trader{filtered.length !== 1 ? 's' : ''} across {grouped.length}{' '}
              partner{grouped.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#16A34A] sm:w-56"
                placeholder="Search traders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#16A34A]"
            >
              <option value="all">All partners</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.firmName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading traders...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No registered traders yet.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No traders match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Trader</AdminTh>
                <AdminTh>Email</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>KYC</AdminTh>
                <AdminTh>Joined</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.trader_id} className="hover:bg-gray-50/80">
                    <AdminTd className="sm:px-5">
                      <div className="font-semibold text-gray-900">{row.trader_name}</div>
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-600">{row.trader_email}</AdminTd>
                    <AdminTd>
                      <div className="text-xs font-medium text-gray-900">{row.partner_firm_name}</div>
                      <div className="text-[11px] text-gray-400">{row.partner_slug}.ft9ja.com</div>
                    </AdminTd>
                    <AdminTd>
                      {row.trader_status === 'active' ? (
                        <Badge color="green">Active</Badge>
                      ) : (
                        <Badge color="gray">{row.trader_status}</Badge>
                      )}
                    </AdminTd>
                    <AdminTd>{getKycBadge(row.kyc_status)}</AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(row.trader_created_at)}
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trade Accounts Tab ───────────────────────────────────────────────────────

function TradeAccountsTab() {
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'blown'>('all');

  const { data: rows = [], isLoading } = useQuery<TradeAccountRow[]>({
    queryKey: ['admin-trade-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/trade-accounts');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const partners = Array.from(
    new Map(
      rows.map((row) => [
        row.partner_id,
        {
          id: row.partner_id,
          slug: row.partner_slug,
          firmName: row.partner_firm_name,
          brandColor: row.partner_brand_color,
          status: row.partner_status,
        },
      ])
    ).values()
  );

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.trader_name.toLowerCase().includes(q) ||
      row.trader_email.toLowerCase().includes(q) ||
      row.partner_firm_name.toLowerCase().includes(q) ||
      String(row.number).includes(q) ||
      row.creation_code.toLowerCase().includes(q);
    const matchesPartner = partnerFilter === 'all' || String(row.partner_id) === partnerFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && row.is_completed && !row.blown && !row.inactive) ||
      (statusFilter === 'pending' && !row.is_completed) ||
      (statusFilter === 'blown' && row.blown);
    return matchesSearch && matchesPartner && matchesStatus;
  });

  const grouped = partners
    .map((partner) => ({
      partner,
      accounts: filtered.filter((row) => row.partner_id === partner.id),
    }))
    .filter((group) => group.accounts.length > 0);

  const activeAccounts = rows.filter(
    (row) => row.is_completed && !row.blown && !row.inactive
  ).length;
  const pendingAccounts = rows.filter((row) => !row.is_completed).length;
  const blownAccounts = rows.filter((row) => row.blown).length;

  const getAccountBadge = (row: TradeAccountRow) => {
    if (row.blown) return <Badge color="red">Blown</Badge>;
    if (row.inactive) return <Badge color="gray">Inactive</Badge>;
    if (!row.is_completed) return <Badge color="amber">Pending Setup</Badge>;
    return <Badge color="green">Active</Badge>;
  };

  const openTraderDashboard = async (row: TradeAccountRow) => {
    try {
      const res = await fetch('/api/admin/trader-view-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.partner_slug, email: row.trader_email }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { view_token?: string };
      if (!data.view_token) return;

      const path = `/dashboard?email=${encodeURIComponent(row.trader_email)}&view_token=${encodeURIComponent(data.view_token)}${
        row.eval_id ? `&eval_id=${row.eval_id}` : ''
      }`;
      window.open(getPartnerUrl(row.partner_slug, path), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open trader dashboard:', error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Total Accounts',
            value: rows.length,
            color: '#111827',
            icon: <KeyRound size={16} />,
          },
          {
            label: 'Active Accounts',
            value: activeAccounts,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
          {
            label: 'Pending Setup',
            value: pendingAccounts,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {blownAccounts > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-xs text-red-700">
            <strong>{blownAccounts} blown account{blownAccounts !== 1 ? 's' : ''}</strong> across
            all partners.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Trade Accounts</h2>
            <p className="text-xs text-gray-400">
              {filtered.length} account{filtered.length !== 1 ? 's' : ''} across {grouped.length}{' '}
              partner{grouped.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#16A34A] sm:w-56"
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'pending' | 'blown')
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#16A34A]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending setup</option>
              <option value="blown">Blown</option>
            </select>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#16A34A]"
            >
              <option value="all">All partners</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.firmName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading trade accounts...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <KeyRound size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No trade accounts yet.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No trade accounts match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Account</AdminTh>
                <AdminTh>Trader</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Details</AdminTh>
                <AdminTh>Created</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.trade_account_id} className="hover:bg-gray-50/80">
                    <AdminTd className="sm:px-5 whitespace-nowrap font-semibold text-gray-900">
                      {row.is_completed ? `MT5 ${row.number}` : 'Awaiting setup'}
                    </AdminTd>
                    <AdminTd>
                      <div className="text-xs font-medium text-gray-900">{row.trader_name}</div>
                      <div className="text-[11px] text-gray-400">{row.trader_email}</div>
                    </AdminTd>
                    <AdminTd>
                      <div className="text-xs font-medium text-gray-900">{row.partner_firm_name}</div>
                      <div className="text-[11px] text-gray-400">{row.partner_slug}.ft9ja.com</div>
                    </AdminTd>
                    <AdminTd>
                      <div className="flex flex-wrap gap-1">
                        <Badge color="gray">{formatAccountType(row.type_of_account)}</Badge>
                        {row.eval_type ? <Badge color="blue">{row.eval_type}</Badge> : null}
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <div className="flex flex-wrap gap-1">
                        {getAccountBadge(row)}
                        {row.has_aso ? <Badge color="purple">Has ASO</Badge> : null}
                      </div>
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-500">
                      {row.platform} · {row.broker} · {row.acc_size}
                      {!row.is_completed ? ` · Code ${row.creation_code}` : ''}
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(row.created_at)}
                    </AdminTd>
                    <AdminTd className="text-right">
                      <button
                        type="button"
                        onClick={() => void openTraderDashboard(row)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A] hover:underline"
                      >
                        View dashboard <ExternalLink size={11} />
                      </button>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Partner Signups Tab ──────────────────────────────────────────────────────

function PartnerSignupsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: rows = [], isLoading } = useQuery<PartnerSignupRow[]>({
    queryKey: ['admin-partner-signups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/partner-signup-events');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (row.firm_name || '').toLowerCase().includes(q) ||
      (row.owner_email || '').toLowerCase().includes(q) ||
      (row.owner_name || '').toLowerCase().includes(q) ||
      (row.slug || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const abandoned = rows.filter((row) => row.status === 'abandoned').length;
  const submitted = rows.filter((row) => row.status === 'submitted').length;
  const reachedPayment = rows.filter(
    (row) => row.last_step === 'payment' || row.last_step === 'review' || row.status === 'payment_started'
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          {
            label: 'Total Attempts',
            value: rows.length,
            color: '#111827',
            icon: <UserPlus size={16} />,
          },
          {
            label: 'Abandoned',
            value: abandoned,
            color: '#F59E0B',
            icon: <AlertTriangle size={16} />,
          },
          {
            label: 'Reached Payment',
            value: reachedPayment,
            color: '#2563EB',
            icon: <CreditCard size={16} />,
          },
          {
            label: 'Submitted',
            value: submitted,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Partner Application Funnel</h2>
            <p className="text-xs text-gray-400">
              Partial applications from /apply — people who continued but may not have paid or
              submitted.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#16A34A] sm:w-56"
                placeholder="Search signups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#16A34A]"
            >
              <option value="all">All statuses</option>
              <option value="abandoned">Abandoned</option>
              <option value="payment_started">Payment started</option>
              <option value="continued">In progress</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading partner signups...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No partner signup attempts tracked yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No signups match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 sm:px-5">Firm</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Subdomain</th>
                  <th className="px-4 py-3">Last step</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="font-semibold text-gray-900">
                        {row.firm_name || row.form_data.firm_name || '—'}
                      </div>
                      {row.form_data.tagline ? (
                        <div className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400">
                          {row.form_data.tagline}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">
                        {row.owner_name || row.form_data.owner_name || '—'}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">
                        {row.owner_email || row.form_data.owner_email || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.slug ? (
                        <a
                          href={getPartnerUrl(row.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A] hover:underline"
                        >
                          {row.slug}.ft9ja.com <ExternalLink size={11} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatSignupStep(row.last_step)}</td>
                    <td className="px-4 py-3">{getSignupStatusBadge(row.status)}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">
                        {formatPaymentMethod(row.payment_method || row.form_data.payment_method || null)}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">
                        {row.form_data.has_payment_proof ? 'Receipt uploaded' : 'No receipt'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{formatDate(row.updated_at)}</div>
                      {row.abandoned_at ? (
                        <div className="mt-0.5 text-amber-600">
                          Left {formatDate(row.abandoned_at)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({
  onOpenReceipt,
  openingReceiptUrl,
}: {
  onOpenReceipt: (receiptUrl: string) => void;
  openingReceiptUrl: string | null;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  const { data: rows = [], isLoading } = useQuery<PaymentRow[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const confirm = useMutation({
    mutationFn: async (eval_id: number) => {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setConfirming(null);
    },
    onError: () => setConfirming(null),
  });

  const rejectPayment = useMutation({
    mutationFn: async ({
      eval_id,
      verification_note,
    }: {
      eval_id: number;
      verification_note: string;
    }) => {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id, action: 'reject', verification_note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-evaluation-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setRejecting(null);
    },
    onError: () => setRejecting(null),
  });

  const totalPending = rows.reduce((s, r) => s + parseFloat(r.amount || '0'), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Pending Payments',
            value: rows.length,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
          {
            label: 'Value Held',
            value: formatRevenue(totalPending.toString()),
            color: '#2563EB',
            icon: <CreditCard size={16} />,
          },
          {
            label: 'Avg Amount',
            value: rows.length ? formatRevenue((totalPending / rows.length).toString()) : '₦0',
            color: '#16A34A',
            icon: <TrendingUp size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>This tab is legacy.</strong> Use the <strong>Eval Payments</strong> tab to
            approve receipts with verified amounts. Confirm payments only after verifying uploaded
            evidence — match method, amount, and trader reference.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-gray-900">Pending Payments</h2>
          <p className="text-xs text-gray-400">
            {rows.length > 0
              ? `${rows.length} evaluation${rows.length !== 1 ? 's' : ''} awaiting payment confirmation`
              : 'No pending payments'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">All payments confirmed — nothing pending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Trader</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Method</AdminTh>
                <AdminTh>Evidence</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Date</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <Fragment key={row.eval_id}>
                    <tr className="hover:bg-gray-50/80">
                      <AdminTd className="sm:px-5">
                        <div className="font-semibold text-gray-900">{row.trader_name}</div>
                        <div className="text-[11px] text-gray-400">{row.trader_email}</div>
                      </AdminTd>
                      <AdminTd className="text-xs text-gray-600">{row.partner_firm_name}</AdminTd>
                      <AdminTd>
                        <Badge color="gray">{row.eval_type}</Badge>
                      </AdminTd>
                      <AdminTd>
                        <Badge color="blue">{formatPaymentMethod(row.payment_method)}</Badge>
                      </AdminTd>
                      <AdminTd>
                        {row.payment_proof_url ? (
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(row.payment_proof_url!)}
                            disabled={openingReceiptUrl === row.payment_proof_url}
                            className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            {openingReceiptUrl === row.payment_proof_url ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <ExternalLink size={11} />
                            )}{' '}
                            Evidence
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            <AlertTriangle size={11} /> None
                          </span>
                        )}
                      </AdminTd>
                      <AdminTd className="whitespace-nowrap text-xs font-semibold text-gray-900">
                        ₦{parseFloat(row.amount).toLocaleString()}
                      </AdminTd>
                      <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(row.purchase_date)}
                      </AdminTd>
                      <AdminTd className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => {
                              setRejecting(null);
                              setConfirming(row.eval_id);
                            }}
                            disabled={!row.payment_proof_url}
                            title={
                              !row.payment_proof_url
                                ? 'Payment evidence is required before approval'
                                : ''
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                          >
                            <CheckCircle size={12} /> Confirm
                          </button>
                          <button
                            onClick={() => {
                              setConfirming(null);
                              setRejecting(row.eval_id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      </AdminTd>
                    </tr>
                    {rejecting === row.eval_id || confirming === row.eval_id ? (
                      <tr>
                        <td colSpan={8} className="bg-gray-50/60 px-4 py-3 sm:px-5">
                          {rejecting === row.eval_id ? (
                            <div className="max-w-md space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                              <p className="text-xs font-semibold text-red-800">Reject this payment?</p>
                              <textarea
                                rows={2}
                                placeholder="Required reason for rejection"
                                value={rejectNotes[row.eval_id] ?? ''}
                                onChange={(e) =>
                                  setRejectNotes((current) => ({
                                    ...current,
                                    [row.eval_id]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setRejecting(null)}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    rejectPayment.mutate({
                                      eval_id: row.eval_id,
                                      verification_note: rejectNotes[row.eval_id] ?? '',
                                    })
                                  }
                                  disabled={
                                    rejectPayment.isPending || !rejectNotes[row.eval_id]?.trim()
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  {rejectPayment.isPending ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <X size={11} />
                                  )}
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs">
                              <p className="mb-2 font-semibold text-gray-800">Confirm this payment?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setConfirming(null)}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => confirm.mutate(row.eval_id)}
                                  disabled={confirm.isPending || !row.payment_proof_url}
                                  className="flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                                >
                                  {confirm.isPending ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={11} />
                                  )}
                                  Yes, Confirm
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Evaluation Payments Tab ─────────────────────────────────────────────────

function EvaluationPaymentsTab({
  onOpenReceipt,
  openingReceiptUrl,
}: {
  onOpenReceipt: (receiptUrl: string) => void;
  openingReceiptUrl: string | null;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_payment' | 'approved' | 'rejected'
  >('all');
  const [confirming, setConfirming] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [verifiedAmounts, setVerifiedAmounts] = useState<Record<number, string>>({});
  const [forceApprove, setForceApprove] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<number, string>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  const { data: rows = [], isLoading } = useQuery<EvaluationPaymentRow[]>({
    queryKey: ['admin-evaluation-payments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/evaluation-payments');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const confirm = useMutation({
    mutationFn: async ({
      eval_id,
      verified_amount,
      force_approve,
      verification_note,
    }: {
      eval_id: number;
      verified_amount: number;
      force_approve: boolean;
      verification_note: string;
    }) => {
      const res = await fetch('/api/admin/evaluation-payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_id,
          verified_amount,
          force_approve,
          verification_note,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-evaluation-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setConfirming(null);
    },
    onError: () => setConfirming(null),
  });

  const rejectPayment = useMutation({
    mutationFn: async ({
      eval_id,
      verification_note,
    }: {
      eval_id: number;
      verification_note: string;
    }) => {
      const res = await fetch('/api/admin/evaluation-payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id, action: 'reject', verification_note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-evaluation-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setRejecting(null);
    },
    onError: () => setRejecting(null),
  });

  const partners = Array.from(
    new Map(
      rows.map((row) => [
        row.partner_id,
        {
          id: row.partner_id,
          slug: row.partner_slug,
          firmName: row.partner_firm_name,
          brandColor: row.partner_brand_color,
          status: row.partner_status,
        },
      ])
    ).values()
  );

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const approved =
      row.status !== 'pending_payment' && row.status !== 'payment_rejected';
    const matchesSearch =
      !q ||
      row.trader_name.toLowerCase().includes(q) ||
      row.trader_email.toLowerCase().includes(q) ||
      row.partner_firm_name.toLowerCase().includes(q) ||
      row.eval_type.toLowerCase().includes(q);
    const matchesPartner = partnerFilter === 'all' || String(row.partner_id) === partnerFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending_payment' && row.status === 'pending_payment') ||
      (statusFilter === 'rejected' && row.status === 'payment_rejected') ||
      (statusFilter === 'approved' && approved);
    return matchesSearch && matchesPartner && matchesStatus;
  });

  const grouped = partners
    .map((partner) => ({
      partner,
      payments: filtered.filter((row) => row.partner_id === partner.id),
    }))
    .filter((group) => group.payments.length > 0);

  const pending = rows.filter((row) => row.status === 'pending_payment');
  const approved = rows.filter((row) => row.status !== 'pending_payment');
  const totalValue = rows.reduce((s, row) => s + parseFloat(row.amount || '0'), 0);

  const getPaymentBadge = (status: string) => {
    if (status === 'pending_payment') return <Badge color="amber">Awaiting Approval</Badge>;
    if (status === 'payment_rejected') return <Badge color="red">Rejected</Badge>;
    if (status === 'active') return <Badge color="green">Approved</Badge>;
    if (status === 'passed') return <Badge color="green">Passed</Badge>;
    if (status === 'failed') return <Badge color="red">Failed</Badge>;
    if (status === 'suspended') return <Badge color="gray">Suspended</Badge>;
    return <Badge color="gray">{status}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Evaluation Payments',
            value: rows.length,
            color: '#111827',
            icon: <CreditCard size={16} />,
          },
          {
            label: 'Awaiting Approval',
            value: pending.length,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
          {
            label: 'Total Value',
            value: formatRevenue(totalValue.toString()),
            color: '#16A34A',
            icon: <TrendingUp size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Approve only after matching payment evidence.</strong> Approval activates the
            evaluation and emails the trader their account activation code.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Evaluation Payments</h2>
            <p className="text-xs text-gray-400">
              {filtered.length} payment{filtered.length !== 1 ? 's' : ''}; {approved.length}{' '}
              approved, {pending.length} awaiting approval
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#16A34A]"
                placeholder="Search trader, partner, or evaluation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#16A34A]"
            >
              <option value="all">All partners</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.firmName}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 p-1">
              {[
                ['all', 'All'],
                ['pending_payment', 'Pending'],
                ['approved', 'Approved'],
                ['rejected', 'Rejected'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id as typeof statusFilter)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 ${statusFilter === id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading evaluation payments...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No evaluation payments yet.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No payments match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Trader</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Method</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Date</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => {
                  const isExpanded = confirming === row.eval_id || rejecting === row.eval_id;
                  return (
                    <Fragment key={row.eval_id}>
                      <tr className="hover:bg-gray-50/80">
                        <AdminTd className="sm:px-5">
                          <div className="font-semibold text-gray-900">{row.trader_name}</div>
                          <div className="text-[11px] text-gray-400">{row.trader_email}</div>
                        </AdminTd>
                        <AdminTd>
                          <div className="text-xs font-medium text-gray-900">{row.partner_firm_name}</div>
                          <div className="text-[11px] text-gray-400">{row.partner_slug}.ft9ja.com</div>
                        </AdminTd>
                        <AdminTd>
                          <Badge color="gray">{row.eval_type}</Badge>
                        </AdminTd>
                        <AdminTd>
                          <Badge color="blue">{formatPaymentMethod(row.payment_method)}</Badge>
                        </AdminTd>
                        <AdminTd>{getPaymentBadge(row.status)}</AdminTd>
                        <AdminTd className="whitespace-nowrap text-xs font-semibold text-gray-900">
                          ₦{parseFloat(row.amount).toLocaleString()}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                          {formatDate(row.purchase_date)}
                        </AdminTd>
                        <AdminTd className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            {row.payment_proof_url ? (
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(row.payment_proof_url!)}
                                disabled={openingReceiptUrl === row.payment_proof_url}
                                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                              >
                                {openingReceiptUrl === row.payment_proof_url ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <ExternalLink size={11} />
                                )}
                                Evidence
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
                                <AlertTriangle size={11} /> None
                              </span>
                            )}
                            {row.status === 'pending_payment' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setRejecting(null);
                                    setConfirming(row.eval_id);
                                    setVerifiedAmounts((current) => ({
                                      ...current,
                                      [row.eval_id]: String(parseFloat(row.amount)),
                                    }));
                                  }}
                                  disabled={!row.payment_proof_url}
                                  title={
                                    !row.payment_proof_url
                                      ? 'Payment evidence is required before approval'
                                      : ''
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                                >
                                  <CheckCircle size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirming(null);
                                    setRejecting(row.eval_id);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </>
                            ) : null}
                            {row.status === 'payment_rejected' && row.verification_note ? (
                              <span className="text-xs text-red-600">{row.verification_note}</span>
                            ) : null}
                          </div>
                        </AdminTd>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/60 px-4 py-3 sm:px-5">
                            {rejecting === row.eval_id ? (
                              <div className="max-w-md space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                                <p className="text-xs font-semibold text-red-800">Reject this payment?</p>
                                <textarea
                                  rows={2}
                                  placeholder="Required reason for rejection"
                                  value={rejectNotes[row.eval_id] ?? ''}
                                  onChange={(e) =>
                                    setRejectNotes((current) => ({
                                      ...current,
                                      [row.eval_id]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setRejecting(null)}
                                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      rejectPayment.mutate({
                                        eval_id: row.eval_id,
                                        verification_note: rejectNotes[row.eval_id] ?? '',
                                      })
                                    }
                                    disabled={
                                      rejectPayment.isPending || !rejectNotes[row.eval_id]?.trim()
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {rejectPayment.isPending ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <X size={11} />
                                    )}
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="max-w-md space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-400">Declared</span>
                                    <div className="font-semibold text-gray-900">
                                      ₦{parseFloat(row.amount).toLocaleString()}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Expected</span>
                                    <div className="font-semibold text-gray-900">
                                      ₦
                                      {(
                                        parseFloat(row.wholesale_amount || '0') +
                                        parseFloat(row.markup_amount || '0')
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <label className="block text-xs font-medium text-gray-600">
                                  Verified amount
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    verifiedAmounts[row.eval_id] ?? String(parseFloat(row.amount))
                                  }
                                  onChange={(e) =>
                                    setVerifiedAmounts((current) => ({
                                      ...current,
                                      [row.eval_id]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                                />
                                {(() => {
                                  const verified = parseFloat(
                                    verifiedAmounts[row.eval_id] ?? row.amount
                                  );
                                  const split = splitVerifiedAmount(
                                    row.eval_type as EvalType,
                                    verified,
                                    row.wholesale_amount
                                  );
                                  return (
                                    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">FT9ja wholesale</span>
                                        <span className="font-semibold text-gray-900">
                                          ₦{split.wholesale.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Partner earnings</span>
                                        <span className="font-semibold text-green-700">
                                          ₦{split.partnerEarnings.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {parseFloat(verifiedAmounts[row.eval_id] ?? row.amount) <
                                  parseFloat(row.wholesale_amount || '0') +
                                    parseFloat(row.markup_amount || '0') && (
                                  <>
                                    <label className="flex items-center gap-2 text-xs text-amber-700">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(forceApprove[row.eval_id])}
                                        onChange={(e) =>
                                          setForceApprove((current) => ({
                                            ...current,
                                            [row.eval_id]: e.target.checked,
                                          }))
                                        }
                                      />
                                      Override underpayment
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="Required note for underpayment override"
                                      value={verificationNotes[row.eval_id] ?? ''}
                                      onChange={(e) =>
                                        setVerificationNotes((current) => ({
                                          ...current,
                                          [row.eval_id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                                    />
                                  </>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setConfirming(null)}
                                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      confirm.mutate({
                                        eval_id: row.eval_id,
                                        verified_amount: parseFloat(
                                          verifiedAmounts[row.eval_id] ?? row.amount
                                        ),
                                        force_approve: Boolean(forceApprove[row.eval_id]),
                                        verification_note: verificationNotes[row.eval_id] ?? '',
                                      })
                                    }
                                    disabled={confirm.isPending || !row.payment_proof_url}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#16A34A] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                                  >
                                    {confirm.isPending ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={11} />
                                    )}
                                    Approve
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Partner License Invoices Tab ─────────────────────────────────────────────

function LicenseInvoicesTab({
  onOpenReceipt,
  openingReceiptUrl,
}: {
  onOpenReceipt: (receiptUrl: string) => void;
  openingReceiptUrl: string | null;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'receipt_uploaded' | 'overdue' | 'pending' | 'paid' | 'waived'
  >('all');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [waivingId, setWaivingId] = useState<number | null>(null);

  const [verifiedAmount, setVerifiedAmount] = useState('95000');
  const [forceApprove, setForceApprove] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery<AdminLicenseInvoiceRow[]>({
    queryKey: ['admin-license-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/admin/license-invoices');
      if (!res.ok) throw new Error('Failed to fetch license invoices');
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      action: 'approve' | 'reject' | 'waive';
      invoice_id: number;
      partner_slug?: string;
      verified_amount?: number;
      force_approve?: boolean;
      verification_note?: string;
    }) => {
      setActionError(null);
      const res = await fetch('/api/admin/license-invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process license invoice');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-license-invoices'] });
      qc.invalidateQueries({ queryKey: ['admin-partners'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setApprovingId(null);
      setRejectingId(null);
      setWaivingId(null);
      setVerificationNote('');
      setForceApprove(false);
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.partner_firm_name.toLowerCase().includes(q) ||
      inv.partner_slug.toLowerCase().includes(q) ||
      inv.partner_owner_email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingReceiptCount = invoices.filter((i) => i.status === 'receipt_uploaded').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const paidCount = invoices.filter((i) => i.status === 'paid' || i.status === 'waived').length;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="text-xs font-medium text-gray-400">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <div className="text-xs font-medium text-amber-700">Receipts in Review</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{pendingReceiptCount}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
          <div className="text-xs font-medium text-red-700">Overdue Invoices</div>
          <div className="text-2xl font-bold text-red-800 mt-1">{overdueCount}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 sm:p-5">
          <div className="text-xs font-medium text-green-700">Paid / Complimentary</div>
          <div className="text-2xl font-bold text-green-800 mt-1">{paidCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, firm, or email…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'receipt_uploaded', 'overdue', 'pending', 'paid', 'waived'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {st === 'all'
                  ? 'All'
                  : st === 'receipt_uploaded'
                  ? `Review (${pendingReceiptCount})`
                  : st === 'overdue'
                  ? `Overdue (${overdueCount})`
                  : st === 'pending'
                  ? 'Pending'
                  : st === 'paid'
                  ? 'Paid'
                  : 'Complimentary'}
              </button>
            )
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading license invoices…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No license invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 sm:px-5">Invoice</th>
                  <th className="px-4 py-3">Firm</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => {
                  const displayStatus = getInvoiceLifecycleStatus({
                    status: inv.status,
                    periodEnd: inv.period_end,
                  });
                  const dueLabel =
                    displayStatus === 'paid' || displayStatus === 'waived'
                      ? 'Next due'
                      : displayStatus === 'expired'
                        ? 'Renewal due'
                        : 'Due';
                  const isExpanded =
                    approvingId === inv.id || rejectingId === inv.id || waivingId === inv.id;
                  return (
                    <Fragment key={inv.id}>
                      <tr className="hover:bg-gray-50/80 align-top">
                        <td className="px-4 py-3 sm:px-5">
                          <div className="font-mono text-xs font-bold text-gray-900">
                            {inv.invoice_number}
                          </div>
                          {inv.verification_note ? (
                            <div className="mt-1 max-w-[220px] text-[11px] italic text-gray-500">
                              Note: {inv.verification_note}
                              {inv.verified_by ? ` (by ${inv.verified_by})` : ''}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{inv.partner_firm_name}</div>
                          <div className="mt-0.5 text-xs text-gray-400">{inv.partner_slug}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {inv.partner_owner_email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                          {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                          <div>
                            {formatDate(
                              nextDueAtForInvoice({
                                status: inv.status,
                                periodStart: inv.period_start,
                                periodEnd: inv.period_end,
                                dueAt: inv.due_at,
                              }).toISOString()
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-400">{dueLabel}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-gray-900">
                          ₦{Number(inv.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${licenseLifecycleBadgeClass(displayStatus)}`}
                          >
                            {displayStatus === 'paid'
                              ? '✓ Paid'
                              : displayStatus === 'waived'
                              ? '🎁 Complimentary'
                              : displayStatus === 'receipt_uploaded'
                              ? '⏳ Receipt in Review'
                              : displayStatus === 'overdue'
                              ? '⚠️ Overdue'
                              : displayStatus === 'expired'
                              ? 'Expired'
                              : licenseLifecycleLabel(displayStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            {inv.payment_proof_url && (
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(inv.payment_proof_url!)}
                                disabled={openingReceiptUrl === inv.payment_proof_url}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                              >
                                {openingReceiptUrl === inv.payment_proof_url ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <FileText size={12} />
                                )}
                                View Receipt
                              </button>
                            )}

                            {inv.status === 'receipt_uploaded' && (
                              <>
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setWaivingId(null);
                                    setApprovingId(inv.id);
                                    setVerifiedAmount(String(Number(inv.amount)));
                                    setVerificationNote('');
                                    setForceApprove(false);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D]"
                                >
                                  <CheckCircle size={12} /> Confirm Payment
                                </button>
                                <button
                                  onClick={() => {
                                    setApprovingId(null);
                                    setWaivingId(null);
                                    setRejectingId(inv.id);
                                    setVerificationNote('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </>
                            )}

                            {(inv.status === 'pending' ||
                              inv.status === 'overdue' ||
                              inv.status === 'receipt_uploaded') && (
                              <button
                                onClick={() => {
                                  setApprovingId(null);
                                  setRejectingId(null);
                                  setWaivingId(inv.id);
                                  setVerificationNote('');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <Gift size={12} /> Waive (Comp)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/60 px-4 py-3 sm:px-5">
                            {approvingId === inv.id && (
                              <div className="rounded-lg border border-green-200 bg-green-50/50 p-3.5 space-y-3">
                                <div className="text-xs font-bold text-green-900">
                                  Confirm Partner License Payment
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                      Verified Amount (₦)
                                    </label>
                                    <input
                                      type="number"
                                      value={verifiedAmount}
                                      onChange={(e) => setVerifiedAmount(e.target.value)}
                                      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                      Verification Note (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={verificationNote}
                                      onChange={(e) => setVerificationNote(e.target.value)}
                                      placeholder="e.g. Zenith transfer confirmed"
                                      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                  </div>
                                </div>
                                {Number(verifiedAmount) < 95000 && (
                                  <label className="flex items-center gap-2 text-xs text-amber-800">
                                    <input
                                      type="checkbox"
                                      checked={forceApprove}
                                      onChange={(e) => setForceApprove(e.target.checked)}
                                      className="accent-[#16A34A]"
                                    />
                                    Amount is below ₦95,000. Force approve with note?
                                  </label>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      reviewMutation.mutate({
                                        action: 'approve',
                                        invoice_id: inv.id,
                                        partner_slug: inv.partner_slug,
                                        verified_amount: Number(verifiedAmount),
                                        force_approve: forceApprove,
                                        verification_note: verificationNote,
                                      })
                                    }
                                    disabled={reviewMutation.isPending}
                                    className="inline-flex items-center gap-1 rounded bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                                  >
                                    {reviewMutation.isPending ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={11} />
                                    )}
                                    Approve & Send P-04
                                  </button>
                                  <button
                                    onClick={() => setApprovingId(null)}
                                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {rejectingId === inv.id && (
                              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5 space-y-3">
                                <div className="text-xs font-bold text-red-900">
                                  Reject Payment Receipt
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                    Rejection Reason * (Required for partner to fix)
                                  </label>
                                  <input
                                    type="text"
                                    value={verificationNote}
                                    onChange={(e) => setVerificationNote(e.target.value)}
                                    placeholder="e.g. Incomplete transaction details or unreadable screenshot"
                                    className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      reviewMutation.mutate({
                                        action: 'reject',
                                        invoice_id: inv.id,
                                        verification_note: verificationNote,
                                      })
                                    }
                                    disabled={reviewMutation.isPending || !verificationNote.trim()}
                                    className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {reviewMutation.isPending ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <X size={11} />
                                    )}
                                    Confirm Rejection
                                  </button>
                                  <button
                                    onClick={() => setRejectingId(null)}
                                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {waivingId === inv.id && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                                <div className="text-xs font-bold text-blue-900">
                                  Waive / Grant 30 Days Complimentary
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                    Reason / Note * (Required for audit log)
                                  </label>
                                  <input
                                    type="text"
                                    value={verificationNote}
                                    onChange={(e) => setVerificationNote(e.target.value)}
                                    placeholder="e.g. Promotional launch month or high-volume partner grant"
                                    className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      reviewMutation.mutate({
                                        action: 'waive',
                                        invoice_id: inv.id,
                                        verification_note: verificationNote,
                                      })
                                    }
                                    disabled={reviewMutation.isPending || !verificationNote.trim()}
                                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {reviewMutation.isPending ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <Gift size={11} />
                                    )}
                                    Confirm Waive
                                  </button>
                                  <button
                                    onClick={() => setWaivingId(null)}
                                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payouts Tab ──────────────────────────────────────────────────────────────

function PayoutsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'processing' | 'paid'>(
    'unpaid'
  );

  const { data: rows = [], isLoading } = useQuery<PayoutRow[]>({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payouts');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const update = useMutation({
    mutationFn: async ({ eval_id, payout_status }: { eval_id: number; payout_status: string }) => {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id, payout_status }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payouts'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
    },
  });

  const filtered = rows.filter((r) => {
    if (statusFilter === 'unpaid') return !r.payout_status;
    if (statusFilter === 'processing') return r.payout_status === 'processing';
    if (statusFilter === 'paid') return r.payout_status === 'paid';
    return true;
  });

  const unpaidCount = rows.filter((r) => !r.payout_status).length;
  const processingCount = rows.filter((r) => r.payout_status === 'processing').length;
  const paidCount = rows.filter((r) => r.payout_status === 'paid').length;

  const getKYCBadge = (status: string) => {
    if (status === 'approved') return <Badge color="green">KYC ✓</Badge>;
    if (status === 'submitted') return <Badge color="amber">KYC Pending</Badge>;
    return <Badge color="red">No KYC</Badge>;
  };

  const getPayoutBadge = (status: string | null) => {
    if (status === 'paid') return <Badge color="green">Paid</Badge>;
    if (status === 'processing') return <Badge color="blue">Processing</Badge>;
    return <Badge color="gray">Not Started</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Needs Payout',
            value: unpaidCount,
            color: '#F59E0B',
            icon: <Banknote size={16} />,
          },
          {
            label: 'Processing',
            value: processingCount,
            color: '#2563EB',
            icon: <Clock size={16} />,
          },
          {
            label: 'Paid Out',
            value: paidCount,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {unpaidCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <AlertTriangle size={14} className="shrink-0 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Verify KYC is approved before processing a payout.</strong> Traders without
            approved KYC cannot receive funded accounts.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Passed Evaluations</h2>
            <p className="text-xs text-gray-400">
              {rows.length} traders have passed the evaluation
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {(['unpaid', 'processing', 'paid', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors sm:px-3 ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">
              No {statusFilter === 'all' ? '' : statusFilter} payouts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Trader</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>KYC</AdminTh>
                <AdminTh>Profit</AdminTh>
                <AdminTh>Days</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Passed</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.eval_id} className="hover:bg-gray-50/80">
                    <AdminTd className="sm:px-5">
                      <div className="font-semibold text-gray-900">{row.trader_name}</div>
                      <div className="text-[11px] text-gray-400">{row.trader_email}</div>
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-600">{row.partner_firm_name}</AdminTd>
                    <AdminTd>
                      <Badge color="gray">{row.eval_type}</Badge>
                    </AdminTd>
                    <AdminTd>{getKYCBadge(row.kyc_status)}</AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs font-semibold text-green-600">
                      +{row.current_profit}%
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-700">
                      {row.trading_days}/{row.required_days}
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs font-semibold text-gray-900">
                      ₦{parseFloat(row.amount).toLocaleString()}
                    </AdminTd>
                    <AdminTd>{getPayoutBadge(row.payout_status)}</AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(row.passed_at)}
                    </AdminTd>
                    <AdminTd className="text-right">
                      {!row.payout_status && row.kyc_status === 'approved' && (
                        <button
                          onClick={() =>
                            update.mutate({ eval_id: row.eval_id, payout_status: 'processing' })
                          }
                          disabled={update.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {update.isPending ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Banknote size={11} />
                          )}
                          Start Payout
                        </button>
                      )}
                      {!row.payout_status && row.kyc_status !== 'approved' && (
                        <span className="text-xs font-medium text-amber-600">Awaiting KYC</span>
                      )}
                      {row.payout_status === 'processing' && (
                        <button
                          onClick={() =>
                            update.mutate({ eval_id: row.eval_id, payout_status: 'paid' })
                          }
                          disabled={update.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                        >
                          {update.isPending ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <CheckCircle size={11} />
                          )}
                          Mark Paid
                        </button>
                      )}
                      {row.payout_status === 'paid' && (
                        <span className="text-xs font-semibold text-green-600">✓ Paid out</span>
                      )}
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Partner Payouts Tab ──────────────────────────────────────────────────────

function PartnerPayoutsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>(
    'pending'
  );
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: rows = [], isLoading } = useQuery<PartnerPayoutRequestRow[]>({
    queryKey: ['admin-partner-payouts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/partner-payouts');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const update = useMutation({
    mutationFn: async ({
      request_id,
      status,
      admin_notes,
    }: {
      request_id: number;
      status: 'approved' | 'rejected' | 'paid';
      admin_notes?: string;
    }) => {
      const res = await fetch('/api/admin/partner-payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, status, admin_notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-partner-payouts'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setUpdatingId(null);
    },
    onError: () => setUpdatingId(null),
  });

  const filtered = rows.filter((row) => {
    if (statusFilter === 'all') return true;
    return row.status === statusFilter;
  });

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const paidCount = rows.filter((r) => r.status === 'paid').length;

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <Badge color="amber">Pending</Badge>;
    if (status === 'approved') return <Badge color="blue">Approved</Badge>;
    if (status === 'paid') return <Badge color="green">Paid</Badge>;
    if (status === 'rejected') return <Badge color="red">Rejected</Badge>;
    return <Badge color="gray">{status}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: 'Pending', value: pendingCount, color: '#F59E0B', icon: <Clock size={16} /> },
          { label: 'Approved', value: approvedCount, color: '#2563EB', icon: <Banknote size={16} /> },
          { label: 'Paid', value: paidCount, color: '#16A34A', icon: <CheckCircle size={16} /> },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Partner Payout Requests</h2>
            <p className="text-xs text-gray-400">
              Approve to reserve balance, then mark paid after transfer
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {(['pending', 'approved', 'paid', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors sm:px-3 ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No {statusFilter === 'all' ? '' : statusFilter} payout requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Firm</AdminTh>
                <AdminTh>Requested</AdminTh>
                <AdminTh>Available</AdminTh>
                <AdminTh>Bank</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Date</AdminTh>
                <AdminTh>Notes</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <AdminTd className="sm:px-5">
                      <div className="font-semibold text-gray-900">{row.partner_firm_name ?? 'Partner'}</div>
                      <div className="text-[11px] text-gray-400">{row.partner_slug}.ft9ja.com</div>
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs font-semibold text-gray-900">
                      ₦{parseFloat(row.amount_requested).toLocaleString()}
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-700">
                      ₦{row.available_balance.toLocaleString()}
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-600">
                      {row.bank_name} · {row.account_number}
                      <div className="text-[11px] text-gray-400">{row.account_name}</div>
                    </AdminTd>
                    <AdminTd>{getStatusBadge(row.status)}</AdminTd>
                    <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                      {formatDate(row.created_at)}
                    </AdminTd>
                    <AdminTd className="text-xs text-gray-500">
                      {row.notes ? <div>Partner: {row.notes}</div> : null}
                      {row.admin_notes ? <div className="text-blue-700">Admin: {row.admin_notes}</div> : null}
                      {row.status === 'pending' ? (
                        <textarea
                          rows={2}
                          placeholder="Optional admin note"
                          value={adminNotes[row.id] ?? ''}
                          onChange={(e) =>
                            setAdminNotes((current) => ({ ...current, [row.id]: e.target.value }))
                          }
                          className="mt-1 w-full min-w-[180px] rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                        />
                      ) : null}
                    </AdminTd>
                    <AdminTd className="text-right">
                      {row.status === 'pending' && (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => {
                              setUpdatingId(row.id);
                              update.mutate({
                                request_id: row.id,
                                status: 'approved',
                                admin_notes: adminNotes[row.id],
                              });
                            }}
                            disabled={update.isPending && updatingId === row.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                          >
                            {update.isPending && updatingId === row.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle size={11} />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setUpdatingId(row.id);
                              update.mutate({
                                request_id: row.id,
                                status: 'rejected',
                                admin_notes: adminNotes[row.id],
                              });
                            }}
                            disabled={update.isPending && updatingId === row.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {row.status === 'approved' && (
                        <button
                          onClick={() => {
                            setUpdatingId(row.id);
                            update.mutate({
                              request_id: row.id,
                              status: 'paid',
                              admin_notes: adminNotes[row.id] || row.admin_notes || undefined,
                            });
                          }}
                          disabled={update.isPending && updatingId === row.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                        >
                          {update.isPending && updatingId === row.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <CheckCircle size={11} />
                          )}
                          Mark Paid
                        </button>
                      )}
                      {row.status === 'paid' && (
                        <span className="text-xs font-semibold text-green-600">✓ Settled</span>
                      )}
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

type SelectedRequest =
  | { kind: 'trader'; row: RequestRow }
  | { kind: 'aso'; row: AsoRequestRow };

function RequestsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<
    'pending' | 'approved' | 'rejected' | 'completed' | 'all'
  >('pending');
  const [selected, setSelected] = useState<SelectedRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);

  const { data: traderRows = [], isLoading: traderLoading } = useQuery<RequestRow[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: asoRows = [], isLoading: asoLoading } = useQuery<AsoRequestRow[]>({
    queryKey: ['admin-aso-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aso-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const decideTrader = useMutation({
    mutationFn: async ({
      request_id,
      status,
      admin_notes,
    }: {
      request_id: number;
      status: string;
      admin_notes?: string;
    }) => {
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, status, admin_notes }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setSelected(null);
      setAdminNotes('');
      setDeciding(null);
    },
  });

  const decideAso = useMutation({
    mutationFn: async ({
      request_id,
      status,
      admin_notes,
    }: {
      request_id: number;
      status: 'approved' | 'rejected';
      admin_notes?: string;
    }) => {
      const res = await fetch('/api/admin/aso-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, status, admin_notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-aso-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] });
      setSelected(null);
      setAdminNotes('');
      setDeciding(null);
    },
  });

  const isLoading = traderLoading || asoLoading;
  const allRows: SelectedRequest[] = [
    ...traderRows.map((row) => ({ kind: 'trader' as const, row })),
    ...asoRows.map((row) => ({ kind: 'aso' as const, row })),
  ].sort((a, b) => {
    const aDate = a.kind === 'trader' ? a.row.created_at : a.row.requested_at;
    const bDate = b.kind === 'trader' ? b.row.created_at : b.row.requested_at;
    return bDate.localeCompare(aDate);
  });

  const filtered =
    filter === 'all' ? allRows : allRows.filter((item) => item.row.status === filter);
  const pendingCount =
    traderRows.filter((r) => r.status === 'pending').length +
    asoRows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {selected?.kind === 'trader' && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setSelected(null);
              setAdminNotes('');
              setDeciding(null);
            }}
          />
          <div className="w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  Request Review
                </p>
                <h2 className="text-base font-black text-gray-900">
                  {REQUEST_META_ADMIN[selected.row.request_type]?.icon}{' '}
                  {REQUEST_META_ADMIN[selected.row.request_type]?.label ??
                    selected.row.request_type}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setAdminNotes('');
                  setDeciding(null);
                }}
                className="rounded-full p-1.5 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: selected.row.partner_brand_color || '#16A34A' }}
                >
                  {selected.row.partner_firm_name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    {selected.row.partner_firm_name}
                  </div>
                  <div className="text-xs text-gray-400">{selected.row.partner_slug}.ft9ja.com</div>
                </div>
                <div className="ml-auto">
                  {selected.row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                  {selected.row.status === 'approved' && <Badge color="green">Approved</Badge>}
                  {selected.row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Trader
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {[
                    ['Name', selected.row.trader_name],
                    ['Email', selected.row.trader_email],
                    [
                      'KYC',
                      selected.row.kyc_status === 'approved'
                        ? '✅ Approved'
                        : selected.row.kyc_status === 'submitted'
                          ? '⏳ Submitted'
                          : '❌ Not Approved',
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-gray-50 px-4 py-2.5 last:border-0"
                    >
                      <span className="w-20 shrink-0 text-xs font-medium text-gray-400">
                        {label}
                      </span>
                      <span className="text-right text-xs text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Evaluation
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {[
                    ['ID', `EVL-${selected.row.eval_id.toString().padStart(6, '0')}`],
                    [
                      'Type',
                      selected.row.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)',
                    ],
                    ['Amount', `₦${parseFloat(selected.row.amount).toLocaleString()}`],
                    ['Eval Status', selected.row.eval_status],
                    ['Submitted', formatDate(selected.row.created_at)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-gray-50 px-4 py-2.5 last:border-0"
                    >
                      <span className="w-24 shrink-0 text-xs font-medium text-gray-400">
                        {label}
                      </span>
                      <span className="text-right text-xs text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.row.notes && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Trader Notes
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs italic text-gray-700">
                    {selected.row.notes}
                  </div>
                </div>
              )}

              {selected.row.status === 'pending' ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Admin Notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Reason for rejection or approval notes..."
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setDeciding('rejected');
                        decideTrader.mutate({
                          request_id: selected.row.id,
                          status: 'rejected',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decideTrader.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {decideTrader.isPending && deciding === 'rejected' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}{' '}
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setDeciding('approved');
                        decideTrader.mutate({
                          request_id: selected.row.id,
                          status: 'approved',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decideTrader.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                    >
                      {decideTrader.isPending && deciding === 'approved' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle size={13} />
                      )}{' '}
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-xs text-gray-400">
                  This request has already been{' '}
                  <strong
                    className={
                      selected.row.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {selected.row.status}
                  </strong>
                  .
                  {selected.row.admin_notes && (
                    <div className="mt-1 italic text-gray-500">
                      Admin note: {selected.row.admin_notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected?.kind === 'aso' && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setSelected(null);
              setAdminNotes('');
              setDeciding(null);
            }}
          />
          <div className="w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  ASO Request
                </p>
                <h2 className="text-base font-black text-gray-900">
                  SS {selected.row.ss_account_number}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setAdminNotes('');
                  setDeciding(null);
                }}
                className="rounded-full p-1.5 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: selected.row.partner_brand_color || '#16A34A' }}
                >
                  {selected.row.partner_firm_name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    {selected.row.partner_firm_name}
                  </div>
                  <div className="text-xs text-gray-400">{selected.row.partner_slug}.ft9ja.com</div>
                </div>
                <div className="ml-auto">
                  {selected.row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                  {selected.row.status === 'approved' && <Badge color="green">Approved</Badge>}
                  {selected.row.status === 'completed' && <Badge color="blue">Completed</Badge>}
                  {selected.row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {[
                  ['Trader', `${selected.row.trader_name} · ${selected.row.trader_email}`],
                  ['SS Account', String(selected.row.ss_account_number)],
                  [
                    'Profit',
                    `${selected.row.eligibility_profit ?? '0'}% / ${
                      selected.row.eligibility_profit_target ?? '0'
                    }%`,
                  ],
                  ['Requested', formatDate(selected.row.requested_at)],
                  [
                    'Token',
                    selected.row.approval_token_used_at
                      ? `Used ${formatDate(selected.row.approval_token_used_at)}`
                      : selected.row.approval_token_expires_at
                        ? `Expires ${formatDate(selected.row.approval_token_expires_at)}`
                        : 'Not issued',
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-gray-50 px-4 py-2.5 last:border-0"
                  >
                    <span className="w-24 shrink-0 text-xs font-medium text-gray-400">
                      {label}
                    </span>
                    <span className="text-right text-xs text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {selected.row.status === 'pending' ? (
                <div className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Approval note or rejection reason..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
                  />
                  {decideAso.error && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {(decideAso.error as Error).message}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setDeciding('rejected');
                        decideAso.mutate({
                          request_id: selected.row.id,
                          status: 'rejected',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decideAso.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {decideAso.isPending && deciding === 'rejected' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setDeciding('approved');
                        decideAso.mutate({
                          request_id: selected.row.id,
                          status: 'approved',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decideAso.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                    >
                      {decideAso.isPending && deciding === 'approved' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle size={13} />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-xs text-gray-400">
                  This ASO request is <strong>{selected.row.status}</strong>.
                  {selected.row.rejection_reason && (
                    <div className="mt-1 italic text-gray-500">
                      Note: {selected.row.rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          {
            label: 'Pending Review',
            value: pendingCount,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
          {
            label: 'Approved',
            value:
              traderRows.filter((r) => r.status === 'approved').length +
              asoRows.filter((r) => r.status === 'approved').length,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
          {
            label: 'Completed',
            value: asoRows.filter((r) => r.status === 'completed').length,
            color: '#2563EB',
            icon: <Shield size={16} />,
          },
          {
            label: 'Rejected',
            value:
              traderRows.filter((r) => r.status === 'rejected').length +
              asoRows.filter((r) => r.status === 'rejected').length,
            color: '#DC2626',
            icon: <X size={16} />,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Requests</h2>
            <p className="text-xs text-gray-400">
              {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All up to date'}
            </p>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 p-1">
            {(['pending', 'approved', 'completed', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors sm:px-3 ${filter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No {filter === 'all' ? '' : filter} requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <AdminTableHead>
                <AdminTh className="sm:px-5">Type</AdminTh>
                <AdminTh>Trader</AdminTh>
                <AdminTh>Partner</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Date</AdminTh>
                <AdminTh className="text-right"> </AdminTh>
              </AdminTableHead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  if (item.kind === 'trader') {
                    const row = item.row;
                    const meta = REQUEST_META_ADMIN[row.request_type];
                    return (
                      <tr
                        key={`trader-${row.id}`}
                        className="cursor-pointer hover:bg-gray-50/80"
                        onClick={() => {
                          setSelected(item);
                          setAdminNotes(row.admin_notes || '');
                          setDeciding(null);
                        }}
                      >
                        <AdminTd className="sm:px-5">
                          <div className="font-semibold text-gray-900">
                            {meta?.icon ?? '📄'} {meta?.label ?? row.request_type}
                          </div>
                          <div className="mt-0.5">
                            <Badge color="gray">{row.eval_type}</Badge>
                          </div>
                        </AdminTd>
                        <AdminTd className="text-xs text-gray-700">{row.trader_name}</AdminTd>
                        <AdminTd className="text-xs text-gray-600">{row.partner_firm_name}</AdminTd>
                        <AdminTd>
                          {row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                          {row.status === 'approved' && <Badge color="green">Approved</Badge>}
                          {row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                          {formatDate(row.created_at)}
                        </AdminTd>
                        <AdminTd className="text-right">
                          <ChevronRight size={14} className="ml-auto text-gray-300" />
                        </AdminTd>
                      </tr>
                    );
                  }

                  const row = item.row;
                  return (
                    <tr
                      key={`aso-${row.id}`}
                      className="cursor-pointer hover:bg-gray-50/80"
                      onClick={() => {
                        setSelected(item);
                        setAdminNotes(row.rejection_reason || '');
                        setDeciding(null);
                      }}
                    >
                      <AdminTd className="sm:px-5 font-semibold text-gray-900">
                        ASO Upgrade · SS {row.ss_account_number}
                      </AdminTd>
                      <AdminTd className="text-xs text-gray-700">{row.trader_name}</AdminTd>
                      <AdminTd className="text-xs text-gray-600">{row.partner_firm_name}</AdminTd>
                      <AdminTd>
                        {row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                        {row.status === 'approved' && <Badge color="green">Approved</Badge>}
                        {row.status === 'completed' && <Badge color="blue">Completed</Badge>}
                        {row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                      </AdminTd>
                      <AdminTd className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(row.requested_at)}
                      </AdminTd>
                      <AdminTd className="text-right">
                        <ChevronRight size={14} className="ml-auto text-gray-300" />
                      </AdminTd>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LOGO_LIGHT =
  'https://dtvoeevhaseb5.cloudfront.net/user-uploads/4eccdbc1-dabd-439b-8e76-68c9cf5bb8a4.png';

function renderAdminTab(
  tab: AdminTabId,
  openReceipt: (receiptUrl: string) => Promise<void>,
  openingReceiptUrl: string | null
) {
  switch (tab) {
    case 'partners':
      return <PartnersTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />;
    case 'partner-signups':
      return <PartnerSignupsTab />;
    case 'license-invoices':
      return (
        <LicenseInvoicesTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />
      );
    case 'traders':
      return <TradersTab />;
    case 'trade-accounts':
      return <TradeAccountsTab />;
    case 'kyc':
      return <KYCTab />;
    case 'payments':
      return <PaymentsTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />;
    case 'evaluation-payments':
      return (
        <EvaluationPaymentsTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />
      );
    case 'payouts':
      return <PayoutsTab />;
    case 'partner-payouts':
      return <PartnerPayoutsTab />;
    case 'requests':
      return <RequestsTab />;
    case 'admins':
      return <AdminsTab />;
    case 'audit':
      return <AuditTab />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

export function AdminDashboard({ tab }: { tab: AdminTabId }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [admin, setAdmin] = useState<{ id: number; email: string; name: string } | null>(null);
  const [openingReceiptUrl, setOpeningReceiptUrl] = useState<string | null>(null);

  const authed = Boolean(admin);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/auth');
        if (!res.ok) {
          if (!cancelled) setAdmin(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setAdmin(data.session ?? null);
      } catch {
        if (!cancelled) setAdmin(null);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: badges } = useQuery({
    queryKey: ['admin-badge-counts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/badge-counts');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        kycPending: number;
        paymentsPending: number;
        payoutsPending: number;
        partnerPayoutsPending: number;
        requestsPending: number;
        partnerSignupsAbandoned: number;
        licenseInvoicesPending?: number;
      }>;
    },
    enabled: authed,
    staleTime: 30_000,
  });
  const kycPending = badges?.kycPending ?? 0;
  const paymentsPending = badges?.paymentsPending ?? 0;
  const payoutsPending = badges?.payoutsPending ?? 0;
  const partnerPayoutsPending = badges?.partnerPayoutsPending ?? 0;
  const requestsPending = badges?.requestsPending ?? 0;
  const partnerSignupsAbandoned = badges?.partnerSignupsAbandoned ?? 0;
  const licenseInvoicesPending = badges?.licenseInvoicesPending ?? 0;

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAdmin(null);
  };

  const openReceipt = async (receiptUrl: string) => {
    const opened = window.open('', '_blank');
    if (opened) {
      opened.opener = null;
    }
    setOpeningReceiptUrl(receiptUrl);

    try {
      const res = await fetch(`/api/admin/receipts?url=${encodeURIComponent(receiptUrl)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        opened?.close();
        throw new Error(data?.error || 'Failed to open receipt');
      }

      if (opened) {
        opened.location.href = data.url;
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to open receipt');
    } finally {
      setOpeningReceiptUrl(null);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLoginPanel onAuthed={setAdmin} />;
  }

  const tabs = [
    { id: 'partners', label: 'Partners', icon: <Users size={13} />, badge: 0 },
    {
      id: 'partner-signups',
      label: 'Partner Signups',
      icon: <UserPlus size={13} />,
      badge: partnerSignupsAbandoned,
    },
    {
      id: 'license-invoices',
      label: 'Partner Licenses',
      icon: <ShieldCheck size={13} />,
      badge: licenseInvoicesPending,
    },
    { id: 'traders', label: 'Traders', icon: <Users size={13} />, badge: 0 },
    { id: 'trade-accounts', label: 'Trade Accounts', icon: <KeyRound size={13} />, badge: 0 },
    { id: 'kyc', label: 'KYC', icon: <BadgeCheck size={13} />, badge: kycPending },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={13} />, badge: paymentsPending },
    {
      id: 'evaluation-payments',
      label: 'Eval Payments',
      icon: <CreditCard size={13} />,
      badge: paymentsPending,
    },
    { id: 'payouts', label: 'Trader Payouts', icon: <Banknote size={13} />, badge: payoutsPending },
    {
      id: 'partner-payouts',
      label: 'Partner Payouts',
      icon: <Banknote size={13} />,
      badge: partnerPayoutsPending,
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: <MessageSquare size={13} />,
      badge: requestsPending,
    },
    { id: 'admins', label: 'Admins', icon: <Shield size={13} />, badge: 0 },
    { id: 'audit', label: 'Audit', icon: <ClipboardList size={13} />, badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center gap-1.5">
              <img src={LOGO_LIGHT} alt="FT9ja" className="h-7 w-auto sm:h-8" />
            </Link>
            <span className="text-gray-300">/</span>
            <Link href={adminTabPath('partners')} className="text-sm font-semibold text-gray-900">
              Admin
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs text-gray-500 sm:inline">{admin?.name}</span>
            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 sm:px-3"
            >
              <LogOut size={10} /> <span className="hidden sm:inline">Sign out</span>
            </button>
            <Link
              href="/admin/docs"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              <BookOpen size={10} /> Docs
            </Link>
            <Link
              href="/admin/emails"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300"
            >
              <Mail size={10} /> Emails
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 sm:px-3"
            >
              <ExternalLink size={10} /> <span className="hidden sm:inline">Apply Page</span>
              <span className="sm:hidden">Apply</span>
            </Link>
          </div>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={adminTabPath(t.id)}
                className={`flex shrink-0 items-center gap-1 border-b-2 px-3 py-3 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-4 ${tab === t.id ? 'border-[#16A34A] text-[#16A34A]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                {t.icon}
                {t.label}
                <TabBadge count={t.badge} />
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {renderAdminTab(tab, openReceipt, openingReceiptUrl)}
      </div>
    </div>
  );
}
