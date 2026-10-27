export const DIRHAM_SYMBOL = '\u20C3';

// Display existing prices without changing their amounts or stored currency code.
export const displayPrice = (price) => {
  const text = String(price ?? '').trim();
  return text ? text.replace(/\bAED\b\s*/gi, `${DIRHAM_SYMBOL}\u00A0`) : '—';
};
