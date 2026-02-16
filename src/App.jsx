import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './App.css';

// --- DATA MAPS & UTILS ---
const ZODIAC_MAPS = {
  "Hebrew": {"Rat":292, "Ox":506, "Tiger":142, "Rabbit":653, "Dragon":510, "Snake":358, "Horse":126, "Goat":77, "Monkey":186, "Rooster":336, "Dog": 52, "Pig":225},
  "Ancient Greek": {"Rat":640, "Ox":672, "Tiger":623, "Rabbit":470, "Dragon":975, "Snake":780, "Horse":440, "Goat":71, "Monkey":397, "Rooster":1256, "Dog": 1270, "Pig":800}
};

const ZODIAC_NAMES = {
  "Hebrew": {"Rat": "עַכְבָּר", "Ox":"שׁוֹר", "Tiger":"חִדֶּקֶל", "Rabbit":"אַרְנֶבֶת", "Dragon":"תַנִּין", "Snake":"נָחָשׁ", "Horse":"סווס", "Goat":"עֵז", "Monkey":"קוף", "Rooster":"שֶׂכְוִי", "Dog":"כֶּלֶב", "Pig":"חזיר"},
  "Ancient Greek": {"Rat": "μῦς", "Ox":"βοῦς", "Tiger":"Τίγρις", "Rabbit":"κόνικλος", "Dragon":"δράκων", "Snake":"ὄφις", "Horse":"ἵππος", "Goat":"αἴξ", "Monkey":"πίθηκος", "Rooster":"ἀλέκτωρ", "Dog":"Κύων", "Pig":"σῦς"}
};

const EQUATION_SETS = [
  { id: "reduced_planck", members: ["ℎ", "ℏ", "2π"]},
  { id: "mass_energy_equivalence", members: ["(1/c)^2", "ℏ", "ℏ/c^2"]},
  { id: "newtonian_gravity", members: ["G", "κ", "c^2"]},
  /*
  { id: "fine_structure", members: ["α", "1/α", "μ0", "ε0", "c"] },
  { id: "quantum_gravity", members: ["G", "ℏ", "c"] }*/
];

const CONSTANTS = {
  PLANCK: {
    "ℏ": { sign:"", val: "1.054571817", mult: "10", mag: "-", exp: "34", unit: " J·s" },
    "ℎ": { sign:"", val: "6.6260", mult: "10", mag: "-", exp: "34", unit: " J·s" },
    "ℏ/c^2": { sign:"", val: "1.173369", mult: "10", mag: "-", exp: "51", unit: " kg·m/s" },
    "ℎ/c^2": { sign:"", val: "7.3724192313", mult: "10", mag: "-", exp: "51", unit: " kg·m/s" },
    "2π": {sign:"", val: "2*3.1415926535", multi: "", mag: "", exp: "", unit: ""}
  },
  LIGHT: {
    "c^2": { sign:"", val: "8.9875517873681764", mult: "10", mag: "", exp: "16", unit: " m²/s²" },
    "c": { sign:"", val: "299792458", mult: "", mag: "", exp: "", unit: " m/s" },
    "1/c": { sign:"", val: "3.3335640951", mult: "10", mag: "-", exp: "9", unit: " s/m" },
    "(1/c)^2": { sign:"", val: "1.11265005", mult: "10", mag: "-", exp: "17", unit: " s²/m²" },
    "(1/c)^4": { sign:"", val: "1.2379901472", mult: "10", mag: "-", exp: "34", unit: " s²/m²" }
  },
  GRAVITY: {
    "G": { sign:"", val: "6.6743", mult: "10", mag: "-", exp: "11", unit: " m³/kg·s²" },
    "F": { sign:"", val: "6.6743", mult: "10", mag: "-", exp: "11", unit: " m³/kg·s²" },
    "κ": { sign:"", val: "2.076647", mult: "10", mag: "-", exp: "43", unit: " s²/m·kg" },
    "G^2": { sign:"", val: "4.454628049", mult: "10", mag: "-", exp: "21", unit: " m⁶/kg²·s⁴" }
  },
  FINE_STRUCTURE: {
    "1/α": { sign:"", val: "137.035999", mult: "", mag: "", exp: "", unit: "" },
    "α": { sign:"", val: "7.297352", mult: "10", mag: "-", exp: "3", unit: "" },
    "√α": { sign:"", val: "8.542453", mult: "10", mag: "-", exp: "2", unit: "" },
    "√(1/α)": { sign:"", val: "11.706237", mult: "", mag: "", exp: "", unit: "" }
  },
  MAGNETIC: {
    "μ0": { sign:"", val: "1.25663706", mult: "10", mag: "-", exp: "6", unit: " N/A²" }
  },
  ELECTRIC: {
    "ε0": { sign:"", val: "8.85418782", mult: "10", mag: "-", exp: "12", unit: " F/m" }
  },
  BOLTZMANN: {
    "kB": { sign:"", val: "1.380649", mult: "10", mag: "-", exp: "23", unit: " J/K" }
  },
  TEMPERATURE: {
    "T": { sign:"-", val: "273.15", mult: "", mag: "", exp: "", unit: " °C" }
  }
};

