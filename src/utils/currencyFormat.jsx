/**
 * Formats a number as INR currency
 * @param {number} amount - The amount to format
 * @param {boolean} [showSymbol=true] - Whether to show the ₹ symbol (default: true)
 * @returns {string} Formatted currency string
 */
export function formatINR(amount, showSymbol = true) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return showSymbol ? '—' : '—';
  }

  const num = Number(amount);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats a number as INR currency with full rupee symbol
 * @param {number} amount
 * @returns {string}
 */
export function formatINRFull(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '—';
  }

  const num = Number(amount);
  return `₹ ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
