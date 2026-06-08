'use client';
import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Plus,
  X,
  Loader2,
  CheckCircle,
  Save,
  Sparkles,
  Lock,
  KeyRound,
  ShieldCheck,
  Clock,
  AlertCircle,
  CreditCard,
  Banknote,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

// ─── Types ────────────────────────────────────────────────────────────────────

type Partner = {
  id: number;
  slug: string;
  firm_name: string;
  brand_color: string;
  secondary_color: string;
  tagline: string;
  status: string;
  monthly_fee_paid: boolean;
  total_traders: number;
  total_revenue: string;
  description: string;
  logo_url: string;
  template: string;
  fee_markup: number;
};

type Trader = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  kyc_status: string;
  kyc_submitted_at?: string;
  kyc_full_name?: string;
  kyc_id_type?: string;
  kyc_id_number?: string;
  kyc_id_url?: string;
  kyc_address?: string;
};

type Evaluation = {
  id: number;
  trader_id: number;
  trader_name: string;
  trader_email: string;
  eval_type: string;
  amount: string;
  status: string;
  payout_status: string | null;
  profit_target: string;
  current_profit: string;
  max_drawdown: string;
  current_drawdown: string;
  trading_days: number;
  required_days: number;
  purchase_date: string;
  updated_at: string;
};

