'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  LogOut,
  User,
  FileText,
  BarChart3,
  Loader2,
  Eye,
  EyeOff,
  Upload,
  CreditCard,
  Banknote,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Partner = { firm_name: string; brand_color: string; slug: string; logo_url?: string | null };
type Trader = { id: number; name: string; email: string; status: string; kyc_status: string };
type Evaluation = {
  id: number;
  eval_type: string;
  amount: number;
  status: string;
  payout_status: string | null;
  profit_target: number;
  current_profit: number;
  max_drawdown: number;
  current_drawdown: number;
  trading_days: number;
  required_days: number;
  purchase_date: string;
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

function getAvailableRequests(evalType: string): string[] {
  if (evalType === 'SSL') return ['talent_bonus', 'aso_payout_ssl'];
  return ['talent_bonus', 'aso_account'];
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

      {/* Pending Payments */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <Clock size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">Awaiting Payment</span>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {pending.map((e) => (
              <div key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">
                        {e.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} Evaluation
                      </span>
                      <StatusBadge status={e.status} />
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
                  <p className="text-xs font-semibold text-amber-800">📋 Payment Instructions</p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-amber-700">Bank:</span>
                      <span className="font-semibold text-amber-900">First Bank Nigeria</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700">Account Number:</span>
                      <span className="font-semibold text-amber-900">3012345678</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700">Account Name:</span>
                      <span className="font-semibold text-amber-900">FT9ja Trading Ltd</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700">Reference:</span>
                      <span className="font-semibold text-amber-900">Your email address</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700">Amount:</span>
                      <span className="font-semibold text-amber-900">
                        ₦{parseFloat(String(e.amount)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="pt-1 text-xs text-amber-600">
                    ⚡ Your evaluation activates within 2 hours of payment confirmation.
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
                      {e.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} Evaluation
                    </span>
                    <StatusBadge status={e.status} />
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

  const passedEvals = evaluations.filter((e) => e.status === 'passed');

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

      {/* Passed evaluations with requests */}
      {passedEvals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Banknote size={28} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-semibold text-gray-500">No passed evaluations yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Payout requests unlock once you pass an evaluation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {passedEvals.map((e) => {
            const isExpanded = expandedEval === e.id;
            const availableTypes = getAvailableRequests(e.eval_type);

            return (
              <div
                key={e.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                {/* Eval header */}
                <div
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50"
                  onClick={() => setExpandedEval(isExpanded ? null : e.id)}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {e.eval_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {e.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} Evaluation
                      </span>
                      <StatusBadge status={e.status} />
                      <PayoutBadge status={e.payout_status ?? null} />
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      EVL-{e.id.toString().padStart(6, '0')} · Profit: +{e.current_profit}% ·{' '}
                      {e.trading_days} days
                    </div>
                  </div>
                  <div className="shrink-0 text-gray-400">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
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
                          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span className="text-xl">{meta?.icon}</span>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {meta?.label}
                                </div>
                                <div className="text-xs text-gray-500">{meta?.desc}</div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {existingReq ? (
                                <RequestStatusBadge status={existingReq.status} />
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
                          {isThisRequesting && !existingReq && (
                            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                                  Additional notes <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
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
          })}
        </div>
      )}

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
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'payouts' | 'profile' | 'kyc'
  >('overview');

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
  const eval_ = evaluations.find((e) => e.status === 'active') || evaluations[0];

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
            <Link
              href={`/${slug}`}
              className="inline-flex items-center gap-2 rounded-lg py-2.5 px-5 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Buy an Evaluation <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profitDone = eval_.current_profit >= eval_.profit_target;
  const daysDone = eval_.trading_days >= eval_.required_days;
  const dragged = eval_.current_drawdown >= eval_.max_drawdown * 0.8;
  const accountSize = eval_.eval_type === 'SSL' ? 5000 : 10000;
  const currentBalance = accountSize * (1 + eval_.current_profit / 100);
  const pnl = currentBalance - accountSize;
  const evalCode = `EVL-${eval_.id.toString().padStart(6, '0')}`;
  const kycStatus = displayTrader.kyc_status || 'not_started';
  const kycBadgeMap: Record<string, string> = {
    not_started: '⚪ KYC Required',
    submitted: '🟡 KYC Under Review',
    approved: '🟢 KYC Approved',
    rejected: '🔴 KYC Rejected',
  };

  const pendingPaymentCount = evaluations.filter((e) => e.status === 'pending_payment').length;
  const passedCount = evaluations.filter((e) => e.status === 'passed').length;

  const allTabs = [
    { id: 'overview', label: 'Dashboard', icon: <BarChart3 size={13} />, badge: 0 },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard size={13} />,
      badge: pendingPaymentCount,
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
                src={partner.logo_url}
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
            <Link
              href={`/${slug}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300"
            >
              Buy Evaluation
            </Link>
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
                    {evalCode}
                  </code>
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={eval_.status} />
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                  {eval_.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} · $
                  {accountSize.toLocaleString()}
                </div>
              </div>
            </div>

            {dragged && eval_.status === 'active' && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
                <AlertCircle size={16} className="shrink-0 text-orange-500" />
                <p className="text-sm text-orange-700">
                  <strong>Drawdown Warning:</strong> You&apos;ve used {eval_.current_drawdown}% of
                  your {eval_.max_drawdown}% max drawdown.
                </p>
              </div>
            )}

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-8">
              <h2 className="mb-6 text-base font-semibold text-gray-900">Evaluation Progress</h2>
              <div className="grid grid-cols-3 gap-8">
                <CircleRing
                  value={eval_.current_profit}
                  max={eval_.profit_target}
                  color={profitDone ? '#16A34A' : primary}
                  label="Profit Target"
                  sub={`${eval_.current_profit}% / ${eval_.profit_target}%`}
                />
                <CircleRing
                  value={eval_.current_drawdown}
                  max={eval_.max_drawdown}
                  color={dragged ? '#EA580C' : '#6B7280'}
                  label="Drawdown Used"
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
                    {
                      rule: `Profit target (${eval_.profit_target}%)`,
                      done: profitDone,
                      detail: `${eval_.current_profit}% achieved`,
                    },
                    {
                      rule: `Min trading days (${eval_.required_days})`,
                      done: daysDone,
                      detail: `${eval_.trading_days} days completed`,
                    },
                    {
                      rule: `Max drawdown (${eval_.max_drawdown}%)`,
                      done: !dragged,
                      detail: dragged ? '⚠ Near limit' : `${eval_.current_drawdown}% used`,
                      warn: dragged,
                    },
                    {
                      rule: `Daily loss limit (${eval_.max_drawdown / 2}%)`,
                      done: true,
                      detail: 'Within limits',
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
                {profitDone && daysDone && !dragged && (
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
                      value: eval_.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)',
                    },
                    { label: 'Account Size', value: `$${accountSize.toLocaleString()}` },
                    { label: 'Current Balance', value: `$${currentBalance.toFixed(0)}` },
                    {
                      label: 'P&L',
                      value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`,
                      green: pnl >= 0,
                      red: pnl < 0,
                    },
                    { label: 'Open Drawdown', value: `${eval_.current_drawdown}%` },
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

            {evaluations.length > 1 && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">All Evaluations</h3>
                <div className="space-y-2">
                  {evaluations.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {e.eval_type === 'SSL' ? 'Starter (SSL)' : 'Standard (SS)'} · $
                          {e.eval_type === 'SSL' ? '5,000' : '10,000'}
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(e.purchase_date)}</div>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield size={12} /> Powered by{' '}
              <span className="font-semibold text-[#16A34A]">FT9ja</span> — Trade data updates every
              15 minutes.
            </div>
          </>
        )}

        {/* ── Payments Tab ── */}
        {activeTab === 'payments' && <PaymentsTab evaluations={evaluations} primary={primary} />}

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
