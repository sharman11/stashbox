/** Display metadata for the US student-loan type taxonomy. Pure data —
 *  no imports beyond `LoanType` so this can be referenced from forms,
 *  list cards, and the detail screen without a circular dep on the
 *  store. */

import type { LoanType, RepaymentPlan } from '../types';

interface LoanTypeMeta {
  id: LoanType;
  label: string;
  shortLabel: string;
  /** True for any federal Direct/PLUS/Perkins loan. Drives the
   *  "federal protections" badge and the refi warning. */
  isFederal: boolean;
  /** True for Direct Subsidized — interest doesn't accrue while in school
   *  / grace / deferment. We surface this as a banner on the detail screen
   *  but don't change math (since by repayment the subsidy period is over). */
  subsidizedInSchool: boolean;
  description: string;
}

export const LOAN_TYPES: Record<LoanType, LoanTypeMeta> = {
  federal_subsidized: {
    id: 'federal_subsidized',
    label: 'Federal Direct Subsidized',
    shortLabel: 'Direct Subsidized',
    isFederal: true,
    subsidizedInSchool: true,
    description:
      'Undergraduate, need-based. Government pays interest while you\'re in school, in grace, or in deferment.',
  },
  federal_unsubsidized: {
    id: 'federal_unsubsidized',
    label: 'Federal Direct Unsubsidized',
    shortLabel: 'Direct Unsubsidized',
    isFederal: true,
    subsidizedInSchool: false,
    description:
      'Undergrad or graduate. Interest accrues from disbursement and capitalizes when you enter repayment.',
  },
  federal_plus: {
    id: 'federal_plus',
    label: 'Federal Direct PLUS',
    shortLabel: 'Direct PLUS',
    isFederal: true,
    subsidizedInSchool: false,
    description:
      'Grad or Parent PLUS. Higher APR than Direct loans (~1% spread) and an origination fee on each disbursement.',
  },
  perkins: {
    id: 'perkins',
    label: 'Federal Perkins (legacy)',
    shortLabel: 'Perkins',
    isFederal: true,
    subsidizedInSchool: true,
    description:
      'School-held, 5% fixed. New issuance ended in 2017 — still on many borrowers\' balance sheets.',
  },
  private: {
    id: 'private',
    label: 'Private student loan',
    shortLabel: 'Private',
    isFederal: false,
    subsidizedInSchool: false,
    description:
      'Bank or non-federal lender. APR can be fixed or variable. No federal protections — no IDR, no PSLF.',
  },
  refinanced: {
    id: 'refinanced',
    label: 'Refinanced (private)',
    shortLabel: 'Refinanced',
    isFederal: false,
    subsidizedInSchool: false,
    description:
      'Originally federal or private, refinanced through a private lender. Forfeits federal protections (IDR, PSLF, forbearance).',
  },
};

export const LOAN_TYPE_ORDER: readonly LoanType[] = [
  'federal_unsubsidized',
  'federal_subsidized',
  'federal_plus',
  'perkins',
  'private',
  'refinanced',
];

interface RepaymentPlanMeta {
  id: RepaymentPlan;
  label: string;
  description: string;
  /** True when payment is a fixed amortization the app can project. False
   *  for IDR/PSLF where the payment depends on income/employment we don't
   *  collect — we treat those as "estimate only" and rely on user-entered
   *  monthly payment. */
  isDeterministic: boolean;
}

export const REPAYMENT_PLANS: Record<RepaymentPlan, RepaymentPlanMeta> = {
  standard: {
    id: 'standard',
    label: 'Standard (10-year)',
    description: 'Fixed monthly payment, default plan for federal loans.',
    isDeterministic: true,
  },
  graduated: {
    id: 'graduated',
    label: 'Graduated',
    description: 'Starts low, steps up every 2 years. 10-year term.',
    isDeterministic: false,
  },
  extended: {
    id: 'extended',
    label: 'Extended (25-year)',
    description: 'For balances over $30K. Lower monthly, more interest over life of loan.',
    isDeterministic: true,
  },
  idr: {
    id: 'idr',
    label: 'Income-Based (IBR / RAP)',
    description: 'Payment is a % of discretionary income, recertified yearly. Projections are estimates only.',
    isDeterministic: false,
  },
  pslf: {
    id: 'pslf',
    label: 'PSLF track',
    description: 'On an IDR plan, working for a qualifying public-sector employer toward 120 payments.',
    isDeterministic: false,
  },
  other: {
    id: 'other',
    label: 'Other',
    description: 'Anything not listed (private lender custom plans, settlement plans, etc.).',
    isDeterministic: false,
  },
};

export const REPAYMENT_PLAN_ORDER: readonly RepaymentPlan[] = [
  'standard',
  'graduated',
  'extended',
  'idr',
  'pslf',
  'other',
];
