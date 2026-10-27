import { displayPrice, DIRHAM_SYMBOL } from './price';

test.each([
  ['AED 25.50', `${DIRHAM_SYMBOL}\u00A025.50`],
  [' AED 0.00 ', `${DIRHAM_SYMBOL}\u00A00.00`],
  ['aed 1,234.50', `${DIRHAM_SYMBOL}\u00A01,234.50`],
  [`${DIRHAM_SYMBOL}\u00A025.50`, `${DIRHAM_SYMBOL}\u00A025.50`],
  ['€25.50', '€25.50'],
  ['Market price', 'Market price'],
  ['', '—'],
  [null, '—'],
])('displays %p without altering its amount or other currencies', (input, expected) => {
  expect(displayPrice(input)).toBe(expected);
});
