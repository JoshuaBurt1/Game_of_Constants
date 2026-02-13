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

// --- DATA MAPS & UTILS ---
const digitize = (value) => {
  if (value === null) return [null];
  if (value === " ") return [" "]; 
  if (["row:", "col:", "Layer"].includes(value)) return [value];
  if (typeof value === 'number') return value.toString().split('');
  return [value.toString()];
};


// --- MATH LOGIC ---

const getSquareShellData = (n) => {
  if (n <= 0) return [0];
  if (n === 1) return [1];
  
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);
  let sPos = (offset <= k + 1) 
    ? { x: k, y: offset - 1 } 
    : { x: k - (offset - (k + 1)), y: k };

  const R = Math.floor(sPos.y) + 1;
  const C = Math.floor(sPos.x) + 1;
  const prod = R * C;
  const sum = R + C;

  // --- ALIGNMENT LOGIC ---
  const rCells = R.toString().length;
  const cCells = C.toString().length;
  const symbols = 2; // The operator (+ or ×) and the "=" sign
  
  const totalPrefixCells = rCells + cCells + symbols;
  
  // Create an array of hidden spacer cells
  // Inside getSquareShellData:
  const op = "×"; // or "+"
  const eq = "=";
  const spacers = [...Array(R.toString().length).fill(" "), op, ...Array(C.toString().length).fill(" "), eq];

  const lines = [
    [n, "=", k, "×", k, "+", offset, "row:", R, "col:", C],
    [R, "×", C, "=", prod],
    [R, "+", C, "=", sum],
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
const GridDisplay = ({ gridType, wordVal, selections, setSelections, activeColor, isDragging, setIsDragging, binaryMaps, setBinaryMaps, SYMBOLS }) => {
  const baseTokens = useMemo(() => 
    gridType === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal)
  , [gridType, wordVal]);

  const expandedData = useMemo(() => {
    let result = [];
    baseTokens.forEach((token, baseIdx) => {
      if (token === null) {
        result.push({ token: null, baseIdx });
      } else if (SYMBOLS.includes(token)) {
        // Labels/Symbols stay as single units
        result.push({ token: token, baseIdx, subIdx: 0, isSymbol: true });
      } else if (binaryMaps[baseIdx] && !isNaN(token) && token !== " ") {
        const binStr = parseInt(token).toString(2);
        binStr.split('').forEach((bit, bIdx) => {
          // Stable key: base index + bit position
          result.push({ token: bit, baseIdx, subIdx: bIdx, isBinary: true });
        });
      } else {
        token.toString().split('').forEach((digit, dIdx) => {
          // Stable key: base index + digit position
          result.push({ token: digit, baseIdx, subIdx: dIdx, isBinary: false });
        });
      }
    });
    return result;
  }, [baseTokens, binaryMaps, SYMBOLS]);

  const rows = useMemo(() => {
    return expandedData.reduce((acc, curr, i) => {
      if (curr.token === null) acc.push([]);
      else acc[acc.length - 1].push({ ...curr });
      return acc;
    }, [[]]);
  }, [expandedData]);

  const handleInteraction = (item) => {
    if (SYMBOLS.includes(item.token) || item.isSymbol) return;
    
    // Toggling BIN/DEC mode
    if (activeColor === 'BIN') {
      setBinaryMaps(prev => ({ ...prev, [item.baseIdx]: true }));
      return;
    }
    if (activeColor === 'DEC') {
      setBinaryMaps(prev => ({ ...prev, [item.baseIdx]: false }));
      return;
    }

    // Creating a stable key for the selection map
    const selectionKey = `${item.baseIdx}-${item.subIdx}`;

    setSelections(prev => {
      const newMap = { ...prev };
      const currentGridSelection = { ...(newMap[gridType] || {}) };
      
      if (currentGridSelection[selectionKey] === activeColor) {
        delete currentGridSelection[selectionKey];
      } else {
        currentGridSelection[selectionKey] = activeColor;
      }
      
      newMap[gridType] = currentGridSelection;
      return newMap;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
      {rows.map((row, rIdx) => {
        const isLastRow = rIdx === 3; 
        return (
          <div key={rIdx} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {row.map((item, i) => {
              const isSpacerString = item.token === " ";
              const isSymbolToken = SYMBOLS.includes(item.token) || item.isSymbol;
              const shouldHide = isSpacerString || (isLastRow && isSymbolToken);
              const isSymStyle = isSymbolToken && !isSpacerString;
              
              const selectionKey = `${item.baseIdx}-${item.subIdx}`;
              const highlight = (selections[gridType] || {})[selectionKey];

              return (
                <div
                  key={`${selectionKey}-${i}`}
                  onMouseDown={() => { if(!isSymStyle && !shouldHide) { setIsDragging(true); handleInteraction(item); }}}
                  onMouseEnter={() => { if (isDragging && !isSymStyle && !shouldHide) handleInteraction(item); }}
                  style={{
                    minWidth: isSymStyle ? 'auto' : '32px',
                    height: '32px',
                    padding: isSymStyle ? '0 8px' : '0',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: highlight || (isSymStyle || shouldHide ? 'transparent' : '#2a2a2a'),
                    borderRadius: item.isBinary ? '50%' : '4px',
                    fontSize: isSymStyle ? '0.85rem' : (item.isBinary ? '0.9rem' : '1.1rem'),
                    fontWeight: 'bold', 
                    color: isSymStyle ? '#555' : 'white',
                    cursor: (isSymStyle || shouldHide) ? 'default' : 'pointer', 
                    userSelect: 'none', 
                    border: item.isBinary ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    visibility: shouldHide ? 'hidden' : 'visible'
                  }}
                >
                  {item.token}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// --- GAME COMPONENT ---
const GameComponent = ({ settings }) => {
  const [selections, setSelections] = useState({});
  const [binaryMaps, setBinaryMaps] = useState({}); 
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isDragging, setIsDragging] = useState(false);
  
  const SYMBOLS = ["=", "×", "+", "row:", "col:", "⬡", "Layer", " "];
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];

  // --- UPDATED MATCH LOGIC INSIDE GameComponent ---
  const matchResults = useMemo(() => {
    const colorDigitMap = {};
    PALETTE.forEach(c => colorDigitMap[c] = []);

    settings.gridTypes.forEach(type => {
      const baseData = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
      const gridSelections = selections[type] || {};
      
      baseData.forEach((token, baseIdx) => {
        if (token === null || SYMBOLS.includes(token)) return;

        const isBin = binaryMaps[baseIdx];
        const chars = isBin ? parseInt(token).toString(2).split('') : token.toString().split('');
        
        chars.forEach((char, subIdx) => {
          const selectionKey = `${baseIdx}-${subIdx}`;
          const color = gridSelections[selectionKey];
          if (color && PALETTE.includes(color)) {
            colorDigitMap[color].push(char);
          }
        });
      });
    });

    return Object.entries(CONSTANTS).flatMap(([category, group]) => 
      Object.entries(group).map(([symbol, value]) => {
        const targetDigits = value.toString().replace(/[^0-9]/g, '').split('');
        let bestColor = null;
        let maxPercent = 0;

        PALETTE.forEach(color => {
          const userBank = [...colorDigitMap[color]]; 
          let matches = 0;
          targetDigits.forEach(digit => {
            const idx = userBank.indexOf(digit);
            if (idx !== -1) {
              matches++;
              userBank.splice(idx, 1);
            }
          });
          const percent = targetDigits.length > 0 ? (matches / targetDigits.length) * 100 : 0;
          if (percent > maxPercent) {
            maxPercent = percent;
            bestColor = color;
          }
        });

        return { symbol, value, percent: maxPercent, dominantColor: bestColor || '#333', category };
      })
    ).sort((a, b) => b.percent - a.percent);
  }, [selections, binaryMaps, settings.gridTypes, wordVal]);

  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4);

  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 20px', 
        fontFamily: 'monospace', 
        color: 'white', 
        backgroundColor: '#1a1a1a', 
        minHeight: '100vh',
        width: '100%'
      }} 
      onMouseUp={() => setIsDragging(false)}
    >
      {/* INNER WRAPPER: Holds both sections together for centering */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '60px', alignItems: 'flex-start' }}>
        
        {/* LEFT: GRID SECTION */}
        <div style={{ width: '600px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ margin: 0, letterSpacing: '1px', fontSize: '2rem' }}>
              {settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            {settings.gridTypes.map(type => (
              <div key={type}>
                <h5 style={{ color: '#444', marginBottom: '15px', fontSize: '0.8rem', letterSpacing: '2px' }}>
                  {type.toUpperCase()}
                </h5>
                <GridDisplay
                  gridType={type}
                  wordVal={wordVal}
                  selections={selections}
                  setSelections={setSelections}
                  binaryMaps={binaryMaps}
                  setBinaryMaps={setBinaryMaps}
                  activeColor={activeColor}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  SYMBOLS={SYMBOLS}
                />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: CONSTANTS PANEL */}
        <div style={{ 
          width: '420px', 
          backgroundColor: `rgb(${brightness}, ${brightness + 5}, ${brightness + 10})`,
          padding: '25px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '85vh',
          overflowY: 'auto',
          position: 'sticky',
          top: '40px'
        }}>
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', marginBottom: '25px', alignItems: 'center', justifyContent: 'center' }}>
            {PALETTE.map(color => (
              <div key={color} onClick={() => setActiveColor(color)} style={{ width: '28px', height: '28px', backgroundColor: color, borderRadius: '50%', cursor: 'pointer', border: activeColor === color ? '2px solid white' : 'none', boxShadow: activeColor === color ? `0 0 10px ${color}` : 'none' }} />
            ))}
            <div style={{ width: '1px', height: '24px', background: '#444', margin: '0 8px' }} />
            <button onClick={() => setActiveColor('BIN')} style={{ ...toolBtn, backgroundColor: activeColor === 'BIN' ? '#00e5ff' : '#333' }}>BIN</button>
            <button onClick={() => setActiveColor('DEC')} style={{ ...toolBtn, backgroundColor: activeColor === 'DEC' ? '#ff4081' : '#333' }}>DEC</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {matchResults.map((m, i) => (
              <div key={i} style={{ 
                padding: '18px', 
                borderRadius: '10px', 
                background: m.percent > 0 ? `${m.dominantColor}22` : 'rgba(255,255,255,0.03)', 
                border: m.percent > 0 ? `1px solid ${m.dominantColor}55` : '1px solid rgba(255,255,255,0.05)',
                transition: '0.3s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{m.symbol}</span>
                  <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{m.percent.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px', wordBreak: 'break-all' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const toolBtn = { border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold', padding: '6px 10px', fontSize: '0.7rem' };

// --- MAIN APP ---
export default function App() {
  const [step, setStep] = useState('TOPIC'); 
  const [settings, setSettings] = useState({ topic: '', word: '', language: '', gridTypes: [] });

  const toggleGridType = (type) => {
    setSettings(prev => ({
      ...prev,
      gridTypes: prev.gridTypes.includes(type) 
        ? prev.gridTypes.filter(t => t !== type) 
        : [...prev.gridTypes, type]
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
        <button key={g} 
          style={{...menuBtn, backgroundColor: settings.gridTypes.includes(g) ? '#3b82f6' : '#333'}} 
          onClick={() => toggleGridType(g)}
        >
          {g} {settings.gridTypes.includes(g) ? '✓' : ''}
        </button>
      ))}
      <button 
        disabled={settings.gridTypes.length === 0}
        style={{...menuBtn, marginTop: '30px', backgroundColor: '#10b981', opacity: settings.gridTypes.length === 0 ? 0.5 : 1}} 
        onClick={() => setStep('GAME')}
      >
        Confirm Selection
      </button>
    </div>
  );

  return <GameComponent settings={settings} />;
}