'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowRight,
    Banknote,
    BarChart3,
    Bitcoin,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Copy,
    CreditCard,
    Eye,
    EyeOff,
    FileText,
    KeyRound,
    Loader2,
    Lock,
    LogOut,
    Send,
    Shield,
    Upload,
    User,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { DAILY_DRAWDOWN_RULE } from '@/lib/ft9ja-support-content';
import { getFt9jaPaymentRows, type Ft9jaPaymentMethod } from '@/lib/ft9ja-payments';
import useUpload from '@/utils/useUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

type Partner = {
  firm_name: string;
  brand_color: string;
  slug: string;
  logo_url?: string | null;
  logo_display_url?: string | null;
  fee_markup?: number | string | null;
};
type Trader = { id: number; name: string; email: string; status: string; kyc_status: string };
type EvalProduct = {
  id: string;
  name: string;
  code: 'SS' | 'SSL';
  price: string;
  priceNum: number;
  accountSize: string;
  profitTarget: string;
  maxDrawdown: string;
};
type Evaluation = {
  id: number;
  eval_type: string;
  amount: number;
  payment_method: Ft9jaPaymentMethod | null;
  payment_proof_url: string | null;
  status: string;
  payout_status: string | null;
  profit_target: number;
  current_profit: number;
  max_drawdown: number;
  current_drawdown: number;
  daily_drawdown: number;
  max_daily_drawdown: number;
  latest_balance: number | null;
  latest_equity: number | null;
  trading_days: number;
  required_days: number;
  purchase_date: string;
  account_creation_code: string | null;
  trade_account_id: number | null;
  trade_account_number: number | null;
  trade_account_platform: string | null;
  trade_account_broker: string | null;
  trade_account_has_aso: number | null;
  trade_account_aso_account_id: number | null;
  trade_account_aso_account_number: number | null;
  trade_account_completed: boolean | null;
  telemetry: {
    has_telemetry: boolean;
    latest_balance: number | null;
    latest_equity: number | null;
    current_profit: number;
    profit_target: number;
    trading_days: number;
    required_days: number;
    daily_drawdown: number;
    max_daily_drawdown: number;
    account_drawdown: number;
    max_account_drawdown: number;
    profit_target_passed: boolean;
    min_trading_days_passed: boolean;
    daily_drawdown_breached: boolean;
    account_drawdown_breached: boolean;
  } | null;
};
type TraderRequest = {
  id: number;
  eval_id: number;
  eval_type: string;
  amount: string;
  eval_status: string;
  request_type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
};
type AsoRequest = {
  id: number;
  trader_id: number;
  partner_id: number;
  ss_account_id: number;
  ss_account_number: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  eligibility_profit: string | null;
  eligibility_profit_target: string | null;
  approval_token_expires_at: string | null;
  approval_token_used_at: string | null;
  aso_account_id: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
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
  const part = dateStr.split('T')[0] ?? '';
  const [year, month, day] = part.split('-');
  return `${parseInt(day ?? '1')} ${months[parseInt(month ?? '1') - 1] ?? ''} ${year ?? ''}`;
}

const REQUEST_META: Record<string, { label: string; desc: string; icon: string }> = {
  talent_bonus: {
    label: 'Talent Bonus',
    desc: 'Request a talent bonus reward for passing your evaluation.',
    icon: '🏆',
  },
  aso_payout_ssl: {
    label: 'Aso Payout (SSL)',
    desc: 'Request your Aso payout for completing an SSL evaluation.',
    icon: '💰',
  },
  aso_account: {
    label: 'Aso Account',
    desc: 'Request an Aso funded account for completing a Standard evaluation.',
    icon: '🏦',
  },
};

const BASE_EVAL_PRODUCTS: EvalProduct[] = [
  {
    id: 'ss',
    name: 'Standard Evaluation',
    code: 'SS',
    price: '₦145,000',
    priceNum: 145000,
    accountSize: '$10,000',
    profitTarget: '25%',
    maxDrawdown: '10%',
  },
  {
    id: 'ssl',
    name: 'Starter Evaluation',
    code: 'SSL',
    price: '₦49,000',
    priceNum: 49000,
    accountSize: '$10,000',
    profitTarget: 'None',
    maxDrawdown: '10%',
  },
];
const DEFAULT_EVAL_PRODUCT = BASE_EVAL_PRODUCTS[0] as EvalProduct;

function getProducts(feeMarkup: number | string | null | undefined): EvalProduct[] {
  const markup = Number(feeMarkup || 0);
  if (!markup) return BASE_EVAL_PRODUCTS;
  return BASE_EVAL_PRODUCTS.map((p) => {
    const total = p.priceNum + markup;
    return { ...p, priceNum: total, price: `₦${total.toLocaleString()}` };
  });
}

function getAvailableRequests(evalType: string): string[] {
  if (evalType === 'SSL') return ['talent_bonus', 'aso_payout_ssl'];
  return ['talent_bonus'];
}

function getEvalTypeLabel(evalType: string): string {
  if (evalType === 'SSL') return 'Synthetic Signals Lite (SSL)';
  return 'Synthetic Signals (SS)';
}

function hasProfitTarget(evalType: string) {
  return evalType !== 'SSL';
}

function formatEvaluationCode(id: number) {
  return `EVL-${id.toString().padStart(6, '0')}`;
}

function getDefaultEvaluationId(
  evaluations: Evaluation[],
  preferredId?: number | null
) {
  if (preferredId && evaluations.some((e) => e.id === preferredId)) return preferredId;
  return (
    evaluations.find((e) => e.status === 'active' && e.trade_account_completed)?.id ??
    evaluations.find((e) => e.status === 'active')?.id ??
    evaluations[0]?.id ??
    null
  );
}

