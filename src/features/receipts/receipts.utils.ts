import type { Receipt, ReceiptStatus } from '../../types';

/** Filter receipts by status */
export function filterByStatus(
  receipts: Receipt[],
  status: ReceiptStatus | 'all'
): Receipt[] {
  if (status === 'all') return receipts;
  return receipts.filter((r) => r.status === status);
}

/** Calculate total amount of approved receipts */
export function calcApprovedTotal(receipts: Receipt[]): number {
  return receipts
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);
}

/** Monthly report: fixed costs */
export const MONTHLY_RENT = 10000; // 租金
export const MONTHLY_UTILITIES = 2000; // 水電
export const DEFAULT_MEMBER_COUNT = 8;

export interface MonthlyReport {
  approvedTotal: number;
  rent: number;
  utilities: number;
  totalExpenses: number;
  memberCount: number;
  perPerson: number;
}

export function calcMonthlyReport(
  receipts: Receipt[],
  memberCount: number = DEFAULT_MEMBER_COUNT
): MonthlyReport {
  const approvedTotal = calcApprovedTotal(receipts);
  const totalExpenses = approvedTotal + MONTHLY_RENT + MONTHLY_UTILITIES;
  return {
    approvedTotal,
    rent: MONTHLY_RENT,
    utilities: MONTHLY_UTILITIES,
    totalExpenses,
    memberCount,
    perPerson: memberCount > 0 ? Math.round(totalExpenses / memberCount) : 0,
  };
}