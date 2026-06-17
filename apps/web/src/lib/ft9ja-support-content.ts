/**
 * Trader-facing rules and FAQ content aligned with ft9ja.com/support.
 * SS/SSL synthetic model specifics are preserved where the support site
 * describes multiple funding models (Classic, Challenge, Synthetic).
 */

export type FaqItem = { q: string; a: string };

/** Daily drawdown limit — percentage of that day's starting balance/equity (varies day to day). */
export const DAILY_DRAWDOWN_RULE = '5% of daily starting balance/equity';

export const SCALPING_RULE =
  'Scalping is permitted, but trading activities involving positions held for less than 5 minutes are not allowed.';

export const COPY_TRADING_RULE =
  'Copying trades from another FT9ja account is strictly forbidden, as is permitting another FT9ja account to replicate trades from your own FT9ja account.';

export const ONE_SIDE_BETTING_RULE =
  'Engaging in one-side betting is prohibited. One-sided betting is defined as a trading behaviour where a trader opens a large position on a single instrument or a series of large positions on a single instrument, followed by placing very small positions afterwards.';

/** Short bullets for product cards on partner landing pages. */
export const FT9JA_PRODUCT_CONDUCT_FEATURES = [
  'Scalping permitted — positions must be held at least 5 minutes',
  'Copy trading between FT9ja accounts is strictly forbidden',
  'One-side betting is prohibited',
] as const;

export type RuleRow = { label: string; value: string };

export type EvalRuleCard = {
  code: string;
  name: string;
  accountSize: string;
  rules: RuleRow[];
};

export const FT9JA_EVAL_RULES: EvalRuleCard[] = [
  {
    code: 'SS',
    name: 'Standard Evaluation',
    accountSize: '$10,000',
    rules: [
      { label: 'Profit Target', value: '25% ($2,500)' },
      { label: 'Max Drawdown', value: '10% ($1,000)' },
      { label: 'Daily Drawdown', value: DAILY_DRAWDOWN_RULE },
      { label: 'Min Trading Days', value: '10 days/month, 2/week' },
      { label: 'Min Hold Time', value: '5 minutes minimum' },
      { label: 'Scalping', value: '✅ Permitted (5 min min hold)' },
      { label: 'Copy Trading', value: '❌ Prohibited' },
      { label: 'One-side Betting', value: '❌ Prohibited' },
      { label: 'News Trading', value: '✅ Allowed' },
      { label: 'Expert Advisors', value: '✅ Allowed (no blackbox)' },
      { label: 'Aso Profit Split', value: 'Up to 90%' },
      { label: 'Second Chance', value: '❌ Not on SS' },
    ],
  },
  {
    code: 'SSL',
    name: 'Starter Evaluation',
    accountSize: '$10,000',
    rules: [
      { label: 'Profit Target', value: 'None (no evaluation)' },
      { label: 'Max Drawdown', value: '10% ($1,000)' },
      { label: 'Daily Drawdown', value: DAILY_DRAWDOWN_RULE },
      { label: 'Min Trading Days', value: '10 days/month, 2/week' },
      { label: 'Min Hold Time', value: '5 minutes minimum' },
      { label: 'Scalping', value: '✅ Permitted (5 min min hold)' },
      { label: 'Copy Trading', value: '❌ Prohibited' },
      { label: 'One-side Betting', value: '❌ Prohibited' },
      { label: 'News Trading', value: '✅ Allowed' },
      { label: 'Expert Advisors', value: '✅ Allowed (no blackbox)' },
      { label: 'Talent Bonus', value: '5% weekly / 15% monthly' },
      { label: 'Aso Account', value: '❌ Not available' },
    ],
  },
];