const SYMBOLS = ["=", "×", "+", "row:", "col:", "⬡", "Layer", " "];

const PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const digitize = (value) => {
  if (value === null) return [null];
  if (value === " ") return [" "]; 
  if (["row:", "col:", "Layer"].includes(value)) return [value];
  
  if (typeof value === 'number') return value.toString().split('');
  
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value.split('');
  }

  return [value.toString()];
};

const getPermutations = (str) => {
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

const getSquareShellData = (n) => {
  if (n <= 0) return [];
  if (n === 1) return [{ token: "1", stableId: "sq-0-1-0", originalDigit: "1", isSymbol: false }];
  
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);
  const R = Math.floor((offset <= k + 1) ? k : k - (offset - (k + 1))) + 1;
  const C = Math.floor((offset <= k + 1) ? offset - 1 : k) + 1;
  const prod = R * C;
  const sum = R + C;

  // Calculate string lengths for padding
  let prodStr = prod.toString();
  let sumStr = sum.toString();
  if (sumStr.length < prodStr.length) {
    sumStr = sumStr.padStart(prodStr.length, '0');
  }

  const spacers = [...Array(R.toString().length).fill(" "), "×", ...Array(C.toString().length).fill(" "), "="];

  const lines = [
    [n, "=", k, "×", k, "+", offset, "row:", R, "col:", C],
    [C, "×", R, "=", prodStr],
    [C, "+", R, "=", sumStr],
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

const getHexagonData = (N) => {
  let layer = Math.ceil((3 + Math.sqrt(9 - 12 * (1 - N))) / 6);
  let s = layer - 1;
  let hexSum = 3 * s * s - 3 * s + 1;
  let offset = N - hexSum;

  const lines = [
    [N],
    [6, "⬡", hexSum, "+", offset], 
    ["Layer", layer]
  ];

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

// --- SUB-COMPONENT: SINGLE GRID ---
const GridDisplay = ({ gridType, tokens, selections, setSelections, activeColor, isDragging, setIsDragging, binaryMaps, setBinaryMaps, boxSelections, setBoxSelections, SYMBOLS }) => {
  
  const expandedData = useMemo(() => {
    let result = [];
    if (!tokens) return [];
    
    tokens.forEach((item, baseIdx) => {
      const binaryKey = `${gridType}-${baseIdx}`;
      // Safe check: handle if item is object OR raw value
      const currentVal = item?.token !== undefined ? item.token : item;

      if (item === null) {
        result.push({ token: null, baseIdx });
      } else if (item.isSymbol) {
        result.push({ ...item, baseIdx, subIdx: 0 });
      } 
      else if (binaryMaps[binaryKey]) {
        const binStr = parseInt(currentVal).toString(2);
        binStr.split('').forEach((bit, bIdx) => {
          result.push({ ...item, token: bit, baseIdx, subIdx: bIdx, isBinary: true });
        });
      } else {
        result.push({ ...item, baseIdx, subIdx: 0, isBinary: false });
      }
    });
    return result;
  }, [tokens, binaryMaps, gridType]);

  const rows = useMemo(() => {
    return expandedData.reduce((acc, curr) => {
      if (curr.token === null) acc.push([]);
      else acc[acc.length - 1].push({ ...curr });
      return acc;
    }, [[]]);
  }, [expandedData]);

  const handleInteraction = (item) => {
    if (item.isSymbol) return;
    const binaryKey = `${gridType}-${item.baseIdx}`;

    if (activeColor === 'BIN') {
      setBinaryMaps(prev => ({ ...prev, [binaryKey]: true }));
      return;
    }
    
    if (activeColor === 'DEC') {
      if (item.isBinary) {
        const boxKey = `${gridType}-${item.baseIdx}-${item.subIdx}`;
        setBoxSelections(prev => {
          const next = { ...prev };
          if (next[boxKey]) delete next[boxKey];
          else next[boxKey] = item.token;
          return next;
        });
      } else {
        setBinaryMaps(prev => ({ ...prev, [binaryKey]: false }));
      }
      return;
    }

    // Highlight logic using Stable ID
    const selectionKey = item.stableId;
    setSelections(prev => {
      const newMap = { ...prev };
      const currentGridSelection = { ...(newMap[gridType] || {}) };
      
      // Toggle color
      currentGridSelection[selectionKey] = currentGridSelection[selectionKey] === activeColor ? null : activeColor;
      
      newMap[gridType] = currentGridSelection;
      return newMap;
    });
  };

  return (
    <div className="grid-root">
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="grid-row">
          {row.map((item, i) => {
            const isSpacerString = item.token === " ";
            const isSymbolToken = SYMBOLS.includes(item.token) || item.isSymbol;
            const shouldHide = isSpacerString || (rIdx === 3 && isSymbolToken);
            const isSymStyle = isSymbolToken && !isSpacerString;
            
            const selectionKey = item.stableId;
            const boxKey = `${gridType}-${item.baseIdx}-${item.subIdx}`;
            
            const highlightColor = (!isSymStyle && !shouldHide) ? (selections[gridType] || {})[selectionKey] : null;
            const isBoxed = boxSelections[boxKey] !== undefined && boxSelections[boxKey] !== null;

            // Per user instructions: only blue if orthogonal
            const isOrthogonalMP = item.isMP && item.isOrthogonal;

            const classNames = [
              'grid-token',
              item.isBinary ? 'binary' : 'decimal',
              isSymStyle ? 'symbol' : 'interactive',
              shouldHide ? 'hidden' : '',
              isBoxed ? 'boxed' : '',
              isOrthogonalMP ? 'mp-orthogonal' : ''
            ].join(' ');

            return (
              <div
                key={`${selectionKey}-${i}`}
                className={classNames}
                onMouseDown={() => { if(!isSymStyle && !shouldHide) { setIsDragging(true); handleInteraction(item); }}}
                onMouseEnter={() => { if (isDragging && !isSymStyle && !shouldHide) handleInteraction(item); }}
                style={{
                  /* We keep highlightColor inline since it is a dynamic user selection */
                  backgroundColor: highlightColor || undefined 
                }}
              >
                {item.token}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// --- GAME COMPONENT ---
const GameComponent = ({ settings, setStep }) => {
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];

  // 2. State
  const [selections, setSelections] = useState({});
  const [binaryMaps, setBinaryMaps] = useState({}); 
  const [boxSelections, setBoxSelections] = useState({}); 
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [gridTokens, setGridTokens] = useState({}); 
  const [cardOverrides, setCardOverrides] = useState({}); // { symbol: { isOrganized: bool, isRounded: bool } }

  const handleRoundClick = (symbol) => {
    setCardOverrides(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], isOrganized: !prev[symbol]?.isOrganized }
    }));
  };

  const handlePruneClick = (symbol) => {
    setCardOverrides(prev => ({
      ...prev,
      [symbol]: { ...prev[symbol], isRounded: !prev[symbol]?.isRounded }
    }));
  };

  const handleSubmitScore = async () => {
    try {
      const selectionsArray = Object.values(selections).flatMap(gridMap => Object.keys(gridMap));
      const allGridTokens = Object.values(gridTokens).flat();
      
      const remainingDigits = allGridTokens
        .filter(token => token && token.stableId && !token.isSymbol && !selectionsArray.includes(token.stableId))
        .map(token => token.originalDigit || token.token);

      const performance = matchResults.map(m => ({
        symbol: m.symbol,
        percent: m.percent.toFixed(1)
      }));

      const highscoreData = {
        topic: settings.topic || "General",
        word: settings.word,
        language: settings.language,
        grids: settings.gridTypes, // <--- Add this line
        results: performance,
        unusedDigits: remainingDigits,
        timestamp: serverTimestamp(), 
      };

      await addDoc(collection(db, "highscores"), highscoreData);
      alert("Score submitted successfully!");
      setStep('TOPIC'); 
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error submitting score.");
    }
  };

  // 3. Effects
  useEffect(() => {
    const initial = {};
    settings.gridTypes.forEach(type => {
      initial[type] = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
    });
    setGridTokens(initial);
  }, [wordVal, settings.gridTypes]);

  // 4. Memos
  const boxedData = useMemo(() => {
    const boxedKeys = Object.keys(boxSelections);
    if (boxedKeys.length === 0) return null;
    const [gridType] = boxedKeys[0].split('-');

    const sortedKeys = boxedKeys.sort((a, b) => {
      const [, aBase, aSub] = a.split('-').map(Number);
      const [, bBase, bSub] = b.split('-').map(Number);
      return aBase !== bBase ? aBase - bBase : aSub - bSub;
    });

    const binaryString = sortedKeys.map(k => boxSelections[k]).join('');
    
    const allPerms = getPermutations(binaryString);

    const validBinaryStrings = allPerms.filter(bin => 
      bin.length === 1 || !bin.startsWith('0')
    );

    const decimalPerms = validBinaryStrings.map(bin => parseInt(bin, 2).toString());

    return {
      gridType,
      binaryString,
      perms: Array.from(new Set(decimalPerms)).sort((a, b) => b - a)
    };
  }, [boxSelections]);

  const resetToOriginal = () => {
    // 1. Restore tokens to the original word value calculations
    const restoredTokens = {};
    settings.gridTypes.forEach(type => {
      restoredTokens[type] = type === "Square Shell" 
        ? getSquareShellData(wordVal) 
        : getHexagonData(wordVal);
    });
    setGridTokens(restoredTokens);

    // 2. Clear all user-driven states
    setBinaryMaps({});
    setBoxSelections({});
    setSelections({});
  };

  const handlePermutationClick = (targetDecimal) => {
    if (!boxedData) return;
    const { gridType } = boxedData;
    const currentTokens = [...gridTokens[gridType]];

    const selectionsByIndex = Object.keys(boxSelections).reduce((acc, key) => {
      const [_, baseIdx, subIdx] = key.split('-').map(Number);
      if (!acc[baseIdx]) acc[baseIdx] = [];
      acc[baseIdx].push(subIdx);
      return acc;
    }, {});

    const involvedIndices = Object.keys(selectionsByIndex).map(Number).sort((a, b) => a - b);
    const firstIdx = involvedIndices[0];

    let newTokens = [];
    let newBinaryFlags = {};

    currentTokens.forEach((item, idx) => {
      // Determine the raw value (works if item is an object or a legacy string)
      const currentVal = item?.token !== undefined ? item.token : item;

      if (involvedIndices.includes(idx)) {
        const fullBin = parseInt(currentVal).toString(2);
        const selectedSubs = selectionsByIndex[idx];
        
        // 1. Place the converted Decimal result at the first available slot
        if (idx === firstIdx) {
          newTokens.push({
            token: targetDecimal,
            stableId: `conv-dec-${gridType}-${idx}-${Date.now()}`,
            originalDigit: targetDecimal,
            isSymbol: false
          });
        }

        // 2. Map remaining bits individually as new Objects to preserve them
        const remainingBitsArray = fullBin.split('').filter((_, sub) => !selectedSubs.includes(sub));
        
        remainingBitsArray.forEach((bit, bIdx) => {
          newTokens.push({
            token: bit,
            stableId: `leftover-${gridType}-${idx}-${bIdx}-${Date.now()}`,
            originalDigit: bit,
            isSymbol: false
          });
          // Flag as binary so it renders as a circle
          newBinaryFlags[newTokens.length - 1] = true;
        });
      } else {
        // 3. Keep existing token object
        newTokens.push(item);
        if (binaryMaps[`${gridType}-${idx}`]) {
          newBinaryFlags[newTokens.length - 1] = true;
        }
      }
    });

    setGridTokens(prev => ({ ...prev, [gridType]: newTokens }));
    setBoxSelections({});
    
    setBinaryMaps(prev => {
      const next = {};
      // Carry over binary maps for other grids
      Object.keys(prev).forEach(k => {
        if (!k.startsWith(gridType)) next[k] = prev[k];
      });
      // Apply new flags for the updated indices in this grid
      Object.keys(newBinaryFlags).forEach(newIdx => {
        next[`${gridType}-${newIdx}`] = true;
      });
      return next;
    });
  };
  
  const clearAllHighlights = () => setSelections({});
  
  // --- Updated Math logic in useMemo ---
  const { results: matchResults, colorDigitMap, symbolsToElevate, activeSetIds } = useMemo(() => {
    const colorMap = {};
    PALETTE.forEach(c => colorMap[c] = []);

    // 1. Collect highlighted digits
    settings.gridTypes.forEach(type => {
      const tokens = gridTokens[type] || [];
      const gridSelections = selections[type] || {};
      tokens.forEach((item) => {
        if (!item || !item.stableId) return;
        const color = gridSelections[item.stableId];
        if (color && PALETTE.includes(color)) {
          colorMap[color].push(item.originalDigit); 
        }
      });
    });

    // 2. Base Matches with Lookahead Logic
    const allResults = Object.entries(CONSTANTS).flatMap(([category, group]) => 
      Object.entries(group).map(([symbol, rawData]) => {
        const override = cardOverrides[symbol] || {};
        let data = { ...rawData };
        let maxPercent = 0;
        let bestColor = null;

        PALETTE.forEach(color => {
          let userBank = [...(colorMap[color] || [])];
          let matches = 0;
          let totalPotential = 0;

          const segments = [
            { str: data.val || "", type: 'val' },
            { str: data.mult || "", type: 'mult' },
            { str: data.exp || "", type: 'exp' }
          ];

          // Create lookahead for ORGANIZE logic
          const futureDigits = (segments[1].str + segments[2].str).replace(/[^0-9]/g, '').split('');

          segments.forEach((segment, sIdx) => {
            let active = true;
            segment.str.split('').forEach(char => {
              const isDigit = /[0-9]/.test(char);
              if (isDigit) {
                totalPotential++;
                const bankIdx = userBank.indexOf(char);
                const isNeededLater = futureDigits.includes(char);

                if (override.isOrganized) {
                  if (active && bankIdx !== -1) {
                    matches++;
                    userBank.splice(bankIdx, 1);
                  } else if (active && isNeededLater) {
                    // Skip in val/mult because we need it later; keep sequence alive
                    active = true; 
                  } else {
                    active = false;
                  }
                } else {
                  if (bankIdx !== -1) {
                    matches++;
                    userBank.splice(bankIdx, 1);
                  }
                }
                // Cleanup lookahead as we progress
                if (sIdx < 2 && isNeededLater) {
                  const fIdx = futureDigits.indexOf(char);
                  futureDigits.splice(fIdx, 1);
                }
              }
            });
          });

          const percent = totalPotential > 0 ? (matches / totalPotential) * 100 : 0;
          if (percent > maxPercent) {
            maxPercent = percent;
            bestColor = color;
          }
        });

        if (override.isRounded && maxPercent > 0) maxPercent = 100.0;

        return { symbol, data, percent: maxPercent, dominantColor: bestColor || '#333', category };
      })
    );

    // 3. Activation Logic (2+ perfect matches in a set)
  // 3. Activation Logic (2+ perfect matches in a set)
    const perfectSymbols = allResults.filter(r => r.percent === 100).map(r => r.symbol);
    const elevated = new Set();
    const activeIds = [];

    EQUATION_SETS.forEach(set => {
      const solvedCount = set.members.filter(m => perfectSymbols.includes(m)).length;
      // Condition: If 2 or more constants in this equation are 100%
      if (solvedCount >= 2) {
        activeIds.push(set.id);
        // Mark ALL members of this equation as "elevated" to bring them to top
        set.members.forEach(m => elevated.add(m));
      }
    });

    // 4. Final Sort
    const sorted = allResults.sort((a, b) => {
      const aIsPerfect = a.percent === 100;
      const bIsPerfect = b.percent === 100;
      const aIsElevated = elevated.has(a.symbol);
      const bIsElevated = elevated.has(b.symbol);

      // Tier 1: Perfect matches ALWAYS stay at the very top
      if (aIsPerfect !== bIsPerfect) return aIsPerfect ? -1 : 1;

      // Tier 2: If neither/both are perfect, prioritize those in an Active Equation Set
      if (aIsElevated !== bIsElevated) return aIsElevated ? -1 : 1;

      // Tier 3: Within the same tier, sort by percentage descending
      return b.percent - a.percent;
    });

    return { results: sorted, colorDigitMap: colorMap, symbolsToElevate: elevated, activeSetIds: activeIds };
  }, [selections, gridTokens, settings.gridTypes, cardOverrides]);

  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4);
  const toolBtn = { border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold', padding: '6px 10px', fontSize: '0.7rem' };
  const resetBtnStyle = { backgroundColor: '#2a2a2a', color: '#888', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' };

  return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px', fontFamily: 'monospace', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }} onMouseUp={() => setIsDragging(false)}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '60px', alignItems: 'flex-start', maxWidth: '1400px', width: '100%' }}>
          {/* --- LEFT AREA: SCROLLABLE COLUMN --- */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ margin: 0, letterSpacing: '1px', fontSize: '2rem' }}>
                {settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})
              </h2>
            </div>
            {/* This wrapper provides the X-Scroll specifically for the grids */}
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'thin', scrollbarColor: '#444 transparent' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', width: 'fit-content' }}>
                {settings.gridTypes.map(type => (
                  <div key={type}>
                    <h5 style={{ color: '#444', marginBottom: '15px', fontSize: '0.8rem', letterSpacing: '2px' }}>
                      {type.toUpperCase()}
                    </h5>
                    <GridDisplay
                      gridType={type} tokens={gridTokens[type]} selections={selections} setSelections={setSelections}
                      binaryMaps={binaryMaps} setBinaryMaps={setBinaryMaps} activeColor={activeColor}
                      boxSelections={boxSelections} setBoxSelections={setBoxSelections}
                      isDragging={isDragging} setIsDragging={setIsDragging} SYMBOLS={SYMBOLS}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons remain visible below the scrollable area */}
            <div style={{ marginTop: '40px', display: 'flex', gap: '15px', borderTop: '1px solid #333', paddingTop: '20px' }}>
              <button onClick={() => setStep('TOPIC')} style={resetBtnStyle}>Home</button>
              <button onClick={clearAllHighlights} style={resetBtnStyle}>Clear All Highlights</button>
              <button onClick={resetToOriginal} style={resetBtnStyle}>Reset</button>
              <button onClick={handleSubmitScore} style={{ ...resetBtnStyle, marginLeft: 'auto'}}>Submit Scores</button>
            </div>
          </div>

          {/* --- RIGHT AREA: STICKY PANEL --- */}
          <div style={{ width: '420px', flexShrink: 0, backgroundColor: `rgb(${brightness}, ${brightness + 5}, ${brightness + 10})`, padding: '25px', borderRadius: '16px', 
            maxHeight: '85vh', overflowY: 'auto', position: 'sticky', top: '40px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10
          }}>
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'center' }}>
            {PALETTE.map(color => (
              <div key={color} onClick={() => setActiveColor(color)} style={{ width: '28px', height: '28px', backgroundColor: color, borderRadius: '50%', cursor: 'pointer', border: activeColor === color ? '2px solid white' : 'none' }} />
            ))}
            <div style={{ width: '1px', height: '24px', background: '#444', margin: '0 8px' }} />
            <button onClick={() => setActiveColor('BIN')} style={{ ...toolBtn, backgroundColor: activeColor === 'BIN' ? '#3b82f6' : '#333' }}>BIN</button>
            <button onClick={() => setActiveColor('DEC')} style={{ ...toolBtn, backgroundColor: activeColor === 'DEC' ? '#3b82f6' : '#333' }}>DEC</button>
          </div>
          {activeColor === 'DEC' && boxedData && (
            <div style={{ border: '1px solid #10b981', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px' }}>SELECT PERMUTATION TO CONVERT GRID:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {boxedData.perms.map((p, idx) => (
                  <button key={idx} onClick={() => handlePermutationClick(p)} style={{ padding: '6px 12px', background: '#10b981', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
            </div>
          )}
          {matchResults.map((m, i) => {
            const isPerfect = m.percent === 100;
            const isElevated = symbolsToElevate.has(m.symbol) && !isPerfect;
            const override = cardOverrides[m.symbol] || {};

            // 1. Updated Badge Style: Monospace font, white color, and inline layout
            const setBadgeStyle = {
              fontFamily: 'monospace',
              fontSize: '1rem', // Match the main digit size
              color: 'white',   // Changed from black
              letterSpacing: '1px',
              display: 'inline-block',
              textTransform: 'uppercase',
              marginRight: 'auto' // Push other items away
            };

            const parentSetName = isElevated 
              ? EQUATION_SETS.find(s => s.members.includes(m.symbol) && activeSetIds.includes(s.id))?.id 
              : null;
                        
            const shimmerKeyframes = `
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `;

            // We need a fresh bank for the visual renderer
            const visualBank = [...(colorDigitMap[m.dominantColor] || [])];
            
            // --- UPDATED RENDERER ---
            // We track 'active' status to handle the "prioritize/organize" logic visually
            let isSequenceActive = true; 

            const renderDigits = (str, isExponent = false) => {
              if (!str) return null;
              
              return str.split('').map((char, idx) => {
                const isDigit = /[0-9]/.test(char);
                const isSign = /[-+×.]/.test(char); 
                
                let color = 'rgba(255,255,255,0.15)'; // Default dimmed
                let textDecoration = 'none';
                
                if (isDigit) {
                  const bankIdx = visualBank.indexOf(char);
                  
                  if (override.isOrganized) {
                    // Prioritize logic: only highlight if we have the digit AND the sequence isn't broken
                    if (isSequenceActive && bankIdx !== -1) {
                      color = '#ffffff';
                      visualBank.splice(bankIdx, 1);
                    } else {
                      isSequenceActive = false; // Break sequence for this segment
                      if (override.isRounded) textDecoration = 'line-through';
                    }
                  } else {
                    // Standard logic: highlight wherever it matches
                    if (bankIdx !== -1) {
                      color = '#ffffff';
                      visualBank.splice(bankIdx, 1);
                    }
                  }
                } else if (isSign) {
                  // Signs stay bright only if the sequence leading to them is active
                  color = isSequenceActive ? '#ffffff' : 'rgba(255,255,255,0.15)';
                }
                
                return (
                  <span key={idx} style={{ color, textDecoration, transition: 'all 0.2s' }}>
                    {char}
                  </span>
                );
              });
            };

            // Reset sequence active state between major segments (Val -> Mult/Exp)
            // This allows the "1" to fail in Val but succeed in Mult
            const valDigits = renderDigits((m.data.sign || "") + m.data.val);
            isSequenceActive = true; // Reset for the next logical block
            
            const multDigits = m.data.mult ? renderDigits(m.data.mult) : null;
            const expDigits = m.data.exp ? renderDigits(m.data.exp) : null;

            // 2. Conditional Styles for the 100% match
            const cardStyle = {
              padding: '18px',
              borderRadius: '10px',
              marginBottom: '15px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.4s ease',
              
              // LOGIC: Highlight border white if elevated, unless it's 100% (Perfect)
              border: isPerfect 
                ? `1px solid ${m.dominantColor}` 
                : (isElevated ? `1px solid white` : '1px solid rgba(255,255,255,0.05)'),
                
              boxShadow: isPerfect 
                ? `0 0 15px ${m.dominantColor}40` 
                : (isElevated ? '0 0 10px rgba(255,255,255,0.2)' : 'none'),
                
              backgroundColor: isPerfect ? 'transparent' : (m.percent > 0 ? `${m.dominantColor}15` : 'rgba(255,255,255,0.03)'),
              backgroundImage: isPerfect 
                ? `linear-gradient(90deg, ${m.dominantColor}15 0%, ${m.dominantColor}40 50%, ${m.dominantColor}15 100%)` 
                : 'none',
              backgroundSize: isPerfect ? '200% 100%' : 'auto',
              animation: isPerfect ? 'shimmer 2s infinite linear' : 'none'
            };

            const miniToolBtn = (active, activeColor = '#10b981') => ({
              padding: '2px 8px',
              fontSize: '0.6rem',
              background: active ? activeColor : 'rgba(255,255,255,0.05)',
              border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.1)'}`,
              color: active ? 'white' : 'rgba(255,255,255,0.4)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              letterSpacing: '0.5px'
            });

           return (
            <div key={i} style={cardStyle}>
              <style>{shimmerKeyframes}</style>

              {/* HEADER SECTION: Symbol & Buttons/Percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                
                {/* LEFT: Constant Symbol and Set Name */}
                <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
                  {parentSetName && (
                    <div style={{ ...setBadgeStyle, fontSize: '0.7rem', marginBottom: '2px', opacity: 0.8 }}>
                      {parentSetName.replace(/_/g, ' ')}
                    </div>
                  )}
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', lineHeight: '1' }}>
                    {m.symbol}
                  </span>
                </div>

                {/* RIGHT: Actions and Percentage (Stacked to avoid overlap) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', zIndex: 10 }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleRoundClick(m.symbol)} style={miniToolBtn(override.isOrganized)}>ORGANIZE</button>
                    {override.isOrganized && (
                      <button onClick={() => handlePruneClick(m.symbol)} style={miniToolBtn(override.isRounded, '#ef4444')}>ROUND</button>
                    )}
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: isPerfect ? '#fff' : m.dominantColor, 
                    fontWeight: 'bold',
                    lineHeight: '1'
                  }}>
                    {m.percent.toFixed(1)}% {isPerfect && '★'}
                  </span>
                </div>
              </div>

              {/* VALUE SECTION: Main Digits Display */}
              <div style={{ 
                marginTop: '4px', // Tightened gap between symbol and value
                fontFamily: 'monospace', 
                fontSize: '1rem', 
                position: 'relative', 
                zIndex: 1,
                paddingTop: '4px',
                borderTop: '1px solid rgba(255,255,255,0.05)' // Subtle separator
              }}>
                {valDigits}
                {m.data.mult && (
                  <>
                    <span style={{ color: isSequenceActive ? 'white' : 'rgba(255,255,255,0.15)' }}>{" × "}</span>
                    <span style={{ position: 'relative' }}>
                      {multDigits}
                      <sup style={{ fontSize: '0.75rem', marginLeft: '2px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>{m.data.mag}</span>
                        {expDigits}
                      </sup>
                    </span>
                  </>
                )}
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.15)', marginLeft: '8px' }}>
                  {m.data.unit}
                </span>
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState('TOPIC'); 
  const [settings, setSettings] = useState({ topic: '', word: '', language: '', gridTypes: [] });

  const toggleGridType = (type) => {
    setSettings(prev => ({
      ...prev,
      gridTypes: prev.gridTypes.includes(type) ? prev.gridTypes.filter(t => t !== type) : [...prev.gridTypes, type]
    }));
  };

  const menuStyle = { textAlign: 'center', paddingTop: '80px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: 'white' };
  const menuBtn = { display: 'block', margin: '10px auto', padding: '12px 24px', cursor: 'pointer', border: 'none', borderRadius: '6px', width: '220px', backgroundColor: '#333', color: 'white' };

  const highscoreBtn = { ...menuBtn};

  if (step === 'HIGHSCORES') return <HighscoresView onBack={() => setStep('TOPIC')} />;

  if (step === 'TOPIC') return (
    <div style={menuStyle}>
      {/* Highscore entry point */}
      <button style={highscoreBtn} onClick={() => setStep('HIGHSCORES')}>View Highscores</button>
      
      <div style={{ width: '40px', height: '1px', background: '#333', margin: '20px auto' }} />
      
      <h2>Topic</h2>
      {["Chinese Zodiac"].map(t => (
        <button key={t} style={menuBtn} onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}>
          {t}
        </button>
      ))}
    </div>
  );

  if (step === 'WORD') return (
    <div style={menuStyle}>
      <h2>Select Animal</h2>
      {["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"].map(w => 
        <button key={w} style={menuBtn} onClick={() => { setSettings({...settings, word: w}); setStep('LANG'); }}>{w}</button>
      )}
    </div>
  );

  if (step === 'LANG') return (
    <div style={menuStyle}>
      <h2>Language</h2>
      {["Hebrew", "Ancient Greek"].map(l => <button key={l} style={menuBtn} onClick={() => { setSettings({...settings, language: l}); setStep('GRID'); }}>{l}</button>)}
    </div>
  );

  if (step === 'GRID') return (
    <div style={menuStyle}>
      <h2>Tessellation</h2>
      {["Square Shell", "Hexagon"].map(g => (
        <button key={g} style={{...menuBtn, backgroundColor: settings.gridTypes.includes(g) ? '#3b82f6' : '#333'}} onClick={() => toggleGridType(g)}>
          {g} {settings.gridTypes.includes(g) ? '✓' : ''}
        </button>
      ))}
      <button disabled={settings.gridTypes.length === 0} style={{...menuBtn, marginTop: '30px', backgroundColor: '#10b981', opacity: settings.gridTypes.length === 0 ? 0.5 : 1}} onClick={() => setStep('GAME')}>
        Confirm Selection
      </button>
    </div>
  );

  return <GameComponent settings={settings} setStep={setStep} />;
}

function HighscoresView({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        // 1. Change "createdAt" to "timestamp"
        const q = query(collection(db, "highscores"), orderBy("timestamp", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched Data:", data); // Check your console for this!
        setScores(data);
      } catch (err) {
        console.error("Error fetching scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const cellStyle = { padding: '12px', verticalAlign: 'middle' };
  const badgeStyle = { 
    fontSize: '0.55rem', background: '#333', color: '#888', 
    padding: '2px 6px', borderRadius: '4px', border: '1px solid #444',
    textTransform: 'uppercase', letterSpacing: '0.5px' 
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: '60px', color: 'white' }}>
      <h2>Recent Achievements</h2>
      {loading ? <p>Loading...</p> : (
        <div style={{ maxWidth: '950px', margin: '20px auto', background: '#222', padding: '20px', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444', color: '#888', fontSize: '0.7rem' }}>
                <th style={{ padding: '10px' }}>TOPIC</th>
                <th style={{ padding: '10px' }}>WORD / GRID</th>
                <th style={{ padding: '10px' }}>MATCHES</th>
                <th style={{ padding: '10px' }}>REMAINING</th>
                <th style={{ padding: '10px' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #333' }}>
                  {/* 1. TOPIC */}
                  <td style={{ ...cellStyle, fontSize: '0.8rem', color: '#888' }}>{s.topic}</td>
                  
                  {/* 2. WORD & GRID INFO */}
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{s.word}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>{s.language}</div>
                    {s.grids?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'center' }}>
                        {s.grids.map((g, idx) => <span key={idx} style={badgeStyle}>{g}</span>)}
                      </div>
                    )}
                  </td>

                  {/* 3. MATCHES */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '0.75rem' }}>
                      {s.results?.slice(0, 3).map((res, idx) => (
                        <div key={idx} style={{ color: parseFloat(res.percent) >= 90 ? '#4ade80' : '#aaa' }}>
                          {res.symbol}: <strong>{res.percent}%</strong>
                        </div>
                      )) || "--"}
                    </div>
                  </td>

                  {/* 4. REMAINING */}
                  <td style={{ ...cellStyle, fontSize: '0.7rem', color: '#555', maxWidth: '150px', wordWrap: 'break-word', fontFamily: 'monospace' }}>
                    {s.unusedDigits?.length > 0 ? s.unusedDigits.join(', ') : "None"}
                  </td>

                  {/* 5. DATE */}
                  <td style={{ ...cellStyle, fontSize: '0.7rem', color: '#666' }}>
                    {s.timestamp ? s.timestamp.toDate().toLocaleDateString() : 'Recent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer', background: '#444', border: 'none', color: 'white', borderRadius: '6px' }}>
        Back to Menu
      </button>
    </div>
  );
}

