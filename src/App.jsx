import React, { useState, useEffect, useMemo } from 'react';

// --- DATA MAPS & UTILS ---
const ZODIAC_MAPS = {
  "Hebrew": {"Rat":292, "Ox":506, "Tiger":142, "Rabbit":653, "Dragon":510, "Snake":358, "Horse":126, "Goat":77, "Monkey":186, "Rooster":336, "Dog": 52, "Pig":225},
  "Ancient Greek": {"Rat":640, "Ox":672, "Tiger":623, "Rabbit":470, "Dragon":975, "Snake":780, "Horse":440, "Goat":71, "Monkey":397, "Rooster":1256, "Dog": 1270, "Pig":800}
};

const ZODIAC_NAMES = {
  "Hebrew": {"Rat": "עַכְבָּר", "Ox":"שׁוֹר", "Tiger":"חִדֶּקֶל", "Rabbit":"אַרְנֶבֶת", "Dragon":"תַנִּין", "Snake":"נָחָשׁ", "Horse":"סווס", "Goat":"עֵז", "Monkey":"קוף", "Rooster":"שֶׂכְוִי", "Dog":"כֶּלֶב", "Pig":"חזיר"},
  "Ancient Greek": {"Rat": "μῦς", "Ox":"βοῦς", "Tiger":"Τίγρις", "Rabbit":"κόνικλος", "Dragon":"δράκων", "Snake":"ὄφις", "Horse":"ἵππος", "Goat":"αἴξ", "Monkey":"πίθηκος", "Rooster":"ἀλέκτωρ", "Dog":"Κύων", "Pig":"σῦς"}
};

const CONSTANTS = {
  PLANCK: {"ℏ":1.054571817, "ℎ":6.62607015, "ℏ/c^2":1.17336938491, "ℎ/c^2":7.3724192313},
  LIGHT: {"c^2":8.9875517873681764, "c":299792458,  "1/c":3.3335640951, "(1/c)^2":1.11265005, "(1/c)^4":1.2379901472},
  GRAVITY: {"G":6.6743015, "κ":2.076647, "G^2":44.54628049},
  FINE_STRUCTURE: {"1/α":137.035999, "α":0.007297352, "√α":0.08542453, "√(1/α)":11.706237},
  MAGNETIC: {"μ0":1.25663706},
  ELECTRIC: { "ε0":8.85418782},
  BOLTZMANN: {"kB":1.380649},
  TEMPERATURE: {"T":273.15}
};

const PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const digitize = (value) => {
  if (value === null) return [null];
  if (value === " ") return [" "]; 
  if (["row:", "col:", "Layer"].includes(value)) return [value];
  if (typeof value === 'number') return value.toString().split('');
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
  if (n <= 0) return [0];
  if (n === 1) return [1];
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);
  const R = Math.floor((offset <= k + 1) ? k : k - (offset - (k + 1))) + 1;
  const C = Math.floor((offset <= k + 1) ? offset - 1 : k) + 1;
  const prod = R * C;
  const sum = R + C;
  const spacers = [...Array(R.toString().length).fill(" "), "×", ...Array(C.toString().length).fill(" "), "="];
  const lines = [
    [n, "=", k, "×", k, "+", offset, "row:", R, "col:", C],
    [C, "×", R, "=", prod],
    [C, "+", R, "=", sum],
    [...spacers, prod + sum] 
  ];
  return lines.flatMap(line => [...line.flatMap(digitize), null]);
};

const getHexagonData = (N) => {
  let layer = Math.ceil((3 + Math.sqrt(9 - 12 * (1 - N))) / 6);
  let s = layer - 1;
  let hexSum = 3 * s * s - 3 * s + 1;
  let offset = N - hexSum;
  const lines = [[N, "⬡", hexSum, "+", offset], ["Layer", layer]];
  return lines.flatMap(line => [...line.flatMap(digitize), null]);
};