export const FT9JA_RULE_NOTES: { label: string; text: string }[] = [
  {
    label: 'Drawdown',
    text: 'Daily drawdown is 5% of that day’s starting balance/equity — the dollar limit changes as your account balance or equity changes. Overall drawdown is 10% of the original account size. At 00:00 WAT each day, the daily limit resets based on that day’s starting balance/equity. Breaching either limit fails the account.',
  },
  {
    label: 'Trading days',
    text: 'Open and close positions on at least 2 separate days per week and 10 separate days per month. Days do not need to be consecutive. Missing minimum days is not an immediate breach — trade extra days to catch up. Accounts become ineligible for payout after 2 consecutive weeks of inactivity.',
  },
  {
    label: 'Expert Advisors',
    text: 'Signals and EAs are allowed if they follow all rules. FT9ja may request details on how an EA works. “Blackbox” robots are not allowed; refusal to share details may result in withheld payouts or account termination.',
  },
  {
    label: 'Scalping',
    text: SCALPING_RULE,
  },
  {
    label: 'Copying trades',
    text: COPY_TRADING_RULE,
  },
  {
    label: 'One-side betting',
    text: ONE_SIDE_BETTING_RULE,
  },
  {
    label: 'Login details',
    text: 'You may not change your trading account login details. Changing your password or other credentials results in immediate account termination.',
  },
];

export const FT9JA_PARTNER_FAQS: FaqItem[] = [
  {
    q: 'What is the Synthetic Signals (SS) account?',
    a: 'The SS account is the first account on the FT9ja Synthetic Signals model — a demo account integrated with your own Deriv demo account via self-service. Trade synthetic indices; if you meet the 25% profit target without breaching drawdown rules, you qualify for an Aso funded account.',
  },
  {
    q: 'What is the Synthetic Signals Lite (SSL) account?',
    a: 'The SSL account is the first account on the FT9ja Synthetic Signals Lite model — also a Deriv-integrated demo account for synthetic indices. There is no evaluation or path to an Aso account. Traders earn talent bonus payouts (5% weekly or 15% monthly) on profits made.',
  },
  {
    q: 'How do I access my dashboard after purchasing?',
    a: 'Visit the Trader Login page, enter the email you used when purchasing, and you will be taken to your evaluation dashboard. No password is needed — your email is your access.',
  },
  {
    q: 'When will I receive my account login details?',
    a: 'Within 24 hours of purchase, your account login details will be emailed to you.',
  },
  {
    q: 'What happens when I pass the SS evaluation?',
    a: 'Once you reach the 25% profit target, meet minimum trading days, and have no rule breaches, you qualify for an Aso funded account. Aso login details are issued within 7 working days. Profit split is up to 90% if you qualify within 4 weeks, 60% within 5–8 weeks, or 40% after 8 weeks.',
  },
  {
    q: 'What is the talent bonus?',
    a: 'FT9ja pays traders during evaluation — you do not need to pass first. On SS, earn talent bonus while working toward the 25% target. On SSL, earn 5% of weekly profits or 15% of monthly profits. You are eligible for your first payout after 10 trading days. Payouts are processed on Fridays only.',
  },
  {
    q: 'Can I get my payout any day of the week?',
    a: 'No. Payouts are processed on Fridays for weekly plans, and every 4 Fridays for the monthly payout option.',
  },
  {
    q: 'Are Expert Advisors (EAs) allowed?',
    a: 'Yes. Signals and EAs are allowed as long as they do not break any rules. FT9ja may ask for details on how your EA works — “blackbox” robots are not allowed.',
  },
  {
    q: 'Do you allow scalping?',
    a: SCALPING_RULE,
  },
  {
    q: 'Is copy trading allowed?',
    a: COPY_TRADING_RULE,
  },
  {
    q: 'What is one-side betting?',
    a: ONE_SIDE_BETTING_RULE,
  },
  {
    q: 'Has my account been violated if I miss minimum trading days?',
    a: 'No. When you fail to meet the minimum trading day rule, you must trade for an additional week or weeks depending on days missed. Your account becomes ineligible for payout after 2 consecutive weeks of inactivity.',
  },
  {
    q: 'Does the consistency rule still apply?',
    a: 'No. The consistency rule has been removed.',
  },
  {
    q: 'Can I get a free second chance account?',
    a: 'Second chance accounts are only available on the Classic Model (Zuma accounts), not on Synthetic Signals (SS) or Synthetic Signals Lite (SSL) accounts.',
  },
  {
    q: 'Is my evaluation fee refundable?',
    a: 'Evaluation fees are non-refundable once your account has been activated. If you have not received credentials within 24 hours of confirmed payment, contact your firm immediately.',
  },
  {
    q: 'Am I responsible for trading losses?',
    a: 'No. FT9ja covers the losses on funded accounts. Your maximum financial exposure is the evaluation fee you paid.',
  },
];