function EvaluationAccountSwitcher({
  evaluations,
  selectedId,
  onSelect,
  primary,
}: {
  evaluations: Evaluation[];
  selectedId: number;
  onSelect: (id: number) => void;
  primary: string;
}) {
  if (evaluations.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {evaluations.length > 1 ? 'Select account' : 'Active account'}
        </h2>
        <p className="text-xs text-gray-400">
          Metrics and actions apply only to the selected account
        </p>
      </div>
      <div
        className={`grid gap-3 ${evaluations.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
        role="listbox"
        aria-label="Trading accounts"
      >
        {evaluations.map((evaluation) => {
          const isSelected = evaluation.id === selectedId;
          const status = getEffectiveEvalStatus(evaluation);
          const hasLiveMetrics = Boolean(
            evaluation.trade_account_number && evaluation.telemetry?.has_telemetry
          );

          return (
            <button
              key={evaluation.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(evaluation.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-2 bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={isSelected ? { borderColor: primary } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {getEvalTypeLabel(evaluation.eval_type)}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {formatEvaluationCode(evaluation.id)}
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {evaluation.trade_account_number ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                    MT5 {evaluation.trade_account_number}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                    Account not linked
                  </span>
                )}
                {hasLiveMetrics ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
                    +{evaluation.current_profit}% profit
                  </span>
                ) : evaluation.trade_account_completed ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                    Awaiting trade data
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function hasPassedByRules(eval_: Evaluation) {
  if (eval_.status === 'passed') return true;
  if (!hasProfitTarget(eval_.eval_type)) {
    return Boolean(
      eval_.telemetry?.min_trading_days_passed &&
        !eval_.telemetry?.daily_drawdown_breached &&
        !eval_.telemetry?.account_drawdown_breached
    );
  }
  return Boolean(
    eval_.telemetry?.profit_target_passed &&
      eval_.telemetry.min_trading_days_passed &&
      !eval_.telemetry.daily_drawdown_breached &&
      !eval_.telemetry.account_drawdown_breached
  );
}

function hasFailedByRules(eval_: Evaluation) {
  if (eval_.status === 'failed') return true;
  return Boolean(
    eval_.telemetry?.daily_drawdown_breached || eval_.telemetry?.account_drawdown_breached
  );
}

function getEffectiveEvalStatus(eval_: Evaluation) {
  if (hasFailedByRules(eval_)) return 'failed';
  if (hasPassedByRules(eval_)) return 'passed';
  return eval_.status;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    active: {
      label: 'Active',
      cls: 'border-green-200 bg-green-50 text-green-700',
      dot: 'bg-green-500',
    },
    pending_payment: {
      label: 'Pending Payment',
      cls: 'border-amber-200 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },
    passed: {
      label: 'Passed ✓',
      cls: 'border-blue-200 bg-blue-50 text-blue-700',
      dot: 'bg-blue-500',
    },
    failed: { label: 'Failed', cls: 'border-red-200 bg-red-50 text-red-600', dot: 'bg-red-500' },
  };
  const s = map[status] || {
    label: status,
    cls: 'border-gray-200 bg-gray-50 text-gray-600',
    dot: 'bg-gray-400',
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${s.cls}`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
    </div>
  );
}

function PayoutBadge({ status }: { status: string | null }) {
  if (!status)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
        <Clock size={10} /> Not Started
      </span>
    );
  if (status === 'processing')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
        <Clock size={10} /> Processing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
      <CheckCircle size={10} /> Paid Out
    </span>
  );
}

