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
  if (typeof value === 'number') return value.toString().split('');
  return [value.toString()];
};

// --- MATH LOGIC ---
const getSquareShellData = (n) => {
  if (n <= 0) return [0];
  if (n === 1) return [1];
  let k = Math.floor(Math.sqrt(n - 1));
  let offset = n - (k * k);
  let sPos = (offset <= k + 1) ? { x: k, y: offset - 1 } : { x: k - (offset - (k + 1)), y: k };
  const R = Math.floor(sPos.y) + 1;
  const C = Math.floor(sPos.x) + 1;
  const spacers = Array(R.toString().length + C.toString().length + 2).fill(" ");
  const lines = [
    [n, "=", k, "×", k, "+", offset, "row:", R, "col:", C],
    [R, "×", C, "=", R * C],
    [R, "+", C, "=", R + C],
    [...spacers, (R * C) + (R + C)] 
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
const GridDisplay = ({ data, persistentSelection, setPersistentSelection, activeColor, isDragging, setIsDragging, SYMBOLS }) => {
  const rows = useMemo(() => data.reduce((acc, curr, i) => {
    if (curr === null) acc.push([]);
    else acc[acc.length - 1].push({ token: curr, index: i });
    return acc;
  }, [[]]), [data]);

  const handleInteraction = (index, token, isDragAction) => {
    if (SYMBOLS.includes(token)) return;
    setPersistentSelection(prev => {
      const newMap = { ...prev };
      if (isDragAction) {
        newMap[index] = activeColor;
      } else {
        newMap[index] === activeColor ? delete newMap[index] : (newMap[index] = activeColor);
      }
      return newMap;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
      {rows.map((row, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '5px' }}>
          {row.map(({ token, index }) => {
            const isSymbol = SYMBOLS.includes(token);
            const highlight = persistentSelection[index];
            return (
              <div
                key={index}
                onMouseDown={() => { if(!isSymbol) { setIsDragging(true); handleInteraction(index, token, false); } }}
                onMouseEnter={() => { if(isDragging && !isSymbol) handleInteraction(index, token, true); }}
                style={{
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: highlight || (isSymbol ? 'transparent' : '#2a2a2a'),
                  borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold', color: isSymbol ? '#555' : 'white',
                  cursor: isSymbol ? 'default' : 'pointer', userSelect: 'none', transition: '0.1s'
                }}
              >
                {token}
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
  const [selections, setSelections] = useState({});
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isDragging, setIsDragging] = useState(false);
  
  const SYMBOLS = ["=", "×", "+", "row:", "col:", "⬡", "Layer", " "];
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];

  // 1. Logic to calculate all matches in real-time
  const matchResults = useMemo(() => {
    let userDigits = "";
    settings.gridTypes.forEach(type => {
      const data = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
      const gridSelections = selections[type] || {};
      data.forEach((token, idx) => {
        if (token !== null && !SYMBOLS.includes(token) && gridSelections[idx]) {
          userDigits += token.toString();
        }
      });
    });

    const results = [];
    Object.entries(CONSTANTS).forEach(([category, group]) => {
      Object.entries(group).forEach(([symbol, value]) => {
        const constStr = value.toString().replace(/[^0-9]/g, '');
        if (userDigits.length === 0) {
          results.push({ symbol, value, percent: 0, category });
          return;
        }

        let matchCount = 0;
        const tempUser = userDigits.split('');
        constStr.split('').forEach(char => {
          const foundIdx = tempUser.indexOf(char);
          if (foundIdx > -1) {
            matchCount++;
            tempUser.splice(foundIdx, 1);
          }
        });

        results.push({ 
          symbol, 
          value, 
          percent: (matchCount / constStr.length) * 100, 
          category 
        });
      });
    });

    return results.sort((a, b) => b.percent - a.percent);
  }, [selections, settings.gridTypes, wordVal]);

  // Calculate average match to drive the "Glimmer/Brighten" effect
  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4); // Base 26 (dark) up to ~66 (bright)

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'row', 
      padding: '40px', fontFamily: 'monospace', color: 'white', 
      backgroundColor: '#1a1a1a', minHeight: '100vh', gap: '20px'
    }} onMouseUp={() => setIsDragging(false)}>
      
      {/* LEFT: GRID SECTION */}
      <div style={{ flex: 1, maxWidth: '650px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: 0, letterSpacing: '1px' }}>{settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})</h2>
          <p style={{ color: '#666' }}>Resonance frequency: n={wordVal}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
          {settings.gridTypes.map(type => (
            <div key={type}>
              <h5 style={{ color: '#444', marginBottom: '12px', fontSize: '0.75rem', letterSpacing: '2px' }}>{type.toUpperCase()}</h5>
              <GridDisplay
                data={type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal)}
                persistentSelection={selections[type] || {}}
                setPersistentSelection={(val) => setSelections(prev => ({ 
                  ...prev, [type]: typeof val === 'function' ? val(prev[type] || {}) : val 
                }))}
                activeColor={activeColor}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                SYMBOLS={SYMBOLS}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '50px', display: 'flex', gap: '15px' }}>
          <button onClick={() => setSelections({})} style={btnStyle}>Reset Sequence</button>
          <button onClick={() => window.location.reload()} style={btnStyle}>Main Menu</button>
        </div>
      </div>

      {/* RIGHT: CONSTANTS PANEL with Glimmer Effect */}
      <div style={{ 
        width: '400px', 
        borderLeft: '1px solid #333', 
        padding: '0 30px',
        backgroundColor: `rgb(${brightness}, ${brightness + (avgMatch/4)}, ${brightness + (avgMatch/2)})`,
        transition: 'background-color 0.5s ease',
        overflowY: 'auto',
        maxHeight: '90vh',
        borderRadius: '12px',
        boxShadow: avgMatch > 20 ? `0 0 ${avgMatch}px rgba(59, 130, 246, 0.2)` : 'none'
      }}>
        <div style={{ position: 'sticky', top: 0, paddingTop: '20px', backgroundColor: 'inherit', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            {PALETTE.map(color => (
              <div key={color} onClick={() => setActiveColor(color)} style={{ 
                width: '24px', height: '24px', backgroundColor: color, borderRadius: '50%', cursor: 'pointer',
                border: activeColor === color ? '2px solid white' : 'none' 
              }} />
            ))}
          </div>
          <h4 style={{ color: '#888', fontSize: '0.8rem', margin: '10px 0' }}>CONSTANT ALIGNMENT</h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
          {matchResults.map((m, i) => (
            <div key={i} style={{ 
              padding: '15px', 
              borderRadius: '8px', 
              background: m.percent > 50 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
              border: m.percent > 50 ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Glimmer effect for high matches */}
              {m.percent > 70 && (
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'glimmer 3s infinite'
                }} />
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: m.percent > 50 ? '#3b82f6' : 'white' }}>{m.symbol}</span>
                <span style={{ fontSize: '0.85rem', color: m.percent > 0 ? (m.percent > 50 ? '#3b82f6' : '#aaa') : '#444' }}>
                  {m.percent.toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#888', wordBreak: 'break-all' }}>{m.value}</div>
              <div style={{ fontSize: '0.6rem', color: '#555', marginTop: '8px', textTransform: 'uppercase' }}>{m.category}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes glimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

const btnStyle = { padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#444', color: 'white', fontWeight: 'bold' };

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
      {["Chinese Zodiac", "Countries"].map(t => <button key={t} style={menuBtn} onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}>{t}</button>)}
    </div>
  );

  if (step === 'WORD') return (
    <div style={menuStyle}>
      <h2>Select Word</h2>
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
      <h2>Tessellation (Multi-Select)</h2>
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