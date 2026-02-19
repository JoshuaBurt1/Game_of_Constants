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
  if (n === 1) return [{ token: "1", stableId: "sq-0-0-0", originalDigit: "1", isSymbol: false }];

  // 1. Calculate k and offset
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);
  
  let x, y;
  if (offset <= k + 1) { 
      // Mapping from the provided shell logic
      x = k;          
      y = offset - 1; 
  } else {
      let xCoord = k - (offset - (k + 1));
      x = xCoord;     
      y = k;          
  }

  // 2. Map coordinates to R and C (applying the +1 shift observed in examples)
  const R = x + 1;
  const C = y + 1;

  const prod = R * C;
  const sum = R + C;

  let prodStr = prod.toString();
  // Pad the sum with a leading zero if it's shorter than the product
  let sumStr = sum.toString().padStart(prodStr.length, '0');

  // Spacer logic for vertical alignment based on string lengths
  const spacers = [
    ...Array(R.toString().length).fill(" "), 
    "×", 
    ...Array(C.toString().length).fill(" "), 
    "="
  ];
  let sign = "+";
  if (offset>k) {
      offset = R-1;
      k = C;
      sign = "-"
  }
  else{
    offset = C;
  }

  // 3. Construct the lines array
  const lines = [
    [n, "=", k, "×", k, sign, offset, "col:", C, "row:", R],
    [C, "×", R, "=", prodStr],
    [C, "+", R, "=", sumStr],
    [...spacers, prod + sum] 
  ];

  // 4. Transform into the tokenized structure
  return lines.flatMap((line, lineIdx) => {
    const rowTokens = line.flatMap((val, valIdx) => {
      const chars = digitize(val);
      return chars.map((char, charIdx) => ({
        token: char,
        stableId: `sq-${lineIdx}-${valIdx}-${charIdx}`, 
        originalDigit: char,
        isSymbol: SYMBOLS.includes(char) || isNaN(parseInt(char))
      }));
    });
    // Return the row tokens followed by null to signify a line break
    return [...rowTokens, null];
  });
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