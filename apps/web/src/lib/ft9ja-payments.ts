export type Ft9jaPaymentMethod = 'transfer' | 'paypal' | 'crypto';
export type Ft9jaPaymentRow = { label: string; value: string; copy?: boolean };

export const FT9JA_PAYMENT_DETAILS = {
  transfer: [
    { label: 'Bank', value: 'Zenith Bank' },
    { label: 'Account Name', value: 'Asokoro Technologies' },
    { label: 'Account Number', value: '1217002454', copy: true },
  ],
  paypal: [{ label: 'PayPal', value: 'https://www.paypal.me/ft9ja', copy: true }],
  crypto: [
    { label: 'Network', value: 'BTC' },
    { label: 'Wallet', value: '3CLFanKRsufL2hrMmFuBMQAGVDmThr4RPa', copy: true },
  ],
} as const satisfies Record<
  Ft9jaPaymentMethod,
  readonly { label: string; value: string; copy?: boolean }[]
>;

export function getFt9jaPaymentRows(
  method: Ft9jaPaymentMethod,
  amount: string,
  reference: string
): Ft9jaPaymentRow[] {
  return [
    ...FT9JA_PAYMENT_DETAILS[method],
    { label: 'Amount', value: amount },
    { label: 'Reference', value: reference || 'Your email address' },
  ];
}
