import { SYMBOLS } from './constants';

export const digitize = (value) => {
  if (value === null) return [null];
  if (value === " ") return [" "]; 
  if (["row:", "col:", "Layer"].includes(value)) return [value];
  if (typeof value === 'number') return value.toString().split('');
  if (typeof value === 'string' && /^\d+$/.test(value)) return value.split('');
  return [value.toString()];
};

export const getPermutations = (str) => {
  if (!str || str.length <= 1) return [str];
  let perms = [];
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    let remainingChars = str.slice(0, i) + str.slice(i + 1);
    for (let p of getPermutations(remainingChars)) {
      perms.push(char + p);
    }
  }
  return Array.from(new Set(perms));
};

export const getSquareShellData = (n) => {
  if (n <= 0) return [];
  if (n === 1) return [{ token: "1", stableId: "sq-0-1-0", originalDigit: "1", isSymbol: false }];
  
  // 1. Initial k and offset
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);

  // 2. Apply "Negative Offset" rule: if offset > k, move to the next square
  if (offset > k) {
    k = k + 1;
    offset = n - (k * k); // results in a negative value or zero
  }

  // 3. Calculate R and C
  // For n=623, k=25, offset=-2: R=24, C=26
  let R, C;
  if (offset >= 0) {
    // Standard L-shell logic (Positive)
    R = (offset <= k) ? offset : k;
    C = k + 1;
  } else {
    // Negative offset logic
    // Formula derived from Row 24, Col 26 for n=623 (k=25, off=-2)
    R = (k + 1) + offset; 
    C = k + 1;
  }

  const prod = R * C;
  const sum = R + C;

  let prodStr = prod.toString();
  let sumStr = sum.toString().padStart(prodStr.length, '0');

  // Spacer logic for visual alignment
  const spacers = [...Array(R.toString().length).fill(" "), "×", ...Array(C.toString().length).fill(" "), "="];

  const lines = [
    [n, "=", k, "×", k, ...(offset >= 0 ? ["+"] : []), offset, "row:", R, "col:", C],
    [R, "×", C, "=", prodStr],
    [R, "+", C, "=", sumStr],
    [...spacers, prod + sum] 
  ];

  return lines.flatMap((line, lineIdx) => [
    ...line.flatMap((val, valIdx) => {
      const chars = digitize(val);
      return chars.map((char, charIdx) => ({
        token: char,
        stableId: `sq-${lineIdx}-${valIdx}-${charIdx}`, 
        originalDigit: char,
        isSymbol: SYMBOLS.includes(char)
      }));
    }),
    null 
  ]);
};

export const getHexagonData = (N) => {
  let layer = Math.ceil((3 + Math.sqrt(9 - 12 * (1 - N))) / 6);
  let s = layer - 1;
  let hexSum = 3 * s * s - 3 * s + 1;
  let offset = N - hexSum;

  const lines = [[N], [6, "⬡", hexSum, "+", offset], ["Layer", layer]];

  return lines.flatMap((line, lineIdx) => [
    ...line.flatMap((val, valIdx) => {
      const chars = digitize(val);
      return chars.map((char, charIdx) => ({
        token: char,
        stableId: `hex-${lineIdx}-${valIdx}-${charIdx}`,
        originalDigit: char,
        isSymbol: SYMBOLS.includes(char)
      }));
    }),
    null
  ]);
};