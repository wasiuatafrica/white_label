'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPartnerUrl } from '@/lib/tenant';
import { splitVerifiedAmount, type EvalType } from '@/lib/partner-pricing';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  TrendingUp,
  Search,
  Eye,
  EyeOff,
  Copy,
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
  admin_pin: string;
  created_at: string;
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

// ─── KYC Review Drawer ────────────────────────────────────────────────────────

function KYCDrawer({
  row,
  onClose,
  onDecision,
  loading,
}: {
  row: KYCRow;
  onClose: () => void;
  onDecision: (status: 'approved' | 'rejected') => void;
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
                <a
                  href={row.kyc_id_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 transition-colors"
                >
                  <FileText size={20} className="text-gray-400 group-hover:text-[#16A34A]" />
                  <span className="text-xs font-medium text-gray-500">ID Document</span>
                  <ZoomIn size={12} className="text-gray-400" />
                </a>
              )}
              {row.kyc_selfie_url ? (
                <a
                  href={row.kyc_selfie_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 hover:border-[#16A34A]/40 hover:bg-[#16A34A]/5 transition-colors"
                >
                  <Eye size={20} className="text-gray-400 group-hover:text-[#16A34A]" />
                  <span className="text-xs font-medium text-gray-500">Selfie with ID</span>
                  <ZoomIn size={12} className="text-gray-400" />
                </a>
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
  const [visiblePins, setVisiblePins] = useState<Set<number>>(new Set());
  const [copiedPinId, setCopiedPinId] = useState<number | null>(null);
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

  const togglePinVisibility = (partnerId: number) => {
    setVisiblePins((current) => {
      const next = new Set(current);
      if (next.has(partnerId)) {
        next.delete(partnerId);
      } else {
        next.add(partnerId);
      }
      return next;
    });
  };

  const copyPin = async (partnerId: number, pin: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(pin);
    setCopiedPinId(partnerId);
    window.setTimeout(() => setCopiedPinId(null), 1600);
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
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const sc = getStatusConfig(p.status);
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white"
                      style={{ backgroundColor: p.brand_color }}
                    >
                      {p.firm_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {p.firm_name}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium"
                          style={{ color: sc.color }}
                        >
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400 truncate">{p.owner_email}</div>
                      <div className="mt-1.5">
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
                            Receipt uploaded
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            <AlertTriangle size={11} /> No receipt
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">Admin PIN</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">
                          {p.admin_pin
                            ? visiblePins.has(p.id)
                              ? p.admin_pin
                              : '••••'
                            : 'No PIN'}
                        </span>
                        {p.admin_pin && (
                          <>
                            <button
                              type="button"
                              onClick={() => togglePinVisibility(p.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            >
                              {visiblePins.has(p.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                              {visiblePins.has(p.id) ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyPin(p.id, p.admin_pin)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <Copy size={11} />
                              {copiedPinId === p.id ? 'Copied' : 'Copy'}
                            </button>
                          </>
                        )}
                      </div>
                      {/* Mobile stats */}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 sm:hidden">
                        <span>
                          Traders: <strong className="text-gray-900">{p.total_traders}</strong>
                        </span>
                        <span>
                          Rev:{' '}
                          <strong className="text-gray-900">
                            {formatRevenue(p.total_revenue)}
                          </strong>
                        </span>
                        <span>
                          Fee:{' '}
                          <strong
                            className={p.monthly_fee_paid ? 'text-green-600' : 'text-red-500'}
                          >
                            {p.monthly_fee_paid ? 'Paid' : 'Unpaid'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-right shrink-0">
                    <div>
                      <div className="text-xs text-gray-400">Traders</div>
                      <div className="text-sm font-semibold text-gray-900">{p.total_traders}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Revenue</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatRevenue(p.total_revenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Fee Paid</div>
                      <div className="text-sm font-semibold">
                        {p.monthly_fee_paid ? (
                          <span className="text-[#16A34A]">Yes</span>
                        ) : (
                          <span className="text-red-500">No</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Link
                      href={getPartnerUrl(p.slug, '/admin')}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Eye size={12} /> View
                    </Link>
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
                          onClick={() => updateStatus.mutate({ slug: p.slug, status: 'suspended' })}
                          disabled={updateStatus.isPending}
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {p.status === 'active' && (
                      <button
                        onClick={() => updateStatus.mutate({ slug: p.slug, status: 'suspended' })}
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
                </div>
              );
            })}
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
      setSelected(null);
    },
  });

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
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <div
                key={row.trader_id}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 cursor-pointer sm:gap-4 sm:px-5"
                onClick={() => setSelected(row)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
                >
                  {row.trader_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{row.trader_name}</span>
                    {row.kyc_status === 'submitted' && <Badge color="amber">Submitted</Badge>}
                    {row.kyc_status === 'approved' && <Badge color="green">Approved</Badge>}
                    {row.kyc_status === 'rejected' && <Badge color="red">Rejected</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400 truncate">
                    {row.trader_email} · {row.partner_firm_name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400 sm:hidden">{row.kyc_id_type}</div>
                </div>
                <ChevronRight size={14} className="shrink-0 text-gray-300" />
              </div>
            ))}
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
            <h2 className="text-base font-semibold text-gray-900">Traders by Partner</h2>
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
          <div className="divide-y divide-gray-100">
            {grouped.map(({ partner, traders }) => {
              const sc = getStatusConfig(partner.status);
              return (
                <section key={partner.id}>
                  <div className="flex flex-col gap-3 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: partner.brandColor || '#16A34A' }}
                      >
                        {partner.firmName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-gray-900">
                            {partner.firmName}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium"
                            style={{ color: sc.color }}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{partner.slug}.ft9ja.com</p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500">
                      {traders.length} trader{traders.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {traders.map((row) => (
                      <div
                        key={row.trader_id}
                        className="flex flex-col gap-2 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {row.trader_name}
                            </span>
                            {row.trader_status === 'active' ? (
                              <Badge color="green">Active</Badge>
                            ) : (
                              <Badge color="gray">{row.trader_status}</Badge>
                            )}
                            {getKycBadge(row.kyc_status)}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {row.trader_email}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 sm:text-right">
                          Joined {formatDate(row.trader_created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
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
            <h2 className="text-base font-semibold text-gray-900">Trade Accounts by Partner</h2>
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
          <div className="divide-y divide-gray-100">
            {grouped.map(({ partner, accounts }) => {
              const sc = getStatusConfig(partner.status);
              return (
                <section key={partner.id}>
                  <div className="flex flex-col gap-3 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: partner.brandColor || '#16A34A' }}
                      >
                        {partner.firmName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-gray-900">
                            {partner.firmName}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium"
                            style={{ color: sc.color }}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{partner.slug}.ft9ja.com</p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500">
                      {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {accounts.map((row) => (
                      <div
                        key={row.trade_account_id}
                        className="flex flex-col gap-2 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {row.is_completed ? `MT5 ${row.number}` : 'Awaiting setup'}
                            </span>
                            <Badge color="gray">{formatAccountType(row.type_of_account)}</Badge>
                            {row.eval_type && <Badge color="blue">{row.eval_type}</Badge>}
                            {getAccountBadge(row)}
                            {row.has_aso ? <Badge color="purple">Has ASO</Badge> : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {row.trader_name} · {row.trader_email}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {row.platform} · {row.broker} · {row.acc_size}
                            {!row.is_completed ? ` · Code ${row.creation_code}` : ''}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 sm:text-right">
                          Created {formatDate(row.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
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
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div
                key={row.eval_id}
                className="flex flex-col gap-3 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                    style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
                  >
                    {row.eval_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{row.trader_name}</span>
                      <Badge color="gray">{row.eval_type}</Badge>
                      <Badge color="blue">{formatPaymentMethod(row.payment_method)}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400 truncate">
                      {row.trader_email} · {row.partner_firm_name}
                    </div>
                    <div className="mt-1">
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
                          View payment evidence
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          <AlertTriangle size={11} /> No payment evidence
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-black text-gray-900 sm:hidden">
                      ₦{parseFloat(row.amount).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-right mr-4">
                  <div className="text-sm font-black text-gray-900">
                    ₦{parseFloat(row.amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{formatDate(row.purchase_date)}</div>
                </div>
                <div className="shrink-0">
                  {rejecting === row.eval_id ? (
                    <div className="w-full max-w-sm space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
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
                          disabled={rejectPayment.isPending || !rejectNotes[row.eval_id]?.trim()}
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
                  ) : confirming === row.eval_id ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs">
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
                  ) : (
                    <div className="flex flex-wrap gap-2">
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50 sm:px-4"
                      >
                        <CheckCircle size={12} /> Confirm
                      </button>
                      <button
                        onClick={() => {
                          setConfirming(null);
                          setRejecting(row.eval_id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 sm:px-4"
                      >
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
            <h2 className="text-base font-semibold text-gray-900">Evaluation Payments by Partner</h2>
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
          <div className="divide-y divide-gray-100">
            {grouped.map(({ partner, payments }) => {
              const sc = getStatusConfig(partner.status);
              const partnerTotal = payments.reduce((s, row) => s + parseFloat(row.amount || '0'), 0);
              return (
                <section key={partner.id}>
                  <div className="flex flex-col gap-3 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: partner.brandColor || '#16A34A' }}
                      >
                        {partner.firmName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black text-gray-900">
                            {partner.firmName}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium"
                            style={{ color: sc.color }}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{partner.slug}.ft9ja.com</p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500">
                      {payments.length} payment{payments.length !== 1 ? 's' : ''} ·{' '}
                      {formatRevenue(partnerTotal.toString())}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {payments.map((row) => (
                      <div
                        key={row.eval_id}
                        className="flex flex-col gap-3 px-4 py-4 hover:bg-gray-50 lg:flex-row lg:items-center lg:gap-4 lg:px-5"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                            style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
                          >
                            {row.eval_type}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {row.trader_name}
                              </span>
                              <Badge color="gray">{row.eval_type}</Badge>
                              <Badge color="blue">{formatPaymentMethod(row.payment_method)}</Badge>
                              {getPaymentBadge(row.status)}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {row.trader_email} · {formatDate(row.purchase_date)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>
                                Amount:{' '}
                                <strong className="text-gray-900">
                                  ₦{parseFloat(row.amount).toLocaleString()}
                                </strong>
                              </span>
                              <span>
                                Target: <strong className="text-gray-900">{row.profit_target}%</strong>
                              </span>
                              <span>
                                Days:{' '}
                                <strong className="text-gray-900">{row.required_days}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                              <AlertTriangle size={11} /> No evidence
                            </span>
                          )}

                          {row.status === 'pending_payment' &&
                            rejecting === row.eval_id ? (
                              <div className="w-full max-w-md space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                                <p className="text-xs font-semibold text-red-800">
                                  Reject this payment?
                                </p>
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
                                      rejectPayment.isPending ||
                                      !rejectNotes[row.eval_id]?.trim()
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
                            ) : row.status === 'pending_payment' &&
                            confirming === row.eval_id ? (
                              <div className="w-full max-w-md space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
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
                                {parseFloat(
                                  verifiedAmounts[row.eval_id] ?? row.amount
                                ) <
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
                            ) : row.status === 'pending_payment' ? (
                              <div className="flex flex-wrap gap-2">
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
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                                >
                                  <CheckCircle size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirming(null);
                                    setRejecting(row.eval_id);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            ) : null}
                          {row.status === 'payment_rejected' && row.verification_note && (
                            <span className="text-xs text-red-600">{row.verification_note}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
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
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <div
                key={row.eval_id}
                className="flex flex-col gap-3 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white mt-0.5"
                    style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
                  >
                    {row.eval_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{row.trader_name}</span>
                      <Badge color="gray">{row.eval_type}</Badge>
                      {getKYCBadge(row.kyc_status)}
                      {getPayoutBadge(row.payout_status)}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400 truncate">
                      {row.trader_email} · {row.partner_firm_name}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-500">
                        Profit: <strong className="text-green-600">+{row.current_profit}%</strong>
                      </span>
                      <span className="text-gray-500">
                        Days:{' '}
                        <strong className="text-gray-800">
                          {row.trading_days}/{row.required_days}
                        </strong>
                      </span>
                      <span className="text-gray-500">
                        Amt:{' '}
                        <strong className="text-gray-800">
                          ₦{parseFloat(row.amount).toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <div className="text-xs text-gray-400">{formatDate(row.passed_at)}</div>
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
                    <span className="text-xs text-amber-600 font-medium">Awaiting KYC</span>
                  )}
                  {row.payout_status === 'processing' && (
                    <button
                      onClick={() => update.mutate({ eval_id: row.eval_id, payout_status: 'paid' })}
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
                </div>
              </div>
            ))}
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
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 hover:bg-gray-50 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                    style={{ backgroundColor: row.partner_brand_color || '#16A34A' }}
                  >
                    {row.partner_firm_name?.[0] ?? 'P'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {row.partner_firm_name ?? 'Partner'}
                      </span>
                      {getStatusBadge(row.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {row.partner_slug}.ft9ja.com · {formatDate(row.created_at)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>
                        Requested:{' '}
                        <strong className="text-gray-900">
                          ₦{parseFloat(row.amount_requested).toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        Available:{' '}
                        <strong className="text-gray-900">
                          ₦{row.available_balance.toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        {row.bank_name} · {row.account_number} · {row.account_name}
                      </span>
                    </div>
                    {row.notes && (
                      <p className="mt-1 text-xs text-gray-500">Partner note: {row.notes}</p>
                    )}
                    {row.admin_notes && (
                      <p className="mt-1 text-xs text-blue-700">Admin note: {row.admin_notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {row.status === 'pending' && (
                    <>
                      <textarea
                        rows={2}
                        placeholder="Optional admin note"
                        value={adminNotes[row.id] ?? ''}
                        onChange={(e) =>
                          setAdminNotes((current) => ({ ...current, [row.id]: e.target.value }))
                        }
                        className="w-full min-w-[220px] rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs sm:w-64"
                      />
                      <div className="flex flex-wrap gap-2">
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
                    </>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);

  const { data: rows = [], isLoading } = useQuery<RequestRow[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const decide = useMutation({
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
      setSelected(null);
      setAdminNotes('');
      setDeciding(null);
    },
  });

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Drawer */}
      {selected && (
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
                  {REQUEST_META_ADMIN[selected.request_type]?.icon}{' '}
                  {REQUEST_META_ADMIN[selected.request_type]?.label ?? selected.request_type}
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
                  style={{ backgroundColor: selected.partner_brand_color || '#16A34A' }}
                >
                  {selected.partner_firm_name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    {selected.partner_firm_name}
                  </div>
                  <div className="text-xs text-gray-400">{selected.partner_slug}.ft9ja.com</div>
                </div>
                <div className="ml-auto">
                  {selected.status === 'pending' && <Badge color="amber">Pending</Badge>}
                  {selected.status === 'approved' && <Badge color="green">Approved</Badge>}
                  {selected.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Trader
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {[
                    ['Name', selected.trader_name],
                    ['Email', selected.trader_email],
                    [
                      'KYC',
                      selected.kyc_status === 'approved'
                        ? '✅ Approved'
                        : selected.kyc_status === 'submitted'
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
                    ['ID', `EVL-${selected.eval_id.toString().padStart(6, '0')}`],
                    ['Type', selected.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'],
                    ['Amount', `₦${parseFloat(selected.amount).toLocaleString()}`],
                    ['Eval Status', selected.eval_status],
                    ['Submitted', formatDate(selected.created_at)],
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

              {selected.notes && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Trader Notes
                  </p>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs italic text-gray-700">
                    {selected.notes}
                  </div>
                </div>
              )}

              {selected.status === 'pending' ? (
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
                        decide.mutate({
                          request_id: selected.id,
                          status: 'rejected',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decide.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {decide.isPending && deciding === 'rejected' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}{' '}
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setDeciding('approved');
                        decide.mutate({
                          request_id: selected.id,
                          status: 'approved',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decide.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                    >
                      {decide.isPending && deciding === 'approved' ? (
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
                    className={selected.status === 'approved' ? 'text-green-600' : 'text-red-600'}
                  >
                    {selected.status}
                  </strong>
                  .
                  {selected.admin_notes && (
                    <div className="mt-1 italic text-gray-500">
                      Admin note: {selected.admin_notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            label: 'Pending Review',
            value: pendingCount,
            color: '#F59E0B',
            icon: <Clock size={16} />,
          },
          {
            label: 'Approved',
            value: rows.filter((r) => r.status === 'approved').length,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
          {
            label: 'Rejected',
            value: rows.filter((r) => r.status === 'rejected').length,
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

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Trader Requests</h2>
            <p className="text-xs text-gray-400">
              {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All up to date'}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
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
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => {
              const meta = REQUEST_META_ADMIN[row.request_type];
              return (
                <div
                  key={row.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-gray-50 sm:gap-4 sm:px-5"
                  onClick={() => {
                    setSelected(row);
                    setAdminNotes(row.admin_notes || '');
                    setDeciding(null);
                  }}
                >
                  <span className="shrink-0 text-xl">{meta?.icon ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {meta?.label ?? row.request_type}
                      </span>
                      {row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                      {row.status === 'approved' && <Badge color="green">Approved</Badge>}
                      {row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                      <Badge color="gray">{row.eval_type}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400 truncate">
                      {row.trader_name} · {row.partner_firm_name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">{formatDate(row.created_at)}</div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AsoRequestsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'completed' | 'all'>(
    'pending'
  );
  const [selected, setSelected] = useState<AsoRequestRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);

  const { data: rows = [], isLoading } = useQuery<AsoRequestRow[]>({
    queryKey: ['admin-aso-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aso-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const decide = useMutation({
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
      setSelected(null);
      setAdminNotes('');
      setDeciding(null);
    },
  });

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {selected && (
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
                  SS {selected.ss_account_number}
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
                  style={{ backgroundColor: selected.partner_brand_color || '#16A34A' }}
                >
                  {selected.partner_firm_name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">
                    {selected.partner_firm_name}
                  </div>
                  <div className="text-xs text-gray-400">{selected.partner_slug}.ft9ja.com</div>
                </div>
                <div className="ml-auto">
                  {selected.status === 'pending' && <Badge color="amber">Pending</Badge>}
                  {selected.status === 'approved' && <Badge color="green">Approved</Badge>}
                  {selected.status === 'completed' && <Badge color="blue">Completed</Badge>}
                  {selected.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {[
                  ['Trader', `${selected.trader_name} · ${selected.trader_email}`],
                  ['SS Account', String(selected.ss_account_number)],
                  [
                    'Profit',
                    `${selected.eligibility_profit ?? '0'}% / ${
                      selected.eligibility_profit_target ?? '0'
                    }%`,
                  ],
                  ['Requested', formatDate(selected.requested_at)],
                  [
                    'Token',
                    selected.approval_token_used_at
                      ? `Used ${formatDate(selected.approval_token_used_at)}`
                      : selected.approval_token_expires_at
                        ? `Expires ${formatDate(selected.approval_token_expires_at)}`
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

              {selected.status === 'pending' ? (
                <div className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Approval note or rejection reason..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
                  />
                  {decide.error && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {(decide.error as Error).message}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setDeciding('rejected');
                        decide.mutate({
                          request_id: selected.id,
                          status: 'rejected',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decide.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {decide.isPending && deciding === 'rejected' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setDeciding('approved');
                        decide.mutate({
                          request_id: selected.id,
                          status: 'approved',
                          admin_notes: adminNotes,
                        });
                      }}
                      disabled={decide.isPending}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
                    >
                      {decide.isPending && deciding === 'approved' ? (
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
                  This ASO request is <strong>{selected.status}</strong>.
                  {selected.rejection_reason && (
                    <div className="mt-1 italic text-gray-500">
                      Note: {selected.rejection_reason}
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
          { label: 'Pending', value: pendingCount, color: '#F59E0B', icon: <Clock size={16} /> },
          {
            label: 'Approved',
            value: rows.filter((r) => r.status === 'approved').length,
            color: '#16A34A',
            icon: <CheckCircle size={16} />,
          },
          {
            label: 'Completed',
            value: rows.filter((r) => r.status === 'completed').length,
            color: '#2563EB',
            icon: <Shield size={16} />,
          },
          {
            label: 'Rejected',
            value: rows.filter((r) => r.status === 'rejected').length,
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
            <h2 className="text-base font-semibold text-gray-900">ASO Requests</h2>
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
            <Shield size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No {filter === 'all' ? '' : filter} ASO requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50"
                onClick={() => {
                  setSelected(row);
                  setAdminNotes(row.rejection_reason || '');
                  setDeciding(null);
                }}
              >
                <Shield size={18} className="shrink-0 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      SS {row.ss_account_number}
                    </span>
                    {row.status === 'pending' && <Badge color="amber">Pending</Badge>}
                    {row.status === 'approved' && <Badge color="green">Approved</Badge>}
                    {row.status === 'completed' && <Badge color="blue">Completed</Badge>}
                    {row.status === 'rejected' && <Badge color="red">Rejected</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {row.trader_name} · {row.partner_firm_name} · {formatDate(row.requested_at)}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-gray-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LOGO_LIGHT =
  'https://dtvoeevhaseb5.cloudfront.net/user-uploads/4eccdbc1-dabd-439b-8e76-68c9cf5bb8a4.png';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [pwChecking, setPwChecking] = useState(false);
  const [openingReceiptUrl, setOpeningReceiptUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<
    | 'partners'
    | 'partner-signups'
    | 'traders'
    | 'trade-accounts'
    | 'kyc'
    | 'payments'
    | 'evaluation-payments'
    | 'payouts'
    | 'partner-payouts'
    | 'requests'
    | 'aso-requests'
  >('partners');

  const { data: kycRows = [] } = useQuery<KYCRow[]>({
    queryKey: ['admin-kyc'],
    queryFn: async () => {
      const res = await fetch('/api/admin/kyc');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: paymentRows = [] } = useQuery<PaymentRow[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: payoutRows = [] } = useQuery<PayoutRow[]>({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payouts');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: requestRows = [] } = useQuery<RequestRow[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: asoRequestRows = [] } = useQuery<AsoRequestRow[]>({
    queryKey: ['admin-aso-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/aso-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: partnerSignupRows = [] } = useQuery<PartnerSignupRow[]>({
    queryKey: ['admin-partner-signups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/partner-signup-events');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const { data: partnerPayoutRows = [] } = useQuery<PartnerPayoutRequestRow[]>({
    queryKey: ['admin-partner-payouts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/partner-payouts');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: authed,
  });
  const kycPending = kycRows.filter((r) => r.kyc_status === 'submitted').length;
  const paymentsPending = paymentRows.length;
  const payoutsPending = payoutRows.filter((r) => !r.payout_status).length;
  const partnerPayoutsPending = partnerPayoutRows.filter((r) => r.status === 'pending').length;
  const requestsPending = requestRows.filter((r) => r.status === 'pending').length;
  const asoRequestsPending = asoRequestRows.filter((r) => r.status === 'pending').length;
  const partnerSignupsAbandoned = partnerSignupRows.filter((r) => r.status === 'abandoned').length;

  const checkPw = async () => {
    setPwChecking(true);
    setPwError(false);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });

      if (res.ok) {
        setPw('');
        setAuthed(true);
      } else {
        setPwError(true);
      }
    } catch {
      setPwError(true);
    } finally {
      setPwChecking(false);
    }
  };

  const submitPw = () => {
    if (!pw || pwChecking) {
      return;
    }

    void checkPw();
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

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8">
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-4">
              <img src={LOGO_LIGHT} alt="FT9ja" className="h-8 w-auto" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Super Admin</h1>
            <p className="mt-1 text-sm text-gray-500">Enter your admin password to continue.</p>
          </div>
          <input
            type="password"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#16A34A]/20 ${pwError ? 'border-red-300 focus:border-red-300' : 'border-gray-200 focus:border-[#16A34A]'}`}
            placeholder="Admin password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setPwError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPw();
            }}
          />
          {pwError && <p className="mt-1 text-xs text-red-500">Incorrect password.</p>}
          <button
            onClick={submitPw}
            disabled={!pw || pwChecking}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pwChecking && <Loader2 size={14} className="animate-spin" />}
            Access Admin
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'partners', label: 'Partners', icon: <Users size={13} />, badge: 0 },
    {
      id: 'partner-signups',
      label: 'Partner Signups',
      icon: <UserPlus size={13} />,
      badge: partnerSignupsAbandoned,
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
    {
      id: 'aso-requests',
      label: 'ASO Requests',
      icon: <Shield size={13} />,
      badge: asoRequestsPending,
    },
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
            <span className="text-sm font-semibold text-gray-900">Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
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
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1 border-b-2 px-3 py-3 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-4 ${tab === t.id ? 'border-[#16A34A] text-[#16A34A]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                {t.icon}
                {t.label}
                <TabBadge count={t.badge} />
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === 'partners' && (
          <PartnersTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />
        )}
        {tab === 'partner-signups' && <PartnerSignupsTab />}
        {tab === 'traders' && <TradersTab />}
        {tab === 'trade-accounts' && <TradeAccountsTab />}
        {tab === 'kyc' && <KYCTab />}
        {tab === 'payments' && (
          <PaymentsTab onOpenReceipt={openReceipt} openingReceiptUrl={openingReceiptUrl} />
        )}
        {tab === 'evaluation-payments' && (
          <EvaluationPaymentsTab
            onOpenReceipt={openReceipt}
            openingReceiptUrl={openingReceiptUrl}
          />
        )}
        {tab === 'payouts' && <PayoutsTab />}
        {tab === 'partner-payouts' && <PartnerPayoutsTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'aso-requests' && <AsoRequestsTab />}
      </div>
    </div>
  );
}