export const FT9JA_GUIDE_FAQ_SECTIONS: { id: string; title: string; faqs: FaqItem[] }[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    faqs: [
      {
        q: 'What is FT9ja?',
        a: "FT9ja is Nigeria's first next-generation prop trading firm. We scout talented but undercapitalized traders, provide funded accounts, and split the profits. Traders trade with our capital — not their own.",
      },
      {
        q: 'What is the Synthetic Signals (SS) account?',
        a: 'The SS account is your entry on the FT9ja Synthetic Signals model. It is a demo account integrated with your own Deriv demo account via self-service. Trade synthetic indices; if you meet the 25% profit target without breaching rules, you qualify for an Aso funded account.',
      },
      {
        q: 'What is the Synthetic Signals Lite (SSL) account?',
        a: 'The SSL account is your entry on the Synthetic Signals Lite model — also Deriv-integrated for synthetic indices. There is no evaluation or Aso account path. Traders earn talent bonus payouts on profits (5% weekly or 15% monthly).',
      },
      {
        q: 'What happens after I purchase?',
        a: 'Your account details will be emailed to you within 24 hours of purchase.',
      },
      {
        q: 'Are you a broker?',
        a: 'No. FT9ja is a prop trading firm, not a broker. We provide traders access to accounts with third-party brokers. SS and SSL accounts integrate with Deriv.',
      },
      {
        q: 'Is this an investment offer?',
        a: 'No. You are not investing money into FT9ja or any trading account. FT9ja invests its funds into talented traders discovered through evaluation.',
      },
    ],
  },
  {
    id: 'evaluation-rules',
    title: 'Trading Rules',
    faqs: [
      {
        q: 'What are the trading rules at FT9ja?',
        a: 'The two core rules are drawdown and minimum trading days. Daily drawdown is 5% of that day’s starting balance/equity (the limit varies day to day). Overall drawdown is 10% of the original account size. You must trade on at least 2 separate days per week and 10 separate days per month. Trading days do not need to be consecutive.',
      },
      {
        q: 'What is the profit target for SS?',
        a: 'Grow your $10,000 SS account to 25% ($2,500 profit) to qualify for an Aso funded account. There is no time limit. SSL has no profit target.',
      },
      {
        q: 'What is maximum drawdown?',
        a: 'Daily drawdown is 5% of that day’s starting balance/equity — so the dollar limit changes each day as your account moves. Overall drawdown is 10% of the original account size (e.g. $1,000 on a $10,000 account). Daily drawdown resets at 00:00 WAT based on that day’s starting balance/equity.',
      },
      {
        q: 'How many days do I have to trade per week?',
        a: 'You must open and close positions on at least 2 separate days per trading week and 10 separate days per month. Missing days is not an immediate breach — catch up by trading extra days. Accounts become ineligible for payout after 2 consecutive weeks of inactivity.',
      },
      {
        q: 'Are Expert Advisors (EAs) and bots allowed?',
        a: 'Signals and EAs are allowed if they follow all rules. FT9ja may request details on how your EA works. “Blackbox” robots are not allowed; refusal may result in withheld payouts or termination.',
      },
      {
        q: 'Do you allow scalping?',
        a: SCALPING_RULE,
      },
      {
        q: 'Is copy trading allowed?',
        a: COPY_TRADING_RULE,
      },
      {
        q: 'What is one-side betting?',
        a: ONE_SIDE_BETTING_RULE,
      },
      {
        q: 'Am I free to use my own trading style?',
        a: 'There are no restrictions on trading styles. FT9ja looks for responsible and consistent behavior. You may mix swing, discretionary, and other approaches as long as you stay consistent.',
      },
      {
        q: 'Can I change my trading account login details?',
        a: 'No. Changing your password or any login details results in immediate account termination.',
      },
      {
        q: 'Does the consistency rule still apply?',
        a: 'No. The consistency rule has been removed.',
      },
    ],
  },
  {
    id: 'funded-account',
    title: 'Funded Account & Payouts',
    faqs: [
      {
        q: 'What is the Aso account?',
        a: 'When you pass the SS evaluation, you become an AsoRock Trader. Aso accounts are simulated accounts from which FT9ja may copy signals at its discretion. Aso traders receive up to 90% of profits based on how quickly they qualify.',
      },
      {
        q: 'What percentage of Aso profits will I receive?',
        a: '90% if you qualify for the Aso account within 4 weeks of your first trade. 60% if you qualify within 5–8 weeks. 40% if you qualify after 8 weeks.',
      },
      {
        q: 'Do I need a profit percentage before withdrawing on Aso?',
        a: 'No. There is no percentage requirement for withdrawal on the Aso account.',
      },
      {
        q: 'What is the talent bonus?',
        a: 'FT9ja pays traders during evaluation. On SS, earn talent bonus while working toward 25%. On SSL, earn 5% of weekly profits or 15% of monthly profits. First payout is available after 10 trading days.',
      },
      {
        q: 'Can I receive talent bonus before passing SS?',
        a: 'Yes. FT9ja pays you during evaluation. You are eligible for your first payout after 10 trading days, even on the weekly plan.',
      },
      {
        q: 'When and how often do I get paid?',
        a: 'Weekly plan: paid every week. Monthly plan: paid every 4 weeks. Payouts are processed on Fridays only. Request payouts through your trader dashboard.',
      },
      {
        q: 'How much can I make?',
        a: 'There are no limits to your earnings. With FT9ja, you earn as you make profits.',
      },
      {
        q: 'How soon can I start earning?',
        a: 'As soon as you have satisfied the 10 trading days rule, you can request a payout.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Fees',
    faqs: [
      {
        q: 'How do I pay for an evaluation?',
        a: 'Pay via bank transfer, PayPal, or crypto using the instructions on your partner firm’s checkout page. After purchasing, upload payment proof for verification.',
      },
      {
        q: 'Are there recurring monthly fees?',
        a: 'No. There are no recurring monthly fees for traders on evaluation or funded accounts.',
      },
      {
        q: 'Are evaluation fees refundable?',
        a: 'Evaluation fees are non-refundable once your account has been activated. Contact your partner firm if credentials are not received within 24 hours.',
      },
      {
        q: 'Can I get a free second chance account?',
        a: 'FT9ja offers a free second chance on the Classic Model (Zuma accounts) only. Second chance accounts do not apply to Synthetic Signals (SS) or Synthetic Signals Lite (SSL).',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk & Important Notices',
    faqs: [
      {
        q: 'Will I be responsible for losses?',
        a: 'No. FT9ja covers the losses. Your maximum financial exposure is the evaluation fee you paid.',
      },
      {
        q: 'Is this real money trading?',
        a: 'Evaluation accounts are demo/simulated environments integrated with Deriv. Funded Aso accounts use FT9ja capital with real market conditions.',
      },
      {
        q: 'What markets can I trade on SS/SSL?',
        a: 'SS and SSL accounts trade synthetic indices via Deriv demo integration. Check your account details after purchase for the exact instrument list.',
      },
      {
        q: 'Is prop trading regulated?',
        a: 'Prop trading firm services operate in a regulatory grey zone in many jurisdictions. FT9ja is not a brokerage or investment product.',
      },
    ],
  },
];

export const FT9JA_RULES_QUICK_REFERENCE: [string, string, string][] = [
  ['Account Size', '$10,000', '$10,000'],
  ['Evaluation Fee', '₦145,000', '₦49,000'],
  ['Evaluation', '25% profit target', 'No evaluation'],
  ['Profit Target', '25% ($2,500)', 'None'],
  ['Max Drawdown', '10% ($1,000)', '10% ($1,000)'],
  ['Daily Drawdown', DAILY_DRAWDOWN_RULE, DAILY_DRAWDOWN_RULE],
  ['Min Trading Days', '10/mo, 2/week', '10/mo, 2/week'],
  ['Min Hold Time', '5 minutes minimum', '5 minutes minimum'],
  ['Scalping', '✅ Permitted (5 min min hold)', '✅ Permitted (5 min min hold)'],
  ['Copy Trading', '❌ Prohibited', '❌ Prohibited'],
  ['One-side Betting', '❌ Prohibited', '❌ Prohibited'],
  ['News Trading', '✅ Allowed', '✅ Allowed'],
  ['EA / Bots', '✅ Allowed (no blackbox)', '✅ Allowed (no blackbox)'],
  ['Payouts', 'Up to 90% (Aso)', 'Talent bonus only'],
  ['Payout Day', 'Fridays', 'Fridays'],
  ['Second Chance', '❌ No', '❌ No'],
  ['Broker', 'Deriv', 'Deriv'],
];

export const FT9JA_LEGAL_EVALUATION_RULES: { heading: string; text: string }[] = [
  {
    heading: 'Standard Evaluation (SS) — $10,000 Account',
    text: '• Profit Target: 25% ($2,500)\n• Maximum Drawdown: 10% ($1,000) of starting equity\n• Daily Drawdown: 5% of that day’s starting balance/equity (resets at 00:00 WAT)\n• Minimum Trading Days: 10 per month, 2 per week\n• Minimum Hold Time: 5 minutes per trade\n• News Trading: Allowed\n• Expert Advisors: Allowed (blackbox EAs prohibited)\n• Path to Aso: Yes (up to 90% profit split)\n• Second Chance: Not available on SS',
  },
  {
    heading: 'Starter Evaluation (SSL) — $10,000 Account',
    text: '• Profit Target: None (no evaluation)\n• Maximum Drawdown: 10% ($1,000) of starting equity\n• Daily Drawdown: 5% of that day’s starting balance/equity (resets at 00:00 WAT)\n• Minimum Trading Days: 10 per month, 2 per week\n• Minimum Hold Time: 5 minutes per trade\n• News Trading: Allowed\n• Expert Advisors: Allowed (blackbox EAs prohibited)\n• Talent Bonus: 5% weekly or 15% monthly\n• Aso Account: Not available on SSL',
  },
  {
    heading: 'Drawdown Calculation',
    text: 'Daily drawdown is 5% of that day’s starting balance/equity, recalculated at 00:00 WAT — the dollar limit varies day to day. Overall drawdown is 10% of the original account size (starting equity). Breaching either limit at any point fails the evaluation.',
  },
  {
    heading: 'Trading Days & Inactivity',
    text: 'A trading day counts when you open and close at least one position. Days do not need to be consecutive. Failing to meet minimum days is not an immediate breach — you must catch up. Accounts become ineligible for payout after 2 consecutive weeks of inactivity.',
  },
  {
    heading: 'Prohibited Conduct',
    text: `• Scalping: ${SCALPING_RULE}\n• Copying trades: ${COPY_TRADING_RULE}\n• One-side betting: ${ONE_SIDE_BETTING_RULE}`,
  },
  {
    heading: 'Account Credentials',
    text: 'Login details are issued within 24 hours of purchase. You may not change trading account login details — doing so results in immediate termination.',
  },
  {
    heading: 'Payouts',
    text: 'First payout is available after 10 trading days. Payouts are processed on Fridays (weekly plan) or every 4 Fridays (monthly plan). Aso profit split: 90% within 4 weeks, 60% within 5–8 weeks, 40% after 8 weeks of first trade.',
  },
];