function DashboardPurchaseModal({
  products,
  trader,
  slug,
  primary,
  onClose,
  onSuccess,
}: {
  products: EvalProduct[];
  trader: Trader;
  slug: string;
  primary: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [product, setProduct] = useState<EvalProduct>(products[0] ?? DEFAULT_EVAL_PRODUCT);
  const [paymentMethod, setPaymentMethod] = useState<Ft9jaPaymentMethod>('transfer');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload, { loading: uploading }] = useUpload();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) throw new Error('Upload payment evidence before submitting.');
      setError(null);
      const uploaded = await upload({ file: proofFile });
      if (uploaded.error || !uploaded.url) {
        throw new Error(uploaded.error || 'Upload failed');
      }

      const res = await fetch(`/api/partners/${slug}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_type: product.code,
          amount: product.priceNum,
          payment_method: paymentMethod,
          payment_proof_url: uploaded.url,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create evaluation');
      }
      return res.json();
    },
    onSuccess,
    onError: (e: Error) => setError(e.message),
  });

  const copyPaymentValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              New Evaluation
            </p>
            <h3 className="text-base font-black text-gray-900">Buy Evaluation</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Trader
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">{trader.name}</div>
                <div className="text-xs text-gray-500">{trader.email}</div>
              </div>
              <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                Logged in
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProduct(p)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  product.id === p.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-widest opacity-70">
                  {p.code}
                </div>
                <div className="mt-1 text-sm font-black">{p.name}</div>
                <div className="mt-2 text-lg font-black">{p.price}</div>
                <div className="mt-1 text-xs opacity-70">
                  {p.accountSize} ·{' '}
                  {hasProfitTarget(p.code) ? `Target ${p.profitTarget} · ` : 'Talent bonus · '}
                  DD {p.maxDrawdown}
                </div>
              </button>
            ))}
          </div>

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">Payment Instructions</p>
            <p className="mt-1 text-xs text-amber-700">
              Pay <strong>{product.price}</strong>, then upload your receipt or transaction
              screenshot for FT9ja verification.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { id: 'transfer' as const, label: 'Transfer', icon: <Banknote size={14} /> },
              { id: 'paypal' as const, label: 'PayPal', icon: <CreditCard size={14} /> },
              { id: 'crypto' as const, label: 'Crypto', icon: <Bitcoin size={14} /> },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  paymentMethod === method.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>

          <div className="mb-5 space-y-3">
            {getFt9jaPaymentRows(paymentMethod, product.price, trader.email).map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-gray-50 py-2"
              >
                <span className="text-xs text-gray-400">{r.label}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{r.value}</span>
                  {r.copy && (
                    <button
                      onClick={() => copyPaymentValue(r.value)}
                      className="shrink-0 text-gray-400 hover:text-gray-700"
                    >
                      {copied ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-xs text-gray-500 hover:border-gray-400">
            <span className="flex min-w-0 items-center gap-2">
              <FileText size={14} className="shrink-0 text-gray-400" />
              <span className="truncate">
                {proofFile ? proofFile.name : 'Receipt, screenshot, or transaction proof'}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-gray-900">Choose file</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                setProofFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </label>

          {(error || mutation.error) && (
            <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error || (mutation.error as Error).message}
            </p>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={!proofFile || mutation.isPending || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {mutation.isPending || uploading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Submitting Payment...
              </>
            ) : (
              <>Submit Payment Evidence</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  if (status === 'pending')
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        ⏳ Pending
      </span>
    );
  if (status === 'approved')
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        ✅ Approved
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
      ❌ Rejected
    </span>
  );
}

function CircleRing({
  value,
  max,
  color,
  label,
  sub,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  sub: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#F3F4F6" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-black text-gray-900">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ evaluations, primary }: { evaluations: Evaluation[]; primary: string }) {
  const pending = evaluations.filter((e) => e.status === 'pending_payment');
  const awaitingPayment = pending.filter((e) => !e.payment_proof_url);
  const awaitingConfirmation = pending.filter((e) => e.payment_proof_url);
  const confirmed = evaluations.filter((e) => e.status !== 'pending_payment');

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          {
            label: 'Total Evaluations',
            value: evaluations.length,
            icon: <FileText size={15} />,
            color: '#6B7280',
          },
          {
            label: 'Payment Pending',
            value: pending.length,
            icon: <Clock size={15} />,
            color: '#F59E0B',
          },
          {
            label: 'Payment Confirmed',
            value: confirmed.length,
            icon: <CheckCircle size={15} />,
            color: '#16A34A',
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Pending Confirmation */}
      {awaitingConfirmation.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3">
            <Clock size={14} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Awaiting Confirmation</span>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-black text-white">
              {awaitingConfirmation.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {awaitingConfirmation.map((e) => (
              <div key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">
                        {getEvalTypeLabel(e.eval_type)} Evaluation
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Awaiting
                        Confirmation
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Purchased {formatDate(e.purchase_date)} · ID: EVL-
                      {e.id.toString().padStart(6, '0')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">
                      ₦{parseFloat(String(e.amount)).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Submitted</div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-800">
                    Payment Awaiting Confirmation
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Your receipt has been submitted. FT9ja is verifying the payment evidence and
                    will activate the evaluation after confirmation.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payments */}
      {awaitingPayment.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <Clock size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">Awaiting Payment</span>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
              {awaitingPayment.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {awaitingPayment.map((e) => (
              <div key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">
                        {getEvalTypeLabel(e.eval_type)} Evaluation
                      </span>
                      <StatusBadge status={getEffectiveEvalStatus(e)} />
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Purchased {formatDate(e.purchase_date)} · ID: EVL-
                      {e.id.toString().padStart(6, '0')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">
                      ₦{parseFloat(String(e.amount)).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Amount Due</div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Payment Instructions</p>
                  <p className="text-xs text-amber-700">
                    Pay FT9ja using the details below. FT9ja will verify the evidence and activate
                    the evaluation.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {getFt9jaPaymentRows(
                      e.payment_method ?? 'transfer',
                      `₦${parseFloat(String(e.amount)).toLocaleString()}`,
                      'Your email address'
                    ).map((row) => (
                      <div key={row.label} className="flex justify-between gap-3">
                        <span className="text-amber-700">{row.label}:</span>
                        <span className="text-right font-semibold text-amber-900">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="pt-1 text-xs text-amber-600">
                    Your evaluation activates after FT9ja confirms the payment.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Payments */}
      {confirmed.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Payment History</h3>
            <p className="text-xs text-gray-400">Confirmed evaluation purchases</p>
          </div>
          <div className="divide-y divide-gray-100">
            {confirmed.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                  style={{ backgroundColor: primary }}
                >
                  {e.eval_type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {getEvalTypeLabel(e.eval_type)} Evaluation
                    </span>
                    <StatusBadge status={getEffectiveEvalStatus(e)} />
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {formatDate(e.purchase_date)} · EVL-{e.id.toString().padStart(6, '0')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                    <CheckCircle size={13} /> Paid
                  </div>
                  <div className="text-xs text-gray-400">
                    ₦{parseFloat(String(e.amount)).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluations.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <CreditCard size={28} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">No evaluations yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Trading Account Tab ─────────────────────────────────────────────────────

function TradingAccountTab({
  evaluations,
  slug,
  primary,
  selectedEvalId: controlledEvalId,
  onSelectEvalId,
}: {
  evaluations: Evaluation[];
  slug: string;
  primary: string;
  selectedEvalId?: number | null;
  onSelectEvalId?: (id: number) => void;
}) {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const eligible = evaluations.filter((e) => e.status === 'active' && e.account_creation_code);
  const [localEvalId, setLocalEvalId] = useState<number | null>(eligible[0]?.id ?? null);
  const selectedEvalId = controlledEvalId ?? localEvalId;
  const setSelectedEvalId = onSelectEvalId ?? setLocalEvalId;
  const ssAccounts = evaluations.filter(
    (e) => e.eval_type === 'SS' && e.trade_account_completed && e.trade_account_id
  );
  const initialSsAccountId = Number(searchParams.get('ss_account_id')) || ssAccounts[0]?.trade_account_id || null;
  const [selectedSsAccountId, setSelectedSsAccountId] = useState<number | null>(initialSsAccountId);
  const [form, setForm] = useState({
    activation_code: '',
    number: '',
    password: '',
    investor_password: '',
  });
  const [asoForm, setAsoForm] = useState({
    token: searchParams.get('aso_token') || '',
    number: '',
    password: '',
    investor_password: '',
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    investor_password: false,
    aso_password: false,
    aso_investor_password: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [asoError, setAsoError] = useState<string | null>(null);

  useEffect(() => {
    setForm({ activation_code: '', number: '', password: '', investor_password: '' });
    setError(null);
  }, [selectedEvalId]);

  useEffect(() => {
    if (!controlledEvalId) return;
    const matchingSs = evaluations.find(
      (e) =>
        e.id === controlledEvalId &&
        e.eval_type === 'SS' &&
        e.trade_account_completed &&
        e.trade_account_id
    );
    if (matchingSs?.trade_account_id) {
      setSelectedSsAccountId(matchingSs.trade_account_id);
    }
  }, [controlledEvalId, evaluations]);

  const selected = eligible.find((e) => e.id === selectedEvalId) ?? eligible[0];
  const selectedSsAccount =
    ssAccounts.find((e) => e.trade_account_id === selectedSsAccountId) ?? ssAccounts[0];

  const { data: asoData } = useQuery<{ requests: AsoRequest[] }>({
    queryKey: ['aso-requests', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/aso-requests`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
  const asoRequests = asoData?.requests ?? [];
  const selectedAsoRequest = selectedSsAccount?.trade_account_id
    ? asoRequests.find((r) => r.ss_account_id === selectedSsAccount.trade_account_id)
    : null;

  const submit = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select an active evaluation');
      const res = await fetch(`/api/partners/${slug}/trade-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: selected.id,
          activation_code: form.activation_code,
          number: form.number,
          password: form.password,
          investor_password: form.investor_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account');
      return data;
    },
    onSuccess: () => {
      setError(null);
      setForm({ activation_code: '', number: '', password: '', investor_password: '' });
      qc.invalidateQueries({ queryKey: ['evaluations', slug] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const requestAso = useMutation({
    mutationFn: async () => {
      if (!selectedSsAccount?.trade_account_id) throw new Error('Select a Synthetic Signals account');
      const res = await fetch(`/api/partners/${slug}/aso-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ss_account_id: selectedSsAccount.trade_account_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request ASO');
      return data;
    },
    onSuccess: () => {
      setAsoError(null);
      qc.invalidateQueries({ queryKey: ['aso-requests', slug] });
    },
    onError: (e: Error) => setAsoError(e.message),
  });

  const addAso = useMutation({
    mutationFn: async () => {
      if (!selectedSsAccount?.trade_account_id) throw new Error('Select a Synthetic Signals account');
      const res = await fetch(`/api/partners/${slug}/aso-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ss_account_id: selectedSsAccount.trade_account_id,
          token: asoForm.token,
          number: asoForm.number,
          password: asoForm.password,
          investor_password: asoForm.investor_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add ASO account');
      return data;
    },
    onSuccess: () => {
      setAsoError(null);
      setAsoForm({ token: '', number: '', password: '', investor_password: '' });
      qc.invalidateQueries({ queryKey: ['evaluations', slug] });
      qc.invalidateQueries({ queryKey: ['aso-requests', slug] });
    },
    onError: (e: Error) => setAsoError(e.message),
  });

  if (eligible.length === 0 && ssAccounts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <KeyRound size={28} className="mx-auto mb-3 text-gray-200" />
        <p className="text-sm font-semibold text-gray-900">No activation code yet</p>
        <p className="mt-1 text-xs text-gray-400">
          This form unlocks after FT9ja verifies your payment and issues your account activation
          code.
        </p>
      </div>
    );
  }

  const ssProfitDone = selectedSsAccount
    ? selectedSsAccount.current_profit >= selectedSsAccount.profit_target
    : false;
  const ssBlown = selectedSsAccount
    ? selectedSsAccount.daily_drawdown >= selectedSsAccount.max_daily_drawdown ||
      selectedSsAccount.current_drawdown >= selectedSsAccount.max_drawdown ||
      getEffectiveEvalStatus(selectedSsAccount) === 'failed'
    : false;
  const ssHasAso = Boolean(
    selectedSsAccount?.trade_account_has_aso ||
      selectedSsAccount?.trade_account_aso_account_id ||
      selectedAsoRequest?.status === 'completed'
  );
  const canRequestAso =
    Boolean(selectedSsAccount?.trade_account_id) &&
    ssProfitDone &&
    !ssBlown &&
    !ssHasAso &&
    !selectedAsoRequest;
  const canAddAso = selectedAsoRequest?.status === 'approved' && !ssHasAso;

  return (
    <div className="space-y-5">
      {eligible.length > 0 && (
        <>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
            <p className="text-sm font-semibold text-blue-800">Add your MT5 trading account</p>
            <p className="mt-1 text-xs text-blue-700">
              Use the activation code sent to your email. The code is tied to your account and cannot be
              used by another trader.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {!onSelectEvalId && (
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Evaluation</label>
                <select
                  value={selected?.id ?? ''}
                  onChange={(e) => setSelectedEvalId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none"
                >
                  {eligible.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatEvaluationCode(e.id)} · {getEvalTypeLabel(e.eval_type)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selected?.trade_account_completed ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
                  <CheckCircle size={15} /> Trading account added
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <span className="block text-green-700/70">Account Number</span>
                    <strong className="text-green-900">{selected.trade_account_number}</strong>
                  </div>
                  <div>
                    <span className="block text-green-700/70">Platform</span>
                    <strong className="text-green-900">{selected.trade_account_platform || 'MT5'}</strong>
                  </div>
                  <div>
                    <span className="block text-green-700/70">Broker</span>
                    <strong className="text-green-900">{selected.trade_account_broker || 'Deriv-Demo'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Activation Code', key: 'activation_code', placeholder: '8-character code' },
                    { label: 'MT5 Account Number', key: 'number', placeholder: 'e.g. 12345678' },
                    { label: 'Password', key: 'password', placeholder: 'Trading password' },
                    {
                      label: 'Investor Password',
                      key: 'investor_password',
                      placeholder: 'Read-only investor password',
                    },
                  ].map((field) => {
                    const isPasswordField = field.key === 'password' || field.key === 'investor_password';
                    const inputType =
                      isPasswordField && !visiblePasswords[field.key as keyof typeof visiblePasswords]
                        ? 'password'
                        : 'text';

                    return (
                      <div key={field.key}>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          {field.label}
                        </label>
                        <input
                          type={inputType}
                          value={form[field.key as keyof typeof form]}
                          onChange={(e) =>
                            setForm((v) => ({
                              ...v,
                              [field.key]:
                                field.key === 'activation_code'
                                  ? e.target.value.toUpperCase()
                                  : e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                >
                  {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Save Trading Account
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {ssAccounts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">ASO upgrade</p>
              <p className="mt-1 text-xs text-gray-500">
                Eligible Synthetic Signals accounts can request admin approval, then add the approved ASO account here.
              </p>
            </div>
            {selectedAsoRequest && <RequestStatusBadge status={selectedAsoRequest.status} />}
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Synthetic Signals account
            </label>
            <select
              value={selectedSsAccount?.trade_account_id ?? ''}
              onChange={(e) => setSelectedSsAccountId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none"
            >
              {ssAccounts.map((e) => (
                <option key={e.trade_account_id} value={e.trade_account_id ?? ''}>
                  {e.trade_account_number} · Profit {e.current_profit}% / {e.profit_target}%
                </option>
              ))}
            </select>
          </div>

          {selectedSsAccount?.trade_account_aso_account_number ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              ASO account {selectedSsAccount.trade_account_aso_account_number} is attached.
            </div>
          ) : canAddAso ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
                Your ASO request is approved. Use the token from your approval email to add the ASO account.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: 'ASO Approval Token', key: 'token', placeholder: 'Token from email' },
                  { label: 'ASO Account Number', key: 'number', placeholder: 'New account number' },
                  { label: 'Password', key: 'password', placeholder: 'Trading password' },
                  {
                    label: 'Investor Password',
                    key: 'investor_password',
                    placeholder: 'Read-only investor password',
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      {field.label}
                    </label>
                    <input
                      type={field.key.includes('password') ? 'password' : 'text'}
                      value={asoForm[field.key as keyof typeof asoForm]}
                      onChange={(e) =>
                        setAsoForm((v) => ({ ...v, [field.key]: e.target.value.trim() }))
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              {asoError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {asoError}
                </div>
              )}
              <button
                onClick={() => addAso.mutate()}
                disabled={addAso.isPending}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primary }}
              >
                {addAso.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                Add ASO Account
              </button>
            </div>
          ) : selectedAsoRequest?.status === 'pending' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Your ASO request is awaiting admin review.
            </div>
          ) : selectedAsoRequest?.status === 'rejected' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                ASO request rejected{selectedAsoRequest.rejection_reason ? `: ${selectedAsoRequest.rejection_reason}` : '.'}
              </div>
              {ssProfitDone && !ssBlown && (
                <button
                  onClick={() => requestAso.mutate()}
                  disabled={requestAso.isPending}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                >
                  {requestAso.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Request Again
                </button>
              )}
            </div>
          ) : canRequestAso ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">You qualify for ASO</p>
              <p className="mt-1 text-xs text-green-700">
                This SS account has met the profit target and has not breached drawdown limits.
              </p>
              {asoError && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {asoError}
                </div>
              )}
              <button
                onClick={() => requestAso.mutate()}
                disabled={requestAso.isPending}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primary }}
              >
                {requestAso.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Request ASO Access
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              ASO unlocks when this SS account meets the profit target without breaching drawdown limits.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Payouts Tab ──────────────────────────────────────────────────────────────

function PayoutsTab({
  evaluations,
  trader,
  slug,
  primary,
}: {
  evaluations: Evaluation[];
  trader: Trader;
  slug: string;
  primary: string;
}) {
  const qc = useQueryClient();
  const [expandedEval, setExpandedEval] = useState<number | null>(null);
  const [requestingType, setRequestingType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: requests = [], isLoading: requestsLoading } = useQuery<TraderRequest[]>({
    queryKey: ['trader-requests', slug, trader.id],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}/requests`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const submitRequest = useMutation({
    mutationFn: async ({ eval_id, request_type }: { eval_id: number; request_type: string }) => {
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eval_id, request_type, notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trader-requests', slug, trader.id] });
      setRequestingType(null);
      setNotes('');
      setSubmitError(null);
    },
    onError: (e: Error) => setSubmitError(e.message),
  });

  const passedEvals = evaluations.filter(hasPassedByRules);
  const isLocked = passedEvals.length === 0;
  const inProgressEvals = evaluations.filter(
    (e) => e.status !== 'pending_payment' && e.status !== 'failed'
  );
  const displayEvals = isLocked ? inProgressEvals : passedEvals;
  const showPlaceholder = isLocked && displayEvals.length === 0;
  const previewEvalType = displayEvals[0]?.eval_type ?? 'SSL';

  const getRequestForEvalType = (evalId: number, reqType: string) =>
    requests.find((r) => r.eval_id === evalId && r.request_type === reqType);

  return (
    <div className="space-y-5">
      {/* Payout status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Passed Evals', value: passedEvals.length, color: '#2563EB' },
          {
            label: 'Processing',
            value: passedEvals.filter((e) => e.payout_status === 'processing').length,
            color: '#F59E0B',
          },
          {
            label: 'Paid Out',
            value: passedEvals.filter((e) => e.payout_status === 'paid').length,
            color: '#16A34A',
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-400">{c.label}</div>
            <div className="mt-1.5 text-2xl font-black" style={{ color: c.color }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {isLocked && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex items-start gap-3">
          <Lock size={16} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Payout requests are locked</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Pass an evaluation to unlock the buttons below. The preview shows where you&apos;ll
              click once you&apos;re eligible.
            </p>
          </div>
        </div>
      )}

      {/* Evaluations with payout requests */}
      <div className="space-y-4">
        {showPlaceholder ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden opacity-80">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-300 text-sm font-black text-white">
                {previewEvalType}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-500">
                    {getEvalTypeLabel(previewEvalType)} Evaluation
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    <Lock size={10} /> Locked
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-400">
                  Available after you purchase and pass an evaluation
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-5 py-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Available Requests
              </p>
              {getAvailableRequests(previewEvalType).map((reqType) => {
                const meta = REQUEST_META[reqType];
                return (
                  <div
                    key={reqType}
                    className="rounded-xl border border-gray-200 bg-white/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 opacity-70">
                        <span className="text-xl grayscale">{meta?.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-500">{meta?.label}</div>
                          <div className="text-xs text-gray-400">{meta?.desc}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500"
                      >
                        <Lock size={11} /> Make Request
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          displayEvals.map((e) => {
            const isEligible = hasPassedByRules(e);
            const isExpanded = expandedEval === e.id || (isLocked && displayEvals[0]?.id === e.id);
            const availableTypes = getAvailableRequests(e.eval_type);

            return (
              <div
                key={e.id}
                className={`rounded-xl border overflow-hidden ${
                  isEligible
                    ? 'border-gray-200 bg-white'
                    : 'border-dashed border-gray-300 bg-gray-50 opacity-80'
                }`}
              >
                {/* Eval header */}
                <div
                  className={`flex items-center gap-4 px-5 py-4 ${
                    isEligible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                  }`}
                  onClick={() => {
                    if (!isEligible) return;
                    setExpandedEval(isExpanded ? null : e.id);
                  }}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${
                      isEligible ? '' : 'bg-gray-300'
                    }`}
                    style={isEligible ? { backgroundColor: primary } : undefined}
                  >
                    {e.eval_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold ${isEligible ? 'text-gray-900' : 'text-gray-500'}`}
                      >
                        {getEvalTypeLabel(e.eval_type)} Evaluation
                      </span>
                      <StatusBadge status={getEffectiveEvalStatus(e)} />
                      {isEligible ? (
                        <PayoutBadge status={e.payout_status ?? null} />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                          <Lock size={10} /> Locked
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      EVL-{e.id.toString().padStart(6, '0')} · Profit: +{e.current_profit}% ·{' '}
                      {e.trading_days} days
                    </div>
                  </div>
                  {isEligible && (
                    <div className="shrink-0 text-gray-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>

                {/* Expanded: requests */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Available Requests
                    </p>

                    {availableTypes.map((reqType) => {
                      const meta = REQUEST_META[reqType];
                      const existingReq = getRequestForEvalType(e.id, reqType);
                      const isThisRequesting = requestingType === `${e.id}-${reqType}`;

                      return (
                        <div
                          key={reqType}
                          className={`rounded-xl border p-4 ${
                            isEligible
                              ? 'border-gray-100 bg-gray-50'
                              : 'border-gray-200 bg-white/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className={`flex items-start gap-3 ${isEligible ? '' : 'opacity-70'}`}>
                              <span className={`text-xl ${isEligible ? '' : 'grayscale'}`}>
                                {meta?.icon}
                              </span>
                              <div>
                                <div
                                  className={`text-sm font-semibold ${isEligible ? 'text-gray-900' : 'text-gray-500'}`}
                                >
                                  {meta?.label}
                                </div>
                                <div className="text-xs text-gray-500">{meta?.desc}</div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {existingReq ? (
                                <RequestStatusBadge status={existingReq.status} />
                              ) : !isEligible ? (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500"
                                >
                                  <Lock size={11} /> Make Request
                                </button>
                              ) : (
                                !isThisRequesting && (
                                  <button
                                    onClick={() => {
                                      setRequestingType(`${e.id}-${reqType}`);
                                      setNotes('');
                                      setSubmitError(null);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                                    style={{ backgroundColor: primary }}
                                  >
                                    <Send size={11} /> Make Request
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Admin notes if rejected */}
                          {existingReq?.status === 'rejected' && existingReq.admin_notes && (
                            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                              <strong>Note from admin:</strong> {existingReq.admin_notes}
                            </div>
                          )}

                          {/* Inline request form */}
                          {isEligible && isThisRequesting && !existingReq && (
                            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                  Additional notes <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={notes}
                                  onChange={(ev) => setNotes(ev.target.value)}
                                  placeholder="Any additional information for your request..."
                                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                                />
                              </div>
                              {submitError && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                                  <AlertCircle size={12} className="mt-0.5 shrink-0" />{' '}
                                  {submitError}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setRequestingType(null);
                                    setNotes('');
                                    setSubmitError(null);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100"
                                >
                                  <X size={12} /> Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    submitRequest.mutate({ eval_id: e.id, request_type: reqType })
                                  }
                                  disabled={submitRequest.isPending}
                                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                  style={{ backgroundColor: primary }}
                                >
                                  {submitRequest.isPending ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Send size={11} />
                                  )}
                                  Submit Request
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* All requests history */}
      {requests.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Request History</h3>
            <p className="text-xs text-gray-400">
              {requests.length} request{requests.length !== 1 ? 's' : ''} submitted
            </p>
          </div>
          {requestsLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((r) => {
                const meta = REQUEST_META[r.request_type];
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-xl shrink-0">{meta?.icon ?? '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {meta?.label ?? r.request_type}
                        </span>
                        <RequestStatusBadge status={r.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">
                        EVL-{r.eval_id.toString().padStart(6, '0')} · {r.eval_type} ·{' '}
                        {formatDate(r.created_at)}
                      </div>
                      {r.admin_notes && (
                        <div className="mt-1 text-xs text-gray-500 italic">
                          Admin: {r.admin_notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ trader, slug, primary }: { trader: Trader; slug: string; primary: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(trader.name);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', slug] });
      setProfileSaved(true);
      setProfileError(null);
      setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (e: Error) => setProfileError(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPw !== confirmPw) throw new Error('Passwords do not match');
      if (newPw.length < 8) throw new Error('Password must be at least 8 characters');
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSaved(true);
      setPwError(null);
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: (e: Error) => setPwError(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-5 text-base font-semibold text-gray-900">Personal Details</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Email Address</label>
            <input
              type="email"
              value={trader.email}
              disabled
              className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed. Contact support.</p>
          </div>
          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={() => profileMutation.mutate()}
              disabled={!name.trim() || profileMutation.isPending}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {profileMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save Name
            </button>
            {profileSaved && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle size={13} /> Saved!
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-5 text-base font-semibold text-gray-900">Change Password</h3>
        <div className="space-y-4">
          {[
            { label: 'Current Password', val: currentPw, set: setCurrentPw },
            { label: 'New Password', val: newPw, set: setNewPw },
            { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={val}
                  onChange={(e) => {
                    set(e.target.value);
                    setPwError(null);
                  }}
                  placeholder={label === 'New Password' ? 'At least 8 characters' : ''}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
                {label === 'Current Password' && (
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {pwError}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => passwordMutation.mutate()}
              disabled={!currentPw || !newPw || !confirmPw || passwordMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {passwordMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Update Password
            </button>
            {pwSaved && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle size={13} /> Updated!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KYC Tab ──────────────────────────────────────────────────────────────────

function KYCTab({ trader, slug, primary }: { trader: Trader; slug: string; primary: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: '',
    id_type: '',
    id_number: '',
    id_url: '',
    address: '',
    selfie_url: '',
  });
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycDone, setKycDone] = useState(false);

  const kycQuery = useQuery({
    queryKey: ['kyc', slug, trader.id],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}/kyc`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  useEffect(() => {
    if (kycQuery.data) {
      const d = kycQuery.data;
      if (d.kyc_status === 'submitted' || d.kyc_status === 'approved') {
        setForm({
          full_name: d.kyc_full_name || '',
          id_type: d.kyc_id_type || '',
          id_number: d.kyc_id_number || '',
          id_url: d.kyc_id_url || '',
          address: d.kyc_address || '',
          selfie_url: d.kyc_selfie_url || '',
        });
      }
    }
  }, [kycQuery.data]);

  const kycMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/partners/${slug}/traders/${trader.id}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc', slug, trader.id] });
      qc.invalidateQueries({ queryKey: ['session', slug] });
      setKycDone(true);
      setKycError(null);
    },
    onError: (e: Error) => setKycError(e.message),
  });

  const kycStatus = kycQuery.data?.kyc_status || trader.kyc_status;
  const kycStatusBadge: Record<string, { label: string; cls: string }> = {
    not_started: { label: 'Not Started', cls: 'border-gray-200 bg-gray-50 text-gray-500' },
    submitted: { label: '⏳ Under Review', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
    approved: { label: '✅ Approved', cls: 'border-green-200 bg-green-50 text-green-700' },
    rejected: { label: '❌ Rejected', cls: 'border-red-200 bg-red-50 text-red-600' },
  };
  const badge = kycStatusBadge[kycStatus] || kycStatusBadge.not_started;
  const isReadOnly = kycStatus === 'submitted' || kycStatus === 'approved';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">KYC Verification</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Required to receive funded account payouts
            </p>
          </div>
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badge.cls}`}
          >
            {badge.label}
          </div>
        </div>

        {kycDone || kycStatus === 'submitted' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-center">
            <CheckCircle size={28} className="mx-auto mb-3 text-[#16A34A]" />
            <p className="text-sm font-semibold text-green-800">KYC submitted!</p>
            <p className="mt-1 text-xs text-green-600">
              Your documents are under review. We'll notify you once approved.
            </p>
          </div>
        ) : kycStatus === 'approved' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-center">
            <CheckCircle size={28} className="mx-auto mb-3 text-[#16A34A]" />
            <p className="text-sm font-semibold text-green-800">KYC Approved</p>
            <p className="mt-1 text-xs text-green-600">
              Your identity has been verified. You can receive payouts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <strong>Why KYC?</strong> We're required to verify your identity before you can
              receive funded account payouts. This is a one-time process.
            </div>
            {[
              {
                label: 'Full Legal Name',
                key: 'full_name',
                placeholder: 'As it appears on your ID',
                type: 'text',
              },
              {
                label: 'Residential Address',
                key: 'address',
                placeholder: '12 Example Street, Lagos, Nigeria',
                type: 'text',
              },
              {
                label: 'ID Document URL',
                key: 'id_url',
                placeholder: 'https://link-to-your-id-scan.com',
                type: 'url',
              },
              {
                label: 'Selfie URL (holding ID)',
                key: 'selfie_url',
                placeholder: 'https://link-to-selfie.com (optional)',
                type: 'url',
              },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  disabled={isReadOnly}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">ID Type</label>
                <select
                  value={form.id_type}
                  onChange={(e) => setForm((f) => ({ ...f, id_type: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 disabled:bg-gray-50"
                >
                  <option value="">Select...</option>
                  <option value="NIN">NIN (National ID)</option>
                  <option value="passport">International Passport</option>
                  <option value="drivers_license">Driver&apos;s License</option>
                  <option value="voters_card">Voter&apos;s Card</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">ID Number</label>
                <input
                  type="text"
                  value={form.id_number}
                  onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))}
                  disabled={isReadOnly}
                  placeholder="Your ID number"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
              <div className="flex items-start gap-2">
                <Upload size={12} className="mt-0.5 shrink-0" />
                <div>
                  <strong className="text-gray-700">How to upload:</strong> Upload your ID to Google
                  Drive or Dropbox, set it to public view, then paste the link above.
                </div>
              </div>
            </div>
            {kycError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {kycError}
              </div>
            )}
            <button
              onClick={() => kycMutation.mutate()}
              disabled={
                !form.full_name ||
                !form.id_type ||
                !form.id_number ||
                !form.id_url ||
                !form.address ||
                kycMutation.isPending
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: primary }}
            >
              {kycMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <FileText size={14} /> Submit KYC Documents
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TraderDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const tabParam = searchParams.get('tab');
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'account' | 'payouts' | 'profile' | 'kyc'
  >(tabParam === 'account' ? 'account' : 'overview');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);

  const sessionQuery = useQuery({
    queryKey: ['session', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}/auth`);
      if (!res.ok) return null;
      return res.json() as Promise<{ trader: Trader } | null>;
    },
    retry: false,
  });

  const sessionEmail = sessionQuery.data?.trader?.email;
  const email = sessionEmail || emailParam;
  const hasSession = !!sessionEmail;

  useEffect(() => {
    if (!sessionQuery.isLoading && !sessionEmail && !emailParam) {
      router.push(`/${slug}/login`);
    }
  }, [sessionQuery.isLoading, sessionEmail, emailParam, slug, router]);

  const { data: partner } = useQuery<Partner>({
    queryKey: ['partner', slug],
    queryFn: async () => {
      const res = await fetch(`/api/partners/${slug}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
  });

  const {
    data: traderData,
    isLoading: evalLoading,
    isError: evalError,
  } = useQuery<{ trader: Trader; evaluations: Evaluation[] }>({
    queryKey: ['evaluations', slug, email],
    queryFn: async () => {
      const res = await fetch(
        `/api/partners/${slug}/evaluations?email=${encodeURIComponent(email!)}`
      );
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!email && !!slug,
  });

  useEffect(() => {
    const evaluations = traderData?.evaluations;
    if (!evaluations?.length) return;

    const urlEvalId = Number(searchParams.get('eval_id'));
    if (urlEvalId && evaluations.some((e) => e.id === urlEvalId)) {
      setSelectedEvalId((current) => (current === urlEvalId ? current : urlEvalId));
      return;
    }

    setSelectedEvalId((current) => {
      if (current && evaluations.some((e) => e.id === current)) return current;
      return getDefaultEvaluationId(evaluations);
    });
  }, [traderData?.evaluations, searchParams]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/partners/${slug}/auth`, { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', slug] });
      router.push(`/${slug}/login`);
    },
  });

  const primary = partner?.brand_color || '#16A34A';
  const firmName = partner?.firm_name || slug;
  const products = getProducts(partner?.fee_markup);

  if (sessionQuery.isLoading || (!email && !sessionQuery.data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-gray-600"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-sm text-gray-400">Loading...</p>
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

  if (evalLoading && email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EF]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-7 w-7 rounded-full border-2 border-gray-200 border-t-gray-600"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-sm text-gray-400">Loading your dashboard...</p>
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

  if (evalError || !traderData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EF] px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <h2 className="mb-2 text-lg font-black text-gray-900">No account found</h2>
          <p className="mb-6 text-sm text-gray-500">
            We couldn&apos;t find a trading account for <strong>{email}</strong>.
          </p>
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Buy an Evaluation <ArrowRight size={14} />
          </Link>
          <div className="mt-3">
            <Link href={`/${slug}/login`} className="text-xs text-gray-400 underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { trader, evaluations } = traderData;
  const sessionTrader = sessionQuery.data?.trader;
  const displayTrader = sessionTrader || trader;
  const resolvedEvalId = selectedEvalId ?? getDefaultEvaluationId(evaluations);
  const eval_ =
    evaluations.find((e) => e.id === resolvedEvalId) ?? evaluations[0];

  const handleSelectEvaluation = (id: number) => {
    setSelectedEvalId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('eval_id', String(id));
    if (activeTab !== 'overview') params.set('tab', activeTab);
    router.replace(`/${slug}/dashboard?${params.toString()}`, { scroll: false });
  };

  if (!eval_) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] font-inter">
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {firmName[0]}
              </div>
              <span className="text-sm font-black text-gray-900">{firmName}</span>
            </div>
            {hasSession && (
              <button
                onClick={() => logoutMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 hover:text-red-500"
              >
                <LogOut size={11} /> Sign Out
              </button>
            )}
          </div>
        </nav>
        <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">📋</div>
            <h2 className="mb-2 text-lg font-black text-gray-900">No evaluations yet</h2>
            <p className="mb-6 text-sm text-gray-500">
              Welcome, {trader.name}! You have an account but no evaluations yet.
            </p>
            {hasSession ? (
              <button
                onClick={() => setPurchaseOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Buy an Evaluation <ArrowRight size={14} />
              </button>
            ) : (
              <Link
                href={`/${slug}`}
                className="inline-flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Buy an Evaluation <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
        {purchaseOpen && hasSession && (
          <DashboardPurchaseModal
            products={products}
            trader={displayTrader}
            slug={slug}
            primary={primary}
            onClose={() => setPurchaseOpen(false)}
            onSuccess={() => {
              setPurchaseOpen(false);
              setActiveTab('payments');
              qc.invalidateQueries({ queryKey: ['evaluations', slug, email] });
            }}
          />
        )}
      </div>
    );
  }

  const profitDone = hasProfitTarget(eval_.eval_type)
    ? eval_.telemetry?.profit_target_passed ?? eval_.current_profit >= eval_.profit_target
    : false;
  const daysDone =
    eval_.telemetry?.min_trading_days_passed ?? eval_.trading_days >= eval_.required_days;
  const dailyDrawdownBreached =
    eval_.telemetry?.daily_drawdown_breached ??
    eval_.daily_drawdown >= eval_.max_daily_drawdown;
  const accountDrawdownBreached =
    eval_.telemetry?.account_drawdown_breached ??
    eval_.current_drawdown >= eval_.max_drawdown;
  const dragged =
    dailyDrawdownBreached ||
    accountDrawdownBreached ||
    eval_.current_drawdown >= eval_.max_drawdown * 0.8 ||
    eval_.daily_drawdown >= eval_.max_daily_drawdown * 0.8;
  const allConditionsMet = hasProfitTarget(eval_.eval_type)
    ? profitDone && daysDone && !dailyDrawdownBreached && !accountDrawdownBreached
    : daysDone && !dailyDrawdownBreached && !accountDrawdownBreached;
  const accountSize = 10000;
  const currentBalance =
    eval_.latest_balance ?? accountSize * (1 + eval_.current_profit / 100);
  const currentEquity = eval_.latest_equity ?? currentBalance;
  const pnl = currentBalance - accountSize;
  const kycStatus = displayTrader.kyc_status || 'not_started';
  const kycBadgeMap: Record<string, string> = {
    not_started: '⚪ KYC Required',
    submitted: '🟡 KYC Under Review',
    approved: '🟢 KYC Approved',
    rejected: '🔴 KYC Rejected',
  };

  const pendingPaymentCount = evaluations.filter((e) => e.status === 'pending_payment').length;
  const passedCount = evaluations.filter(hasPassedByRules).length;
  const accountSetupCount = evaluations.filter(
    (e) => e.status === 'active' && e.account_creation_code && !e.trade_account_completed
  ).length;

  const allTabs = [
    { id: 'overview', label: 'Dashboard', icon: <BarChart3 size={13} />, badge: 0 },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard size={13} />,
      badge: pendingPaymentCount,
    },
    {
      id: 'account',
      label: 'Trading Account',
      icon: <KeyRound size={13} />,
      badge: accountSetupCount,
    },
    { id: 'payouts', label: 'Payouts', icon: <Banknote size={13} />, badge: passedCount },
    { id: 'profile', label: 'Profile', icon: <User size={13} />, badge: 0 },
    {
      id: 'kyc',
      label: `KYC ${kycStatus === 'not_started' ? '⚠' : kycStatus === 'approved' ? '✓' : ''}`,
      icon: <FileText size={13} />,
      badge: 0,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-inter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {partner?.logo_url ? (
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
            <span className="mx-1 text-gray-300">/</span>
            <span className="text-sm text-gray-500">{displayTrader.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasSession ? (
              <button
                onClick={() => setPurchaseOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300"
              >
                Buy Evaluation
              </button>
            ) : (
              <Link
                href={`/${slug}`}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300"
              >
                Buy Evaluation
              </Link>
            )}
            {hasSession && (
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 hover:border-red-200 hover:text-red-500"
              >
                <LogOut size={11} /> Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        {hasSession && (
          <div className="mx-auto max-w-6xl px-6 overflow-x-auto">
            <div className="flex gap-0 min-w-max">
              {allTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${activeTab === t.id ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  style={activeTab === t.id ? { color: primary, borderColor: primary } : {}}
                >
                  {t.icon} {t.label}
                  {t.badge > 0 && (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {hasSession && evaluations.length > 0 && resolvedEvalId && (
          <EvaluationAccountSwitcher
            evaluations={evaluations}
            selectedId={resolvedEvalId}
            onSelect={handleSelectEvaluation}
            primary={primary}
          />
        )}

        <div
          key={activeTab === 'overview' ? `overview-${resolvedEvalId}` : activeTab}
        >
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <>
            {hasSession && kycStatus === 'not_started' && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Complete your KYC</p>
                  <p className="mt-0.5 text-xs text-blue-700">
                    KYC verification is required to receive payouts from your funded account.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('kyc')}
                  className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Verify Now →
                </button>
              </div>
            )}

            {pendingPaymentCount > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Payment pending</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    You have {pendingPaymentCount} evaluation{pendingPaymentCount !== 1 ? 's' : ''}{' '}
                    awaiting payment confirmation.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  View →
                </button>
              </div>
            )}

            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">
                  Evaluation Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  ID:{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                    {formatEvaluationCode(eval_.id)}
                  </code>
                  {eval_.trade_account_number ? (
                    <span className="ml-2 text-xs text-gray-400">
                      · MT5 {eval_.trade_account_number}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={getEffectiveEvalStatus(eval_)} />
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                  {getEvalTypeLabel(eval_.eval_type)} · $
                  {accountSize.toLocaleString()}
                </div>
              </div>
            </div>

            {!eval_.trade_account_completed && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800">Link your MT5 account</p>
                  <p className="mt-0.5 text-xs text-blue-700">
                    Live metrics for this evaluation appear after you add your trading account
                    credentials.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('account')}
                  className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Set up account →
                </button>
              </div>
            )}

            {eval_.trade_account_completed && !eval_.telemetry?.has_telemetry && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Account linked. Waiting for the first trade data sync — metrics refresh every
                  15 minutes.
                </p>
              </div>
            )}

            {dragged && eval_.status === 'active' && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
                <AlertCircle size={16} className="shrink-0 text-orange-500" />
                <p className="text-sm text-orange-700">
                  <strong>Drawdown Warning:</strong> Daily drawdown is {eval_.daily_drawdown}% /
                  {eval_.max_daily_drawdown}% and account drawdown is {eval_.current_drawdown}% /
                  {eval_.max_drawdown}%.
                </p>
              </div>
            )}

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8">
              <h2 className="mb-6 text-base font-semibold text-gray-900">Evaluation Progress</h2>
              <div
                className={`grid grid-cols-2 gap-8 ${hasProfitTarget(eval_.eval_type) ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
              >
                {hasProfitTarget(eval_.eval_type) && (
                  <CircleRing
                    value={eval_.current_profit}
                    max={eval_.profit_target}
                    color={profitDone ? '#16A34A' : primary}
                    label="Profit Target"
                    sub={`${eval_.current_profit}% / ${eval_.profit_target}%`}
                  />
                )}
                <CircleRing
                  value={eval_.daily_drawdown}
                  max={eval_.max_daily_drawdown}
                  color={dailyDrawdownBreached ? '#DC2626' : '#6B7280'}
                  label="Daily Drawdown"
                  sub={`${eval_.daily_drawdown}% / ${eval_.max_daily_drawdown}% of starting balance/equity`}
                />
                <CircleRing
                  value={eval_.current_drawdown}
                  max={eval_.max_drawdown}
                  color={accountDrawdownBreached ? '#DC2626' : '#6B7280'}
                  label="Account Drawdown"
                  sub={`${eval_.current_drawdown}% / ${eval_.max_drawdown}%`}
                />
                <CircleRing
                  value={eval_.trading_days}
                  max={eval_.required_days}
                  color={daysDone ? '#16A34A' : '#2563EB'}
                  label="Trading Days"
                  sub={`${eval_.trading_days} / ${eval_.required_days} days`}
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Rules Checklist</h3>
                <div className="space-y-3">
                  {[
                    ...(hasProfitTarget(eval_.eval_type)
                      ? [
                          {
                            rule: `Profit target (${eval_.profit_target}%)`,
                            done: profitDone,
                            detail: `${eval_.current_profit}% achieved`,
                          },
                        ]
                      : []),
                    {
                      rule: `Min trading days (${eval_.required_days})`,
                      done: daysDone,
                      detail: `${eval_.trading_days} days completed`,
                    },
                    {
                      rule: `Daily drawdown (${DAILY_DRAWDOWN_RULE})`,
                      done: !dailyDrawdownBreached,
                      detail: dailyDrawdownBreached
                        ? 'Limit breached'
                        : `${eval_.daily_drawdown}% used`,
                      warn:
                        dailyDrawdownBreached ||
                        eval_.daily_drawdown >= eval_.max_daily_drawdown * 0.8,
                    },
                    {
                      rule: `Account drawdown (${eval_.max_drawdown}%)`,
                      done: !accountDrawdownBreached,
                      detail: accountDrawdownBreached
                        ? 'Limit breached'
                        : `${eval_.current_drawdown}% used`,
                      warn:
                        accountDrawdownBreached ||
                        eval_.current_drawdown >= eval_.max_drawdown * 0.8,
                    },
                  ].map((r) => (
                    <div key={r.rule} className="flex items-start gap-3">
                      {r.done && !r.warn ? (
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#16A34A]" />
                      ) : r.warn ? (
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-orange-500" />
                      ) : (
                        <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{r.rule}</div>
                        <div className={`text-xs ${r.warn ? 'text-orange-500' : 'text-gray-400'}`}>
                          {r.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {allConditionsMet && (
                  <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                    <CheckCircle size={20} className="mx-auto mb-2 text-[#16A34A]" />
                    <div className="text-sm font-semibold text-green-800">All conditions met!</div>
                    <div className="mt-0.5 text-xs text-green-600">
                      Go to the Payouts tab to make your requests.
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Account Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Trader Name', value: displayTrader.name },
                    {
                      label: 'Account Type',
                      value: getEvalTypeLabel(eval_.eval_type),
                    },
                    { label: 'Account Size', value: `$${accountSize.toLocaleString()}` },
                    {
                      label: 'Current Balance',
                      value: `$${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    },
                    {
                      label: 'Current Equity',
                      value: `$${currentEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    },
                    {
                      label: 'P&L',
                      value: `${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                      green: pnl >= 0,
                      red: pnl < 0,
                    },
                    { label: 'Daily Drawdown', value: `${eval_.daily_drawdown}%` },
                    { label: 'Account Drawdown', value: `${eval_.current_drawdown}%` },
                    { label: 'Purchase Date', value: formatDate(eval_.purchase_date) },
                    ...(hasSession
                      ? [{ label: 'KYC Status', value: kycBadgeMap[kycStatus] || kycStatus }]
                      : []),
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between border-b border-gray-50 py-2"
                    >
                      <span className="text-xs font-medium text-gray-400">{r.label}</span>
                      <span
                        className={`text-sm font-semibold ${r.green ? 'text-[#16A34A]' : r.red ? 'text-red-500' : 'text-gray-900'}`}
                      >
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield size={12} /> Powered by{' '}
              <span className="font-semibold text-[#16A34A]">FT9ja</span> — Trade data updates every
              15 minutes.
            </div>
          </>
        )}

        {/* ── Payments Tab ── */}
        {activeTab === 'payments' && <PaymentsTab evaluations={evaluations} primary={primary} />}

        {/* ── Trading Account Tab ── */}
        {activeTab === 'account' && hasSession && (
          <TradingAccountTab
            evaluations={evaluations}
            slug={slug}
            primary={primary}
            selectedEvalId={resolvedEvalId}
            onSelectEvalId={handleSelectEvaluation}
          />
        )}

        {/* ── Payouts Tab ── */}
        {activeTab === 'payouts' && hasSession && (
          <PayoutsTab
            evaluations={evaluations}
            trader={displayTrader}
            slug={slug}
            primary={primary}
          />
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && hasSession && (
          <ProfileTab trader={displayTrader} slug={slug} primary={primary} />
        )}

        {/* ── KYC Tab ── */}
        {activeTab === 'kyc' && hasSession && (
          <KYCTab trader={displayTrader} slug={slug} primary={primary} />
        )}
        </div>
      </div>
      {purchaseOpen && hasSession && (
        <DashboardPurchaseModal
          products={products}
          trader={displayTrader}
          slug={slug}
          primary={primary}
          onClose={() => setPurchaseOpen(false)}
          onSuccess={() => {
            setPurchaseOpen(false);
            setActiveTab('payments');
            qc.invalidateQueries({ queryKey: ['evaluations', slug, email] });
          }}
        />
      )}
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
