/**
 * Formats a number into Indian Rupee currency string (e.g. ₹ 28,45,320)
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '₹ 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹ 0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
    .format(num)
    .replace('INR', '₹');
}

/**
 * Formats a number with Indian numbering system commas
 */
export function formatIndianNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  return new Intl.NumberFormat('en-IN').format(n);
}
