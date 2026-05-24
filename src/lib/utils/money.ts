/** Format a number as HKD currency string */
export function formatMoney(amount: number): string {
  return `HK$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Split total by N people */
export function splitAmount(total: number, people: number): number {
  if (people <= 0) return 0;
  return Math.round(total / people);
}