type PayoutRequest = {
  id: number;
  partner_id: number;
  amount_requested: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return '—';
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
  const part = d.split('T')[0] ?? '';
  const [yr, mo, day] = part.split('-');
  return `${parseInt(day ?? '1')} ${months[parseInt(mo ?? '1') - 1] ?? ''} ${yr ?? ''}`;
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function StatCard({
  label,
  value,
  icon,
  color = '#6B7280',
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPickerField({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 hover:border-gray-300 transition-colors"
        >
          <div
            className="h-6 w-6 rounded-md border border-gray-200 shadow-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-mono text-gray-700">{color}</span>
          <div className="ml-auto text-xs text-gray-400">Click to edit</div>
        </button>
        {open && (
          <div className="absolute z-50 mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <HexColorPicker color={color} onChange={onChange} />
            <input
              type="text"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none"
              placeholder="#000000"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({
  evaluations,
  traders,
  partner,
  primary,
}: {
  evaluations: Evaluation[];
  traders: Trader[];
  partner: Partner;
  primary: string;
}) {
  const qc = useQueryClient();
  const slug = partner.slug;

  const activateEval = useMutation({
    mutationFn: async (evalId: number) => {
      const res = await fetch(`/api/partners/${slug}/evaluations/${evalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations', slug] });
      qc.invalidateQueries({ queryKey: ['traders', slug] });
    },
  });

  const pending = evaluations.filter((e) => e.status === 'pending_payment');
  const confirmed = evaluations.filter((e) => e.status !== 'pending_payment');
  const totalRevenue = confirmed.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const markup = partner.fee_markup || 0;
  const partnerEarnings = confirmed.length * markup;
  const ft9jaEarnings = totalRevenue - partnerEarnings;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Evaluations"
          value={evaluations.length}
          icon={<CreditCard size={16} />}
          color="#6B7280"
        />
        <StatCard
          label="Pending Payment"
          value={pending.length}
          icon={<Clock size={16} />}
          color="#F59E0B"
        />
        <StatCard
          label="Confirmed Revenue"
          value={fmtMoney(totalRevenue)}
          icon={<DollarSign size={16} />}
          color="#16A34A"
        />
        <StatCard
          label="Your Earnings"
          value={fmtMoney(partnerEarnings)}
          icon={<TrendingUp size={16} />}
          color="#2563EB"
          sub={`₦${markup.toLocaleString()} markup × ${confirmed.length} evals`}
        />
      </div>

      {/* Revenue breakdown */}
      {confirmed.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Revenue Breakdown</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                label: 'Gross Revenue Collected',
                value: fmtMoney(totalRevenue),
                desc: `${confirmed.length} paid evaluations`,
                color: '#6B7280',
              },
              {
                label: 'FT9ja Platform Fee',
                value: fmtMoney(ft9jaEarnings),
                desc: 'Base prices go to FT9ja',
                color: '#DC2626',
              },
              {
                label: 'Your Net Earnings',
                value: fmtMoney(partnerEarnings),
                desc: `Markup revenue (₦${markup.toLocaleString()}/eval)`,
                color: '#16A34A',
              },
            ].map((r) => (
              <div key={r.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs font-medium text-gray-400">{r.label}</div>
                <div className="mt-1.5 text-xl font-black" style={{ color: r.color }}>
                  {r.value}
                </div>
                <div className="mt-0.5 text-xs text-gray-400">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payments */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <Clock size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              Awaiting Payment Confirmation
            </span>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {pending.map((ev) => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ backgroundColor: primary }}
                >
                  {ev.trader_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{ev.trader_name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {ev.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {ev.trader_email} · {fmtDate(ev.purchase_date)}
                  </div>
                </div>
                <div className="text-right mr-2">
                  <div className="text-sm font-black text-gray-900">
                    ₦{parseFloat(ev.amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">due</div>
                </div>
                <button
                  onClick={() => activateEval.mutate(ev.id)}
                  disabled={activateEval.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#16A34A' }}
                >
                  {activateEval.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={12} />
                  )}
                  Activate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {confirmed.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Payment History</h3>
            <p className="text-xs text-gray-400">{confirmed.length} confirmed evaluations</p>
          </div>
          <div className="divide-y divide-gray-100">
            {confirmed.map((ev) => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: primary }}
                >
                  {ev.eval_type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{ev.trader_name}</div>
                  <div className="text-xs text-gray-400">
                    {ev.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} ·{' '}
                    {fmtDate(ev.purchase_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    +₦{parseFloat(ev.amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Your cut:{' '}
                    <span className="font-semibold text-gray-700">₦{markup.toLocaleString()}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${ev.status === 'active' ? 'border-green-200 bg-green-50 text-green-700' : ev.status === 'passed' ? 'border-blue-200 bg-blue-50 text-blue-700' : ev.status === 'failed' ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                >
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluations.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <CreditCard size={28} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">
            No evaluations yet. Share your landing page to start selling.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Payouts Tab ──────────────────────────────────────────────────────────────

function PayoutsTab({
  evaluations,
  partner,
  primary,
}: {
  evaluations: Evaluation[];
  partner: Partner;
  primary: string;
}) {
  const qc = useQueryClient();
  const slug = partner.slug;
  const markup = partner.fee_markup || 0;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bank_name: '',
    account_number: '',
    account_name: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: payoutRequests = [], isLoading: prLoading } = useQuery<PayoutRequest[]>({
    queryKey: ['payout-requests', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/payout-requests`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const confirmed = evaluations.filter((e) => e.status !== 'pending_payment');
  const totalEarnings = confirmed.length * markup;
  const approvedRequests = payoutRequests.filter((r) => r.status === 'approved');
  const totalPaid = approvedRequests.reduce((s, r) => s + parseFloat(r.amount_requested || '0'), 0);
  const balance = totalEarnings - totalPaid;
  const hasPending = payoutRequests.some((r) => r.status === 'pending');

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!form.bank_name || !form.account_number || !form.account_name)
        throw new Error('All bank fields are required');
      const res = await fetch(`/api/partners/${slug}/payout-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_requested: balance, ...form }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payout-requests', slug] });
      setShowForm(false);
      setForm({ bank_name: '', account_number: '', account_name: '', notes: '' });
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const getStatusBadge = (status: string) => {
    if (status === 'pending')
      return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          ⏳ Pending
        </span>
      );
    if (status === 'approved')
      return (
        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
          ✅ Approved
        </span>
      );
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
        ❌ Rejected
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Earned"
          value={fmtMoney(totalEarnings)}
          icon={<TrendingUp size={16} />}
          color="#16A34A"
          sub={`₦${markup.toLocaleString()} × ${confirmed.length} evals`}
        />
        <StatCard
          label="Already Paid"
          value={fmtMoney(totalPaid)}
          icon={<CheckCircle size={16} />}
          color="#2563EB"
        />
        <StatCard
          label="Available Balance"
          value={fmtMoney(Math.max(balance, 0))}
          icon={<Banknote size={16} />}
          color={balance > 0 ? '#F59E0B' : '#6B7280'}
        />
      </div>

      {/* How earnings work */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h4 className="mb-2 text-xs font-semibold text-blue-800">💡 How Your Earnings Work</h4>
        <p className="text-xs text-blue-700">
          You earn <strong>₦{markup.toLocaleString()}</strong> for every confirmed evaluation. FT9ja
          pays out your balance upon request after verifying your bank details. Current markup:{' '}
          <strong>₦{markup.toLocaleString()}</strong> per evaluation.
        </p>
      </div>

      {/* Payout Request CTA */}
      {balance > 0 && !hasPending && !showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-black text-gray-900">Ready to withdraw?</div>
            <div className="mt-0.5 text-sm text-gray-500">
              You have <strong className="text-[#16A34A]">{fmtMoney(balance)}</strong> available.
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            <Send size={14} /> Request Payout
          </button>
        </div>
      )}

      {hasPending && !showForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <Clock size={16} className="shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Payout request under review</p>
            <p className="text-xs text-amber-700">
              FT9ja will process your payout within 24–48 hours.
            </p>
          </div>
        </div>
      )}

      {balance === 0 && !hasPending && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
          <p className="text-sm text-gray-500">
            No balance available yet. Grow your trader base to earn more.
          </p>
        </div>
      )}

      {/* Payout Request Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Request Payout</h3>
              <p className="text-xs text-gray-400">
                Amount: <strong className="text-gray-900">{fmtMoney(balance)}</strong>
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: 'Bank Name', key: 'bank_name', placeholder: 'e.g. GTBank, First Bank' },
              { label: 'Account Number', key: 'account_number', placeholder: '0123456789' },
              {
                label: 'Account Name',
                key: 'account_name',
                placeholder: 'As on your bank account',
              },
            ].map((f) => (
              <div key={f.key} className={f.key === 'account_name' ? 'md:col-span-2' : ''}>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))}
                placeholder="Any notes for FT9ja..."
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={12} /> {formError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => submitRequest.mutate()}
              disabled={submitRequest.isPending}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {submitRequest.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Submit Request
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Request History */}
      {!prLoading && payoutRequests.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Payout Request History</h3>
            <p className="text-xs text-gray-400">
              {payoutRequests.length} request{payoutRequests.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {payoutRequests.map((r) => (
              <div key={r.id} className="flex items-start gap-4 px-5 py-4">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                  style={{ backgroundColor: `${primary}20`, color: primary }}
                >
                  <Banknote size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {fmtMoney(parseFloat(r.amount_requested))}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {r.bank_name} · {r.account_number} · {r.account_name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">{fmtDate(r.created_at)}</div>
                  {r.admin_notes && (
                    <div className="mt-1 text-xs italic text-gray-500">FT9ja: {r.admin_notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({
  evaluations,
  traders,
  partner,
  primary,
}: {
  evaluations: Evaluation[];
  traders: Trader[];
  partner: Partner;
  primary: string;
}) {
  const markup = partner.fee_markup || 0;
  const confirmed = evaluations.filter((e) => e.status !== 'pending_payment');
  const active = evaluations.filter((e) => e.status === 'active');
  const passed = evaluations.filter((e) => e.status === 'passed');
  const failed = evaluations.filter((e) => e.status === 'failed');
  const pending = evaluations.filter((e) => e.status === 'pending_payment');

  const sslEvals = confirmed.filter((e) => e.eval_type === 'SSL');
  const ssEvals = confirmed.filter((e) => e.eval_type === 'SS');

  const totalRevenue = confirmed.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  const partnerEarnings = confirmed.length * markup;
  const passRate = confirmed.length > 0 ? Math.round((passed.length / confirmed.length) * 100) : 0;
  const kycApproved = traders.filter((t) => t.kyc_status === 'approved').length;
  const kycSubmitted = traders.filter((t) => t.kyc_status === 'submitted').length;

  // Monthly chart data — derived purely from evaluation date strings, no Date objects needed
  const MONTH_LABELS: Record<string, string> = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'May',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Aug',
    '09': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec',
  };

  // Build a sorted unique list of YYYY-MM keys from ALL evaluations (not just confirmed)
  const allMonthKeys = Array.from(
    new Set(
      evaluations.map((ev) => (ev.purchase_date ?? '').slice(0, 7)).filter((k) => k.length === 7)
    )
  ).sort();

  // Take last 6 months. If fewer than 6, pad from the earliest available
  const last6Keys = allMonthKeys.slice(-6);

  // If we have fewer than 6 distinct months, pad with synthetic keys before the earliest
  while (last6Keys.length < 6 && last6Keys.length > 0) {
    const first = last6Keys[0]!;
    const [fy, fm] = first.split('-');
    let py = parseInt(fy ?? '2026', 10);
    let pm = parseInt(fm ?? '01', 10) - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    const prev = `${py}-${String(pm).padStart(2, '0')}`;
    last6Keys.unshift(prev);
  }
  // If still empty (no evals at all), show placeholder months
  const chartKeys: string[] = last6Keys.length > 0 ? last6Keys : ['', '', '', '', '', ''];

  const monthlyData = chartKeys.map((key) => {
    const [, mm] = key.split('-');
    const label = mm ? (MONTH_LABELS[mm] ?? key) : '—';
    const monthEvals = confirmed.filter((ev) => (ev.purchase_date ?? '').startsWith(key));
    return {
      label,
      count: monthEvals.length,
      revenue: monthEvals.reduce((s, e) => s + parseFloat(e.amount || '0'), 0),
    };
  });

  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1);

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Traders"
          value={traders.length}
          icon={<Users size={16} />}
          color="#2563EB"
          sub={`${traders.filter((t) => t.status === 'active').length} active`}
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          icon={<TrendingUp size={16} />}
          color={passRate >= 50 ? '#16A34A' : '#F59E0B'}
          sub={`${passed.length} of ${confirmed.length} evals`}
        />
        <StatCard
          label="Total Earnings"
          value={fmtMoney(partnerEarnings)}
          icon={<DollarSign size={16} />}
          color="#16A34A"
          sub={`₦${markup.toLocaleString()} markup/eval`}
        />
        <StatCard
          label="KYC Approved"
          value={kycApproved}
          icon={<ShieldCheck size={16} />}
          color="#7C3AED"
          sub={`${kycSubmitted} pending review`}
        />
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Revenue (Last 6 Months)</h3>
            <p className="text-xs text-gray-400">Based on confirmed evaluation purchases</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-base font-black text-gray-900">{fmtMoney(totalRevenue)}</div>
          </div>
        </div>
        <div className="flex items-end gap-3 h-36">
          {monthlyData.map((m) => {
            const barH =
              maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 8 : 0) : 0;
            return (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="text-xs font-semibold text-gray-700">
                  {m.count > 0 ? fmtMoney(m.revenue) : ''}
                </div>
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${barH}%`,
                      backgroundColor: m.revenue > 0 ? primary : '#F3F4F6',
                      minHeight: '4px',
                    }}
                  />
                </div>
                <div className="text-xs font-medium text-gray-400">{m.label}</div>
                {m.count > 0 && (
                  <div className="text-xs text-gray-300">
                    {m.count} eval{m.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two column: Eval breakdown + Trader activity */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Evaluation Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Evaluation Breakdown</h3>
          <div className="space-y-3">
            {[
              {
                label: '✅ Active',
                value: active.length,
                total: evaluations.length,
                color: '#16A34A',
              },
              {
                label: '⏳ Pending Payment',
                value: pending.length,
                total: evaluations.length,
                color: '#F59E0B',
              },
              {
                label: '🏆 Passed',
                value: passed.length,
                total: evaluations.length,
                color: '#2563EB',
              },
              {
                label: '❌ Failed',
                value: failed.length,
                total: evaluations.length,
                color: '#DC2626',
              },
            ].map((r) => {
              const pct =
                evaluations.length > 0 ? Math.round((r.value / evaluations.length) * 100) : 0;
              return (
                <div key={r.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{r.label}</span>
                    <span className="text-xs font-bold text-gray-900">
                      {r.value} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: r.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Standard (SS)', value: ssEvals.length, icon: '💼' },
              { label: 'Starter (SSL)', value: sslEvals.length, icon: '🌱' },
            ].map((r) => (
              <div
                key={r.label}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"
              >
                <div className="text-lg">{r.icon}</div>
                <div className="mt-1 text-xl font-black text-gray-900">{r.value}</div>
                <div className="text-xs text-gray-400">{r.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trader Leaderboard */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Top Traders (by Evaluations)</h3>
          {traders.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No traders yet.</div>
          ) : (
            <div className="space-y-2">
              {traders
                .map((t) => ({
                  ...t,
                  evalCount: evaluations.filter((e) => e.trader_email === t.email).length,
                  passCount: evaluations.filter(
                    (e) => e.trader_email === t.email && e.status === 'passed'
                  ).length,
                  revenue: evaluations
                    .filter((e) => e.trader_email === t.email && e.status !== 'pending_payment')
                    .reduce((s, e) => s + parseFloat(e.amount || '0'), 0),
                }))
                .sort((a, b) => b.evalCount - a.evalCount)
                .slice(0, 6)
                .map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <div className="w-5 shrink-0 text-center text-xs font-black text-gray-300">
                      #{i + 1}
                    </div>
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {t.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{t.name}</div>
                      <div className="text-xs text-gray-400 truncate">{t.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">
                        {t.evalCount} eval{t.evalCount !== 1 ? 's' : ''}
                      </div>
                      {t.passCount > 0 && (
                        <div className="text-xs text-green-600">{t.passCount} passed</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* KYC Pipeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">KYC Pipeline</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Not Started',
              value: traders.filter((t) => !t.kyc_status || t.kyc_status === 'not_started').length,
              color: '#9CA3AF',
              icon: '⚪',
            },
            { label: 'Submitted', value: kycSubmitted, color: '#F59E0B', icon: '🟡' },
            { label: 'Approved', value: kycApproved, color: '#16A34A', icon: '🟢' },
            {
              label: 'Rejected',
              value: traders.filter((t) => t.kyc_status === 'rejected').length,
              color: '#DC2626',
              icon: '🔴',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1.5 text-2xl font-black" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="mt-0.5 text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-gray-500">KYC Completion Rate</span>
            <span className="font-bold text-gray-900">
              {traders.length > 0 ? Math.round((kycApproved / traders.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#16A34A] transition-all duration-700"
              style={{
                width: `${traders.length > 0 ? Math.round((kycApproved / traders.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Quick Insights</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            {
              icon: confirmed.length > 5 ? '🔥' : '📊',
              label: 'Sales Volume',
              value: `${confirmed.length} confirmed eval${confirmed.length !== 1 ? 's' : ''}`,
              detail:
                confirmed.length >= 10
                  ? 'Excellent momentum!'
                  : confirmed.length >= 5
                    ? 'Good progress — keep going!'
                    : 'Getting started — share your link!',
              color:
                confirmed.length >= 10 ? '#16A34A' : confirmed.length >= 5 ? '#F59E0B' : '#6B7280',
            },
            {
              icon: passRate >= 50 ? '✅' : passRate > 0 ? '📈' : '📋',
              label: 'Pass Rate',
              value: `${passRate}% pass rate`,
              detail:
                passRate >= 60
                  ? 'Your traders are performing well!'
                  : passRate >= 30
                    ? 'Room for improvement — offer support'
                    : confirmed.length === 0
                      ? 'No data yet'
                      : 'Low pass rate — check rules clarity',
              color: passRate >= 50 ? '#16A34A' : '#F59E0B',
            },
            {
              icon: markup >= 20000 ? '💰' : '💡',
              label: 'Markup Strategy',
              value: `₦${markup.toLocaleString()} per eval`,
              detail:
                markup === 0
                  ? 'Consider adding markup for earnings'
                  : markup >= 20000
                    ? 'Strong markup — great earnings!'
                    : 'Moderate markup — consider increasing',
              color: markup > 0 ? '#16A34A' : '#F59E0B',
            },
            {
              icon: kycApproved >= traders.length * 0.5 ? '🛡️' : '⚠️',
              label: 'KYC Status',
              value: `${kycApproved}/${traders.length} traders verified`,
              detail:
                kycApproved === traders.length && traders.length > 0
                  ? 'All traders KYC-verified!'
                  : 'Remind traders to complete KYC',
              color: kycApproved >= traders.length * 0.5 ? '#16A34A' : '#F59E0B',
            },
          ].map((ins) => (
            <div
              key={ins.label}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <span className="text-2xl shrink-0">{ins.icon}</span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {ins.label}
                </div>
                <div className="mt-0.5 text-sm font-bold" style={{ color: ins.color }}>
                  {ins.value}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{ins.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function PartnerAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const qc = useQueryClient();

  // ── PIN gate ──────────────────────────────────────────────────────────────
  const [pinAuthed, setPinAuthed] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [verifiedPin, setVerifiedPin] = useState('');

  useEffect(() => {
    const authed = sessionStorage.getItem(`partner_admin_${slug}`) === 'true';
    const saved = sessionStorage.getItem(`partner_pin_${slug}`) || '';
    setPinAuthed(authed);
    setVerifiedPin(saved);
  }, [slug]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await fetch(`/api/partners/${slug}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem(`partner_admin_${slug}`, 'true');
        sessionStorage.setItem(`partner_pin_${slug}`, pinInput);
        setPinAuthed(true);
        setVerifiedPin(pinInput);
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch {
      setPinError('Could not verify PIN. Check your connection.');
    } finally {
      setPinLoading(false);
    }
  }

  // ── Admin state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<
    'overview' | 'payments' | 'payouts' | 'analytics' | 'traders' | 'settings'
  >('overview');
  const [showAddTrader, setShowAddTrader] = useState(false);
  const [newTrader, setNewTrader] = useState({ name: '', email: '' });
  const [addError, setAddError] = useState<string | null>(null);

  const [brandForm, setBrandForm] = useState({
    firm_name: '',
    tagline: '',
    description: '',
    brand_color: '#16A34A',
    secondary_color: '#F59E0B',
    logo_url: '',
    template: 'minimal',
    admin_pin: '',
    fee_markup: 0,
  });
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [logoStyle, setLogoStyle] = useState<'modern' | 'bold' | 'elegant'>('modern');
  const [generatedLogos, setGeneratedLogos] = useState<string[]>([]);
  const [logoGenError, setLogoGenError] = useState<string | null>(null);

  const { data: partner, isLoading: partnerLoading } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!pinAuthed,
  });

  useEffect(() => {
    if (partner) {
      setBrandForm({
        firm_name: partner.firm_name || '',
        tagline: partner.tagline || '',
        description: partner.description || '',
        brand_color: partner.brand_color || '#16A34A',
        secondary_color: partner.secondary_color || '#F59E0B',
        logo_url: partner.logo_url || '',
        template: partner.template || 'minimal',
        admin_pin: '',
        fee_markup: partner.fee_markup || 0,
      });
    }
  }, [partner]);

  const { data: traders = [], isLoading: tradersLoading } = useQuery<Trader[]>({
    queryKey: ['traders', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/traders`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!partner,
  });

  const { data: evalData, isLoading: evalsLoading } = useQuery<{ evaluations: Evaluation[] }>({
    queryKey: ['evaluations', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/evaluations`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!partner,
  });

  const allEvals = evalData?.evaluations ?? [];
  const pendingEvals = allEvals.filter((e) => e.status === 'pending_payment');

  const addTrader = useMutation({
    mutationFn: async (data: { name: string; email: string; partner_id: number }) => {
      const res = await fetch(`/api/partners/${slug}/traders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['traders', slug] });
      setShowAddTrader(false);
      setNewTrader({ name: '', email: '' });
      setAddError(null);
    },
    onError: (e: Error) => setAddError(e.message),
  });

  const saveBranding = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...brandForm };
      if (!brandForm.admin_pin) delete payload.admin_pin;
      const res = await fetch(`/api/partners/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner', slug] });
      setBrandSaved(true);
      setBrandError(null);
      setBrandForm((f) => ({ ...f, admin_pin: '' }));
      setTimeout(() => setBrandSaved(false), 3000);
    },
    onError: (e: Error) => setBrandError(e.message),
  });

  const generateLogos = useMutation({
    mutationFn: async () => {
      setLogoGenError(null);
      const res = await fetch(`/api/partners/${slug}/generate-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firm_name: brandForm.firm_name || partner?.firm_name,
          brand_color: brandForm.brand_color,
          style: logoStyle,
        }),
      });
      if (!res.ok) throw new Error('Logo generation failed');
      const data = await res.json();
      return data.logos as string[];
    },
    onSuccess: (logos) => setGeneratedLogos(logos),
    onError: (e: Error) => setLogoGenError(e.message),
  });

  const reviewKyc = useMutation({
    mutationFn: async ({
      traderId,
      action,
    }: {
      traderId: number;
      action: 'approved' | 'rejected';
    }) => {
      const res = await fetch(`/api/partners/${slug}/traders/${traderId}/kyc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_status: action, admin_pin: verifiedPin }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traders', slug] }),
  });

  // ── PIN Gate ───────────────────────────────────────────────────────────────
  if (pinAuthed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <Loader2
          size={24}
          className="text-gray-300"
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

  if (!pinAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
              <Lock size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Partner Admin</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your PIN to access <strong className="text-gray-700">{slug}.ft9ja.com</strong>
            </p>
          </div>
          <form
            onSubmit={handlePinSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Admin PIN</label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-lg font-mono tracking-widest text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
            {pinError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle size={12} /> {pinError}
              </div>
            )}
            <button
              type="submit"
              disabled={!pinInput || pinLoading}
              className="mt-4 w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {pinLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                  Verifying…
                </span>
              ) : (
                'Unlock Admin'
              )}
            </button>
            <p className="mt-4 text-center text-xs text-gray-400">
              Default PIN is <span className="font-mono font-semibold">0000</span>. Change it in
              Settings.
            </p>
          </form>
          <div className="mt-4 text-center">
            <Link href={`/${slug}`} className="text-xs text-gray-400 hover:text-gray-700">
              ← Back to {slug}.ft9ja.com
            </Link>
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

  if (partnerLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  if (!partner)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Partner not found.</p>
      </div>
    );

  const primary = brandForm.brand_color || '#16A34A';
  const revenue = parseFloat(partner.total_revenue || '0');
  const markup = partner.fee_markup || 0;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <Activity size={13} />, badge: 0 },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard size={13} />,
      badge: pendingEvals.length,
    },
    { id: 'payouts', label: 'Payouts', icon: <Banknote size={13} />, badge: 0 },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={13} />, badge: 0 },
    { id: 'traders', label: 'Traders', icon: <Users size={13} />, badge: 0 },
    { id: 'settings', label: 'Settings', icon: <KeyRound size={13} />, badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
              style={{ backgroundColor: primary }}
            >
              {partner.firm_name[0]}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{partner.firm_name}</div>
              <div className="text-xs text-gray-400">{slug}.ft9ja.com</div>
            </div>
            <div
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${partner.status === 'active' ? 'border-green-200 bg-green-50 text-green-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'}`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${partner.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              {partner.status}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300"
            >
              <ExternalLink size={11} /> View Page
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem(`partner_admin_${slug}`);
                sessionStorage.removeItem(`partner_pin_${slug}`);
                setPinAuthed(false);
                setPinInput('');
                setVerifiedPin('');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 hover:border-gray-300"
            >
              <Lock size={11} /> Lock
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-6xl px-6 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                style={tab === t.id ? { color: primary, borderColor: primary } : {}}
              >
                {t.icon} {t.label}
                {t.badge > 0 && (
                  <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {pendingEvals.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <Clock size={16} className="mt-0.5 shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-yellow-900">
                    {pendingEvals.length} evaluation{pendingEvals.length !== 1 ? 's' : ''} awaiting
                    payment
                  </div>
                  <div className="text-xs text-yellow-700">
                    Activate them once you've confirmed the bank transfer.
                  </div>
                </div>
                <button
                  onClick={() => setTab('payments')}
                  className="shrink-0 rounded-lg border border-yellow-300 bg-white px-3 py-1.5 text-xs font-semibold text-yellow-800"
                >
                  Review →
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Total Traders"
                value={traders.length}
                icon={<Users size={16} />}
                color={primary}
              />
              <StatCard
                label="Active Evaluations"
                value={allEvals.filter((e) => e.status === 'active').length}
                icon={<TrendingUp size={16} />}
                color="#16A34A"
              />
              <StatCard
                label="Your Earnings"
                value={
                  markup > 0
                    ? fmtMoney(
                        allEvals.filter((e) => e.status !== 'pending_payment').length * markup
                      )
                    : '₦0'
                }
                icon={<DollarSign size={16} />}
                color="#2563EB"
              />
              <StatCard
                label="License"
                value={partner.monthly_fee_paid ? 'Paid ✓' : 'Unpaid'}
                icon={<ShieldCheck size={16} />}
                color={partner.monthly_fee_paid ? '#16A34A' : '#DC2626'}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Firm Overview</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Firm Name', value: partner.firm_name },
                    { label: 'Subdomain', value: `${slug}.ft9ja.com` },
                    { label: 'Tagline', value: partner.tagline || '—' },
                    {
                      label: 'Fee Markup',
                      value: markup > 0 ? `₦${markup.toLocaleString()}/eval` : 'No markup',
                    },
                    {
                      label: 'License Status',
                      value: partner.monthly_fee_paid ? '✅ Paid' : '❌ Unpaid',
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between border-b border-gray-50 py-2"
                    >
                      <span className="text-xs font-medium text-gray-400">{r.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Monthly Earnings Estimate
                </h3>
                <p className="mb-4 text-xs text-gray-500">
                  Based on your ₦{markup.toLocaleString()} markup per evaluation.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { scenario: 'Conservative', weekly: 3, monthly: 12 },
                    { scenario: 'Moderate', weekly: 8, monthly: 32 },
                    { scenario: 'Aggressive', weekly: 15, monthly: 60 },
                  ].map((sc) => (
                    <div
                      key={sc.scenario}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="text-xs font-medium text-gray-400">{sc.scenario}</div>
                      <div className="mt-1 text-xs text-gray-500">{sc.weekly}/week</div>
                      <div className="mt-1.5 text-sm font-black" style={{ color: primary }}>
                        {fmtMoney(sc.monthly * markup)}
                      </div>
                      <div className="text-xs text-gray-400">net/mo</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Payments Tab ── */}
        {tab === 'payments' && (
          <PaymentsTab
            evaluations={allEvals}
            traders={traders}
            partner={partner}
            primary={primary}
          />
        )}

        {/* ── Payouts Tab ── */}
        {tab === 'payouts' && (
          <PayoutsTab evaluations={allEvals} partner={partner} primary={primary} />
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <AnalyticsTab
            evaluations={allEvals}
            traders={traders}
            partner={partner}
            primary={primary}
          />
        )}

        {/* ── Traders Tab ── */}
        {tab === 'traders' && (
          <div className="space-y-5">
            {pendingEvals.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-yellow-100 bg-yellow-50 px-5 py-4 rounded-t-xl">
                  <Clock size={15} className="text-yellow-600" />
                  <h3 className="text-sm font-semibold text-yellow-900">
                    Pending Payment Confirmation
                  </h3>
                  <span className="ml-auto rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-bold text-yellow-900">
                    {pendingEvals.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingEvals.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-4 px-5 py-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {ev.trader_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{ev.trader_name}</div>
                        <div className="text-xs text-gray-400">
                          {ev.trader_email} · {ev.eval_type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          ₦{Number(ev.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{ev.purchase_date.slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 p-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">All Traders</h3>
                  <p className="text-xs text-gray-400">{traders.length} registered</p>
                </div>
                <button
                  onClick={() => setShowAddTrader(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: primary }}
                >
                  <Plus size={12} /> Add Trader
                </button>
              </div>

              {showAddTrader && (
                <div className="border-b border-gray-100 bg-gray-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-900">Add Trader</div>
                    <button
                      onClick={() => {
                        setShowAddTrader(false);
                        setAddError(null);
                      }}
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                      placeholder="Full Name"
                      value={newTrader.name}
                      onChange={(e) => setNewTrader((n) => ({ ...n, name: e.target.value }))}
                    />
                    <input
                      type="email"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                      placeholder="Email Address"
                      value={newTrader.email}
                      onChange={(e) => setNewTrader((n) => ({ ...n, email: e.target.value }))}
                    />
                  </div>
                  {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
                  <button
                    onClick={() => addTrader.mutate({ ...newTrader, partner_id: partner.id })}
                    disabled={!newTrader.name || !newTrader.email || addTrader.isPending}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                  >
                    {addTrader.isPending ? (
                      <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                    ) : null}{' '}
                    Add Trader
                  </button>
                </div>
              )}

              {tradersLoading ? (
                <div className="p-10 text-center text-sm text-gray-400">Loading traders...</div>
              ) : traders.length === 0 ? (
                <div className="p-10 text-center">
                  <Users size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-500">No traders yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {traders.map((t) => {
                    const traderEvals = allEvals.filter((e) => e.trader_email === t.email);
                    const kycBadgeInfo: Record<string, { label: string; cls: string }> = {
                      not_started: { label: '', cls: '' },
                      submitted: {
                        label: 'KYC: Pending',
                        cls: 'border-amber-200 bg-amber-50 text-amber-700',
                      },
                      approved: {
                        label: 'KYC ✓',
                        cls: 'border-green-200 bg-green-50 text-green-700',
                      },
                      rejected: { label: 'KYC ✗', cls: 'border-red-200 bg-red-50 text-red-600' },
                    };
                    const kycBadgeData = kycBadgeInfo[t.kyc_status || 'not_started'];
                    return (
                      <div key={t.id} className="flex items-center gap-4 px-5 py-3 flex-wrap">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shrink-0"
                          style={{ backgroundColor: primary }}
                        >
                          {t.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.email}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {traderEvals.length} eval{traderEvals.length !== 1 ? 's' : ''}
                          </span>
                          {kycBadgeData.label && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${kycBadgeData.cls}`}
                            >
                              {kycBadgeData.label}
                            </span>
                          )}
                          {t.kyc_status === 'submitted' && (
                            <>
                              <button
                                onClick={() =>
                                  reviewKyc.mutate({ traderId: t.id, action: 'approved' })
                                }
                                disabled={reviewKyc.isPending}
                                className="rounded px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() =>
                                  reviewKyc.mutate({ traderId: t.id, action: 'rejected' })
                                }
                                disabled={reviewKyc.isPending}
                                className="rounded px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          <div
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${t.status === 'active' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-500'}`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${t.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                            />
                            {t.status}
                          </div>
                        </div>
                        <Link
                          href={`/${slug}/dashboard?email=${encodeURIComponent(t.email)}`}
                          className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
                        >
                          Dashboard →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-5">
              {/* Markup */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-2 text-base font-semibold text-gray-900">Pricing & Markup</h3>
                <p className="mb-5 text-sm text-gray-500">
                  Set your extra charge on top of FT9ja base prices.
                </p>
                <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    Price Breakdown
                  </div>
                  {[
                    { label: 'Standard Evaluation (SS)', base: 149000 },
                    { label: 'Starter Evaluation (SSL)', base: 52000 },
                  ].map((p) => {
                    const total = p.base + (brandForm.fee_markup || 0);
                    return (
                      <div
                        key={p.label}
                        className="mb-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="mb-2 text-xs font-semibold text-gray-900">{p.label}</div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">FT9ja base</span>
                            <span className="font-medium text-gray-700">
                              ₦{p.base.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Your markup</span>
                            <span className="font-medium text-gray-700">
                              +₦{(brandForm.fee_markup || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-gray-100 pt-1 text-xs font-bold">
                            <span className="text-gray-900">Trader pays</span>
                            <span style={{ color: brandForm.brand_color }}>
                              ₦{total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Your Markup (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={brandForm.fee_markup}
                    onChange={(e) =>
                      setBrandForm((f) => ({ ...f, fee_markup: Number(e.target.value) }))
                    }
                    placeholder="e.g. 10000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => saveBranding.mutate()}
                  disabled={saveBranding.isPending}
                  className="mt-4 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                >
                  {saveBranding.isPending ? (
                    <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Save size={14} />
                  )}{' '}
                  Save Markup
                </button>
              </div>

              {/* Branding */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-5 text-base font-semibold text-gray-900">Firm Branding</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Firm Name', key: 'firm_name', placeholder: 'Your Firm Name' },
                    {
                      label: 'Tagline',
                      key: 'tagline',
                      placeholder: 'Trade smarter. Fund your future.',
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">
                        {f.label}
                      </label>
                      <input
                        type="text"
                        value={brandForm[f.key as keyof typeof brandForm] as string}
                        onChange={(e) => setBrandForm((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Description
                    </label>
                    <textarea
                      value={brandForm.description}
                      onChange={(e) => setBrandForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe your firm..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>

                  {/* AI Logo Generator */}
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-500" />
                      <span className="text-xs font-semibold text-gray-900">AI Logo Generator</span>
                    </div>
                    <div className="mb-3 flex gap-2">
                      {(['modern', 'bold', 'elegant'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setLogoStyle(s)}
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize ${logoStyle === s ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-500'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => generateLogos.mutate()}
                      disabled={generateLogos.isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                      {generateLogos.isPending ? (
                        <>
                          <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> Generate Logo Options
                        </>
                      )}
                    </button>
                    {logoGenError && <p className="mt-2 text-xs text-red-500">{logoGenError}</p>}
                    {generatedLogos.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Click a logo to use it:
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {generatedLogos.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setBrandForm((f) => ({ ...f, logo_url: url }))}
                              className={`overflow-hidden rounded-xl border-2 ${brandForm.logo_url === url ? 'border-purple-500' : 'border-gray-200 hover:border-purple-300'}`}
                            >
                              <img
                                src={url}
                                alt={`Logo ${i + 1}`}
                                className="h-24 w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={brandForm.logo_url}
                      onChange={(e) => setBrandForm((f) => ({ ...f, logo_url: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ColorPickerField
                      label="Primary Color"
                      color={brandForm.brand_color}
                      onChange={(c) => setBrandForm((f) => ({ ...f, brand_color: c }))}
                    />
                    <ColorPickerField
                      label="Accent Color"
                      color={brandForm.secondary_color}
                      onChange={(c) => setBrandForm((f) => ({ ...f, secondary_color: c }))}
                    />
                  </div>
                </div>
                {brandError && <p className="mt-4 text-xs text-red-500">{brandError}</p>}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={() => saveBranding.mutate()}
                    disabled={saveBranding.isPending}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: primary }}
                  >
                    {saveBranding.isPending ? (
                      <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <Save size={14} />
                    )}{' '}
                    Save Changes
                  </button>
                  {brandSaved && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <CheckCircle size={13} /> Saved!
                    </span>
                  )}
                </div>
              </div>

              {/* PIN */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound size={15} className="text-gray-500" />
                  <h3 className="text-base font-semibold text-gray-900">Admin PIN</h3>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    New PIN{' '}
                    <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={brandForm.admin_pin}
                    onChange={(e) => setBrandForm((f) => ({ ...f, admin_pin: e.target.value }))}
                    placeholder="Enter new PIN"
                    maxLength={20}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => saveBranding.mutate()}
                  disabled={!brandForm.admin_pin || saveBranding.isPending}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
                >
                  <KeyRound size={13} /> Update PIN
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-gray-500">Live Preview</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div
                    className="flex items-center gap-2 border-b border-gray-100 px-4 py-3"
                    style={{
                      backgroundColor:
                        brandForm.template === 'bold' || brandForm.template === 'dark'
                          ? '#0F1117'
                          : '#fff',
                    }}
                  >
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: brandForm.brand_color }}
                    >
                      {(brandForm.firm_name || 'F')[0]}
                    </div>
                    <span
                      className={`text-xs font-black ${brandForm.template === 'minimal' ? 'text-gray-900' : 'text-white'}`}
                    >
                      {brandForm.firm_name || 'Your Firm'}
                    </span>
                  </div>
                  <div
                    className="p-5"
                    style={{
                      background:
                        brandForm.template === 'dark'
                          ? '#080B10'
                          : brandForm.template === 'bold'
                            ? '#0F1117'
                            : `linear-gradient(135deg, ${brandForm.brand_color}12 0%, ${brandForm.secondary_color}12 100%)`,
                    }}
                  >
                    <h2
                      className={`text-sm font-black leading-snug mb-2 ${brandForm.template === 'minimal' ? 'text-gray-900' : 'text-white'}`}
                    >
                      {brandForm.tagline || 'Trade smarter. Fund your future.'}
                    </h2>
                    <div className="flex gap-2">
                      <div
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: brandForm.brand_color }}
                      >
                        Get Funded →
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: brandForm.brand_color }}
                    />
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: brandForm.secondary_color }}
                    />
                    <Link
                      href={`/${slug}`}
                      target="_blank"
                      className="ml-auto text-xs text-blue-500 hover:underline"
                    >
                      Open live →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
