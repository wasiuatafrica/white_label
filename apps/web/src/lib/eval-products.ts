import { DAILY_DRAWDOWN_RULE } from '@/lib/ft9ja-support-content';
import {
  FT9JA_BASE_PRICES,
  formatNaira,
  getTraderPrice,
  toMoneyNumber,
  type EvalType,
} from '@/lib/partner-pricing';

export type EvalProduct = {
  id: string;
  name: string;
  code: EvalType;
  price: string;
  priceNum: number;
  basePriceNum: number;
  accountSize: string;
  profitTarget: string;
  maxDrawdown: string;
  tradingDays?: string;
  features?: string[];
};

const PARTNER_PRODUCT_CONDUCT_FEATURES = [
  'Scalping permitted — positions must be held at least 5 minutes',
  'Copy trading between accounts is strictly forbidden',
  'One-side betting is prohibited',
] as const;

const BASE_EVAL_PRODUCTS: EvalProduct[] = [
  {
    id: 'ss',
    name: 'Standard Evaluation',
    code: 'SS',
    price: formatNaira(FT9JA_BASE_PRICES.SS),
    priceNum: FT9JA_BASE_PRICES.SS,
    basePriceNum: FT9JA_BASE_PRICES.SS,
    accountSize: '$10,000',
    profitTarget: '25%',
    maxDrawdown: '10%',
    tradingDays: '10 days/mo',
    features: [
      `Daily drawdown: ${DAILY_DRAWDOWN_RULE}`,
      'Maximum 10% total drawdown',
      'Minimum 10 trading days per month (2 per week)',
      ...PARTNER_PRODUCT_CONDUCT_FEATURES,
      'Grow to 25% to qualify for Aso account (up to 90% split)',
      'Payouts processed on Fridays',
    ],
  },
  {
    id: 'ssl',
    name: 'Starter Evaluation',
    code: 'SSL',
    price: formatNaira(FT9JA_BASE_PRICES.SSL),
    priceNum: FT9JA_BASE_PRICES.SSL,
    basePriceNum: FT9JA_BASE_PRICES.SSL,
    accountSize: '$10,000',
    profitTarget: 'None',
    maxDrawdown: '10%',
    tradingDays: '10 days/mo',
    features: [
      `Daily drawdown: ${DAILY_DRAWDOWN_RULE}`,
      'Maximum 10% total drawdown',
      'Minimum 10 trading days per month (2 per week)',
      ...PARTNER_PRODUCT_CONDUCT_FEATURES,
      'No evaluation — talent bonus payouts (5% weekly / 15% monthly)',
      'Payouts processed on Fridays',
    ],
  },
];

export function getPartnerProducts(
  feeMarkup: number | string | null | undefined
): EvalProduct[] {
  const markup = toMoneyNumber(feeMarkup);
  return BASE_EVAL_PRODUCTS.map((product) => {
    const priceNum = getTraderPrice(product.code, markup);
    return {
      ...product,
      priceNum,
      price: formatNaira(priceNum),
    };
  });
}

export function getDefaultEvalProduct(): EvalProduct {
  return getPartnerProducts(0)[0] as EvalProduct;
}

export { BASE_EVAL_PRODUCTS, FT9JA_BASE_PRICES };