// --- SUB-COMPONENT: SINGLE GRID ---
const GridDisplay = ({ gridType, tokens, selections, setSelections, activeColor, isDragging, setIsDragging, binaryMaps, setBinaryMaps, boxSelections, setBoxSelections, SYMBOLS }) => {
  
  const expandedData = useMemo(() => {
    let result = [];
    if (!tokens) return [];
    
    tokens.forEach((token, baseIdx) => {
      const binaryKey = `${gridType}-${baseIdx}`;
      if (token === null) {
        result.push({ token: null, baseIdx });
      } else if (SYMBOLS.includes(token)) {
        result.push({ token: token, baseIdx, subIdx: 0, isSymbol: true });
      } 
      else if (binaryMaps[binaryKey]) {
        const binStr = parseInt(token).toString(2);
        binStr.split('').forEach((bit, bIdx) => {
          result.push({ token: bit, baseIdx, subIdx: bIdx, isBinary: true });
        });
      } else {
        token.toString().split('').forEach((digit, dIdx) => {
          result.push({ token: digit, baseIdx, subIdx: dIdx, isBinary: false });
        });
      }
    });
    return result;
  }, [tokens, binaryMaps, gridType, SYMBOLS]);

  const rows = useMemo(() => {
    return expandedData.reduce((acc, curr) => {
      if (curr.token === null) acc.push([]);
      else acc[acc.length - 1].push({ ...curr });
      return acc;
    }, [[]]);
  }, [expandedData]);

  const handleInteraction = (item) => {
    if (SYMBOLS.includes(item.token) || item.isSymbol) return;
    const binaryKey = `${gridType}-${item.baseIdx}`;

    if (activeColor === 'BIN') {
      // Always allow turning a decimal into binary, 
      // even if it's a number we just created.
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

    const selectionKey = `${item.baseIdx}-${item.subIdx}`;
    setSelections(prev => {
      const newMap = { ...prev };
      const currentGridSelection = { ...(newMap[gridType] || {}) };
      currentGridSelection[selectionKey] = currentGridSelection[selectionKey] === activeColor ? null : activeColor;
      newMap[gridType] = currentGridSelection;
      return newMap;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
      {rows.map((row, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {row.map((item, i) => {
            const isSpacerString = item.token === " ";
            const isSymbolToken = SYMBOLS.includes(item.token) || item.isSymbol;
            const shouldHide = isSpacerString || (rIdx === 3 && isSymbolToken);
            const isSymStyle = isSymbolToken && !isSpacerString;
            const selectionKey = `${item.baseIdx}-${item.subIdx}`;
            const boxKey = `${gridType}-${item.baseIdx}-${item.subIdx}`;
            const highlight = (selections[gridType] || {})[selectionKey];
            const isBoxed = boxSelections[boxKey] !== undefined && boxSelections[boxKey] !== null;

            return (
              <div
                key={`${selectionKey}-${i}`}
                onMouseDown={() => { if(!isSymStyle && !shouldHide) { setIsDragging(true); handleInteraction(item); }}}
                onMouseEnter={() => { if (isDragging && !isSymStyle && !shouldHide) handleInteraction(item); }}
                style={{
                  minWidth: isSymStyle ? 'auto' : '32px', height: '32px', padding: isSymStyle ? '0 8px' : '0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: highlight || (isSymStyle || shouldHide ? 'transparent' : '#2a2a2a'),
                  borderRadius: item.isBinary ? '50%' : '4px',
                  fontSize: isSymStyle ? '0.85rem' : (item.isBinary ? '0.9rem' : '1.1rem'),
                  fontWeight: 'bold', color: isSymStyle ? '#555' : 'white',
                  cursor: (isSymStyle || shouldHide) ? 'default' : 'pointer', userSelect: 'none', 
                  border: isBoxed ? '2px solid #3b82f6' : (item.isBinary ? '1px solid rgba(255,255,255,0.2)' : 'none'),
                  boxShadow: isBoxed ? '0 0 8px #3b82f6' : 'none', visibility: shouldHide ? 'hidden' : 'visible'
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
const GameComponent = ({ settings }) => {
  // 1. Move constant data to the top
  const SYMBOLS = ["=", "×", "+", "row:", "col:", "⬡", "Layer", " "];
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];

  // 2. State
  const [selections, setSelections] = useState({});
  const [binaryMaps, setBinaryMaps] = useState({}); 
  const [boxSelections, setBoxSelections] = useState({}); 
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [gridTokens, setGridTokens] = useState({}); 

  // 3. Effects
  useEffect(() => {
    const initial = {};
    settings.gridTypes.forEach(type => {
      initial[type] = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
    });
    setGridTokens(initial);
  }, [wordVal, settings.gridTypes]);

  // 4. Memos
  const decPermutations = useMemo(() => getPermutations(wordVal.toString()).slice(0, 6), [wordVal]);

  const boxedData = useMemo(() => {
    const boxedKeys = Object.keys(boxSelections);
    if (boxedKeys.length === 0) return null;
    const [gridType] = boxedKeys[0].split('-');
    const binaryString = Object.values(boxSelections).join('');
    const binaryPerms = getPermutations(binaryString);
    const decimalPerms = binaryPerms.map(bin => parseInt(bin, 2).toString());

    return {
      gridType,
      binaryString,
      currentDecimal: parseInt(binaryString, 2).toString(),
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

  // 1. Group selections by base index
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

  currentTokens.forEach((token, idx) => {
    if (involvedIndices.includes(idx)) {
      const fullBin = parseInt(token).toString(2);
      const selectedSubs = selectionsByIndex[idx];
      
      // If it's the first involved index, put the targetDecimal here
      if (idx === firstIdx) {
        newTokens.push(targetDecimal);
        // The new decimal is NOT binary by default
      }

      // Calculate what remains of this specific token
      const remainingBits = fullBin.split('').filter((_, sub) => !selectedSubs.includes(sub)).join('');
      
      if (remainingBits.length > 0) {
        const leftoverVal = parseInt(remainingBits, 2).toString();
        newTokens.push(leftoverVal);
        // Flag this leftover piece as binary so it stays '100'
        newBinaryFlags[newTokens.length - 1] = true;
      }
    } else {
      // Keep unrelated tokens
      newTokens.push(token);
      if (binaryMaps[`${gridType}-${idx}`]) {
        newBinaryFlags[newTokens.length - 1] = true;
      }
    }
  });

  // 2. Sync States
  setGridTokens(prev => ({ ...prev, [gridType]: newTokens }));
  setBoxSelections({});
  
  // Update binary maps to match the new indices
  setBinaryMaps(prev => {
    const next = {};
    Object.keys(newBinaryFlags).forEach(newIdx => {
      next[`${gridType}-${newIdx}`] = true;
    });
    return next;
  });
};
  
  const clearAllHighlights = () => setSelections({});
  const revertAllToDecimal = () => { setBinaryMaps({}); setBoxSelections({}); };

  const matchResults = useMemo(() => {
    const colorDigitMap = {};
    PALETTE.forEach(c => colorDigitMap[c] = []);

    settings.gridTypes.forEach(type => {
      const tokens = gridTokens[type] || [];
      const gridSelections = selections[type] || {};
      
      tokens.forEach((token, baseIdx) => {
        if (token === null || SYMBOLS.includes(token)) return;
        const isBin = binaryMaps[`${type}-${baseIdx}`];
        const chars = isBin ? parseInt(token).toString(2).split('') : token.toString().split('');
        chars.forEach((char, subIdx) => {
          const color = gridSelections[`${baseIdx}-${subIdx}`];
          if (color && PALETTE.includes(color)) colorDigitMap[color].push(char);
        });
      });
    });

    return Object.entries(CONSTANTS).flatMap(([category, group]) => 
      Object.entries(group).map(([symbol, value]) => {
        const targetDigits = value.toString().replace(/[^0-9]/g, '').split('');
        let bestColor = null; let maxPercent = 0;
        PALETTE.forEach(color => {
          const userBank = [...colorDigitMap[color]]; 
          let matches = 0;
          targetDigits.forEach(digit => {
            const idx = userBank.indexOf(digit);
            if (idx !== -1) { matches++; userBank.splice(idx, 1); }
          });
          const percent = targetDigits.length > 0 ? (matches / targetDigits.length) * 100 : 0;
          if (percent > maxPercent) { maxPercent = percent; bestColor = color; }
        });
        return { symbol, value, percent: maxPercent, dominantColor: bestColor || '#333', category };
      })
    ).sort((a, b) => b.percent - a.percent);
  }, [selections, binaryMaps, gridTokens, settings.gridTypes, wordVal, SYMBOLS]);

  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px', fontFamily: 'monospace', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh', width: '100%' }} onMouseUp={() => setIsDragging(false)}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '60px', alignItems: 'flex-start' }}>
        <div style={{ width: '600px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ margin: 0, letterSpacing: '1px', fontSize: '2rem' }}>{settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            {settings.gridTypes.map(type => (
              <div key={type}>
                <h5 style={{ color: '#444', marginBottom: '15px', fontSize: '0.8rem', letterSpacing: '2px' }}>{type.toUpperCase()}</h5>
                <GridDisplay
                  gridType={type} tokens={gridTokens[type]} selections={selections} setSelections={setSelections}
                  binaryMaps={binaryMaps} setBinaryMaps={setBinaryMaps} activeColor={activeColor}
                  boxSelections={boxSelections} setBoxSelections={setBoxSelections}
                  isDragging={isDragging} setIsDragging={setIsDragging} SYMBOLS={SYMBOLS}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '40px', display: 'flex', gap: '15px', borderTop: '1px solid #333', paddingTop: '20px' }}>
            <button onClick={clearAllHighlights} style={resetBtnStyle}>Clear All Highlights</button>
            <button onClick={resetToOriginal} style={resetBtnStyle}>Reset</button>
          </div>
        </div>
        <div style={{ width: '420px', backgroundColor: `rgb(${brightness}, ${brightness + 5}, ${brightness + 10})`, padding: '25px', borderRadius: '16px', maxHeight: '85vh', overflowY: 'auto', position: 'sticky', top: '40px', border: '1px solid rgba(255,255,255,0.1)' }}>
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
          {matchResults.map((m, i) => (
            <div key={i} style={{ padding: '18px', borderRadius: '10px', background: m.percent > 0 ? `${m.dominantColor}22` : 'rgba(255,255,255,0.03)', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{m.symbol}</span><span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{m.percent.toFixed(1)}%</span></div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const toolBtn = { border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold', padding: '6px 10px', fontSize: '0.7rem' };
const resetBtnStyle = { backgroundColor: '#2a2a2a', color: '#888', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' };

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

  if (step === 'TOPIC') return (
    <div style={menuStyle}>
      <h2>Topic</h2>
      {["Chinese Zodiac"].map(t => <button key={t} style={menuBtn} onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}>{t}</button>)}
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

  return <GameComponent settings={settings} />;
}