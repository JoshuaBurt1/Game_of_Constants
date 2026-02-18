import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- UTILS & COMPONENTS ---
import GridDisplay from './components/GridDisplay';
import HighscoresView from './components/HighscoresView';

import { 
  ZODIAC_MAPS, 
  ZODIAC_NAMES, 
  EQUATION_SETS, 
  CONSTANTS, 
  SYMBOLS, 
  PALETTE 
} from './utils/constants';
import { 
  getPermutations, 
  getSquareShellData, 
  getHexagonData 
} from './utils/gridUtils';

import './App.css';

// --- GAME COMPONENT ---
const GameComponent = ({ settings, setStep }) => {
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];

  // 1. State
  const [selections, setSelections] = useState({});
  const [binaryMaps, setBinaryMaps] = useState({});
  const [boxSelections, setBoxSelections] = useState({});
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [gridTokens, setGridTokens] = useState({});
  const [cardOverrides, setCardOverrides] = useState({});
  const [isGloballyOrganized, setIsGloballyOrganized] = useState(false);
  const [isGloballyTruncated, setIsGloballyTruncated] = useState(false);
  const [isGloballyRounded, setIsGloballyRounded] = useState(false);

  // Global Organise Handler
  const handleGlobalOrganize = () => {
    const newState = !isGloballyOrganized;
    setIsGloballyOrganized(newState);
    setCardOverrides(prev => {
      const next = { ...prev };
      Object.values(CONSTANTS).forEach(group => {
        Object.keys(group).forEach(symbol => {
          next[symbol] = { ...next[symbol], isOrganized: newState };
        });
      });
      return next;
    });
  };

  // Global Truncate Handler
  const handleGlobalTruncate = () => {
    const newState = !isGloballyTruncated;
    setIsGloballyTruncated(newState);
    if (newState) setIsGloballyRounded(false);

    setCardOverrides(prev => {
      const next = { ...prev };
      matchResults.forEach(m => {
        if (newState) {
          const valStr = m.data.val || "";
          const otherStr = (m.data.mult || "") + (m.data.exp || "");
          const bank = [...(colorDigitMap[m.dominantColor] || [])];
          const isOrganized = next[m.symbol]?.isOrganized;
          
          let lastMatchIdx = -1;

          if (isOrganized) {
            // 1. Replicate right-to-left sacrifice logic to find true visual highlights
            const valMatches = [];
            const tempBank = [...bank];
            
            valStr.split('').forEach((char, i) => {
              const bIdx = tempBank.indexOf(char);
              if (/[0-9]/.test(char) && bIdx !== -1) {
                valMatches.push({ char, i });
                tempBank.splice(bIdx, 1);
              }
            });

            const gaps = [];
            otherStr.split('').forEach(char => {
              if (/[0-9]/.test(char)) {
                const bIdx = tempBank.indexOf(char);
                if (bIdx !== -1) tempBank.splice(bIdx, 1);
                else gaps.push(char);
              }
            });

            const sacMap = new Set();
            const reserved = [];
            gaps.forEach(gapChar => {
              for (let i = valMatches.length - 1; i >= 0; i--) {
                if (valMatches[i].char === gapChar) {
                  sacMap.add(valMatches[i].i);
                  reserved.push(gapChar);
                  valMatches.splice(i, 1);
                  break;
                }
              }
            });

            // 2. Simulate the forward render loop to find the last *visually* highlighted index
            const visualBank = [...bank];
            valStr.split('').forEach((char, idx) => {
              if (/[0-9]/.test(char)) {
                const isSacrificed = sacMap.has(idx);
                if (!isSacrificed) {
                  const bIdx = visualBank.indexOf(char);
                  if (bIdx !== -1) {
                    const countInBank = visualBank.filter(c => c === char).length;
                    const countReserved = reserved.filter(c => c === char).length;
                    if (countInBank > countReserved) {
                      lastMatchIdx = idx; // Found a guaranteed highlight
                      visualBank.splice(bIdx, 1);
                    } else if (countInBank > 0 && countReserved > 0) {
                      reserved.splice(reserved.indexOf(char), 1);
                    }
                  }
                }
              }
            });
          } else {
            // Standard greedy matching when not organized
            const tempBank = [...bank];
            valStr.split('').forEach((char, idx) => {
              if (/[0-9]/.test(char)) {
                const bIdx = tempBank.indexOf(char);
                if (bIdx !== -1) {
                  lastMatchIdx = idx;
                  tempBank.splice(bIdx, 1);
                }
              }
            });
          }
          delete next[m.symbol]?.roundedVal;
          next[m.symbol] = { ...next[m.symbol], truncateIndex: lastMatchIdx };
        } else {
          // Remove truncation
          const { truncateIndex, ...rest } = next[m.symbol] || {};
          next[m.symbol] = rest;
        }
      });
      return next;
    });
  };

  // Global Round Handler
  const handleGlobalRound = () => {
    const newState = !isGloballyRounded;
    setIsGloballyRounded(newState);
    if (newState) setIsGloballyTruncated(false); // Prevent clashing with Truncate

    setCardOverrides(prev => {
      const next = { ...prev };
      matchResults.forEach(m => {
        if (newState) {
          const valStr = m.data.val || "";
          const otherStr = (m.data.mult || "") + (m.data.exp || "");
          const bank = [...(colorDigitMap[m.dominantColor] || [])];
          const isOrganized = next[m.symbol]?.isOrganized;
          
          let lastMatchIdx = -1;

          // --- Exact same logic as Truncate to find lastMatchIdx ---
          if (isOrganized) {
            const valMatches = [];
            const tempBank = [...bank];
            
            valStr.split('').forEach((char, i) => {
              const bIdx = tempBank.indexOf(char);
              if (/[0-9]/.test(char) && bIdx !== -1) {
                valMatches.push({ char, i });
                tempBank.splice(bIdx, 1);
              }
            });

            const gaps = [];
            otherStr.split('').forEach(char => {
              if (/[0-9]/.test(char)) {
                const bIdx = tempBank.indexOf(char);
                if (bIdx !== -1) tempBank.splice(bIdx, 1);
                else gaps.push(char);
              }
            });

            const sacMap = new Set();
            const reserved = [];
            gaps.forEach(gapChar => {
              for (let i = valMatches.length - 1; i >= 0; i--) {
                if (valMatches[i].char === gapChar) {
                  sacMap.add(valMatches[i].i);
                  reserved.push(gapChar);
                  valMatches.splice(i, 1);
                  break;
                }
              }
            });

            const visualBank = [...bank];
            valStr.split('').forEach((char, idx) => {
              if (/[0-9]/.test(char)) {
                if (!sacMap.has(idx)) {
                  const bIdx = visualBank.indexOf(char);
                  if (bIdx !== -1) {
                    const countInBank = visualBank.filter(c => c === char).length;
                    const countReserved = reserved.filter(c => c === char).length;
                    if (countInBank > countReserved) {
                      lastMatchIdx = idx;
                      visualBank.splice(bIdx, 1);
                    } else if (countInBank > 0 && countReserved > 0) {
                      reserved.splice(reserved.indexOf(char), 1);
                    }
                  }
                }
              }
            });
          } else {
            const tempBank = [...bank];
            valStr.split('').forEach((char, idx) => {
              if (/[0-9]/.test(char)) {
                const bIdx = tempBank.indexOf(char);
                if (bIdx !== -1) {
                  lastMatchIdx = idx;
                  tempBank.splice(bIdx, 1);
                }
              }
            });
          }
          // --- End lastMatchIdx logic ---

          // --- Rounding Math Logic ---
          let roundedVal = valStr;
          if (lastMatchIdx !== -1) {
            let targetIdx = -1;
            // Find the *first* digit after the last highlighted digit
            for (let i = lastMatchIdx + 1; i < valStr.length; i++) {
              if (/[0-9]/.test(valStr[i])) {
                targetIdx = i;
                break;
              }
            }

            if (targetIdx !== -1) {
              let decIdx = valStr.indexOf('.');
              if (decIdx === -1) decIdx = valStr.length;
              
              const numVal = parseFloat(valStr);
              if (!isNaN(numVal)) {
                if (targetIdx > decIdx) {
                  // Rounding decimals (e.g. 3.14159 -> 3.142)
                  const decPlaces = targetIdx - decIdx;
                  roundedVal = numVal.toFixed(decPlaces);
                } else {
                  // Rounding large integers (e.g. 299792458 -> 299800000)
                  const zeros = decIdx - targetIdx - 1;
                  const factor = Math.pow(10, zeros);
                  roundedVal = (Math.round(numVal / factor) * factor).toString();
                }
              }
            }
          }

          delete next[m.symbol]?.truncateIndex; // Clean up truncate if it exists
          next[m.symbol] = { ...next[m.symbol], roundedVal };
        } else {
          // Remove rounding
          const { roundedVal, ...rest } = next[m.symbol] || {};
          next[m.symbol] = rest;
        }
      });
      return next;
    });
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
        grids: settings.gridTypes,
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

  // 2. Effects
  useEffect(() => {
    const initial = {};
    settings.gridTypes.forEach(type => {
      initial[type] = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
    });
    setGridTokens(initial);
  }, [wordVal, settings.gridTypes]);

  // 3. Permutation Logic
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
    const validBinaryStrings = allPerms.filter(bin => bin.length === 1 || !bin.startsWith('0'));
    const decimalPerms = validBinaryStrings.map(bin => parseInt(bin, 2).toString());

    return {
      gridType,
      binaryString,
      perms: Array.from(new Set(decimalPerms)).sort((a, b) => b - a)
    };
  }, [boxSelections]);

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
      const currentVal = item?.token !== undefined ? item.token : item;
      if (involvedIndices.includes(idx)) {
        const fullBin = parseInt(currentVal).toString(2);
        const selectedSubs = selectionsByIndex[idx];
        if (idx === firstIdx) {
          newTokens.push({
            token: targetDecimal,
            stableId: `conv-dec-${gridType}-${idx}-${Date.now()}`,
            originalDigit: targetDecimal,
            isSymbol: false
          });
        }
        const remainingBitsArray = fullBin.split('').filter((_, sub) => !selectedSubs.includes(sub));
        remainingBitsArray.forEach((bit, bIdx) => {
          newTokens.push({
            token: bit,
            stableId: `leftover-${gridType}-${idx}-${bIdx}-${Date.now()}`,
            originalDigit: bit,
            isSymbol: false
          });
          newBinaryFlags[newTokens.length - 1] = true;
        });
      } else {
        newTokens.push(item);
        if (binaryMaps[`${gridType}-${idx}`]) newBinaryFlags[newTokens.length - 1] = true;
      }
    });

    setGridTokens(prev => ({ ...prev, [gridType]: newTokens }));
    setBoxSelections({});
    setBinaryMaps(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { if (!k.startsWith(gridType)) next[k] = prev[k]; });
      Object.keys(newBinaryFlags).forEach(newIdx => { next[`${gridType}-${newIdx}`] = true; });
      return next;
    });
  };

  const resetToOriginal = () => {
    const restoredTokens = {};
    settings.gridTypes.forEach(type => {
      restoredTokens[type] = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
    });
    setGridTokens(restoredTokens);
    setBinaryMaps({});
    setBoxSelections({});
    setSelections({});
    setIsGloballyOrganized(false);
    setIsGloballyTruncated(false);
    setIsGloballyRounded(false);
    setCardOverrides({});
  };

  const clearAllHighlights = () => setSelections({});

  // 4. Scoring Logic (Updated for Truncation)
  const { results: matchResults, colorDigitMap, symbolsToElevate, activeSetIds } = useMemo(() => {
    const colorMap = {};
    PALETTE.forEach(c => colorMap[c] = []);

    settings.gridTypes.forEach(type => {
      const tokens = gridTokens[type] || [];
      const gridSelections = selections[type] || {};
      tokens.forEach((item) => {
        if (!item || !item.stableId) return;
        const color = gridSelections[item.stableId];
        if (color && PALETTE.includes(color)) colorMap[color].push(item.originalDigit);
      });
    });

    const allResults = Object.entries(CONSTANTS).flatMap(([category, group]) =>
      Object.entries(group).map(([symbol, rawData]) => {
        const override = cardOverrides[symbol] || {};
        const data = { ...rawData };

        // TRUNCATION LOGIC: Slice valChars if truncateIndex is active
        let valChars = data.val.split('');
        if (override.roundedVal !== undefined) {
          valChars = override.roundedVal.split('');
        } else if (override.truncateIndex !== undefined && override.truncateIndex !== -1) {
          valChars = valChars.slice(0, override.truncateIndex + 1);
        }

        const otherDigits = ((data.mult || "") + (data.exp || "")).split('').filter(char => /[0-9]/.test(char));

        let maxPercent = 0;
        let bestColor = null;

        PALETTE.forEach(color => {
          const userBank = [...(colorMap[color] || [])];
          let sacrificedIndices = new Set();

          if (override.isOrganized) {
            let ghostBank = [...userBank];
            valChars.forEach(char => {
              const bIdx = ghostBank.indexOf(char);
              if (/[0-9]/.test(char) && bIdx !== -1) ghostBank.splice(bIdx, 1);
            });
            const gaps = [];
            otherDigits.forEach(char => {
              const bIdx = ghostBank.indexOf(char);
              if (bIdx !== -1) ghostBank.splice(bIdx, 1);
              else gaps.push(char);
            });
            const currentGaps = [...gaps];
            for (let i = valChars.length - 1; i >= 0; i--) {
              const char = valChars[i];
              const gapIdx = currentGaps.indexOf(char);
              const bankIdx = userBank.indexOf(char);
              if (/[0-9]/.test(char) && gapIdx !== -1 && bankIdx !== -1) {
                sacrificedIndices.add(i);
                currentGaps.splice(gapIdx, 1);
              }
            }
          }

          let matchedValCount = 0;
          let tempUserBank = [...userBank];
          valChars.forEach((char, idx) => {
            if (/[0-9]/.test(char)) {
              const bankIdx = tempUserBank.indexOf(char);
              if (!sacrificedIndices.has(idx) && bankIdx !== -1) {
                matchedValCount++;
                tempUserBank.splice(bankIdx, 1);
              }
            }
          });

          let matchedOtherCount = 0;
          otherDigits.forEach(char => {
            const bankIdx = tempUserBank.indexOf(char);
            if (bankIdx !== -1) {
              matchedOtherCount++;
              tempUserBank.splice(bankIdx, 1);
            }
          });

          const totalRequired = valChars.filter(c => /[0-9]/.test(c)).length + otherDigits.length;
          const totalMatched = matchedValCount + matchedOtherCount;
          let percent = totalRequired > 0 ? (totalMatched / totalRequired) * 100 : 0;

          if (percent > maxPercent) { maxPercent = percent; bestColor = color; }
        });

        return { symbol, data, percent: maxPercent, dominantColor: bestColor || '#333', category };
      })
    );

    const perfectSymbols = allResults.filter(r => r.percent >= 99.9).map(r => r.symbol);
    const elevated = new Set();
    const activeIds = [];
    EQUATION_SETS.forEach(set => {
      if (set.members.filter(m => perfectSymbols.includes(m)).length >= 2) {
        activeIds.push(set.id);
        set.members.forEach(m => elevated.add(m));
      }
    });

    const sorted = allResults.sort((a, b) => {
      const aPerf = a.percent >= 99.9, bPerf = b.percent >= 99.9;
      if (aPerf !== bPerf) return aPerf ? -1 : 1;
      if (elevated.has(a.symbol) !== elevated.has(b.symbol)) return elevated.has(a.symbol) ? -1 : 1;
      return b.percent - a.percent;
    });

    return { results: sorted, colorDigitMap: colorMap, symbolsToElevate: elevated, activeSetIds: activeIds };
  }, [selections, gridTokens, cardOverrides]);

  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4);

  return (
    <div className="game-screen-container" onMouseUp={() => setIsDragging(false)}>
      <div className="game-content-max-width">
        <div className="left-scroll-column">
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ margin: 0, letterSpacing: '1px', fontSize: '2rem' }}>
              {settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})
            </h2>
          </div>

          <div className="grid-x-scroller">
            <div className="grid-stack">
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
          </div>

          <div className="action-footer">
            <button onClick={() => setStep('TOPIC')} className="reset-btn">Home</button>
            <button onClick={clearAllHighlights} className="reset-btn">Clear All Highlights</button>
            <button onClick={resetToOriginal} className="reset-btn">Reset</button>
            <button onClick={handleSubmitScore} className="reset-btn submit-btn">Submit Score</button>
          </div>
        </div>

        <div className="sticky-right-panel" style={{ backgroundColor: `rgb(${brightness}, ${brightness + 5}, ${brightness + 10})` }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            {/* Truncate Button */}
            <button
              onClick={handleGlobalTruncate}
              className="reset-btn"
              style={{
                margin: 0, flex: 1,
                backgroundColor: isGloballyTruncated ? 'rgba(59, 130, 246, 0.25)' : undefined,
                color: isGloballyTruncated ? '#3b82f6' : undefined,
                borderColor: isGloballyTruncated ? '#3b82f6' : undefined
              }}
            >
              {isGloballyTruncated ? 'Truncated' : 'Truncate'}
            </button>
            {/* Round Button */}
            <button 
              onClick={handleGlobalRound} 
              className="reset-btn" 
              style={{ 
                margin: 0, flex: 1,
                backgroundColor: isGloballyRounded ? 'rgba(139, 92, 246, 0.25)' : undefined,
                color: isGloballyRounded ? '#8b5cf6' : undefined,
                borderColor: isGloballyRounded ? '#8b5cf6' : undefined
              }}
            >
              {isGloballyRounded ? 'Rounded' : 'Round'}
            </button>

            {/* Organize Button */}
            <button
              onClick={handleGlobalOrganize}
              className="reset-btn"
              style={{
                margin: 0, flex: 1.5,
                backgroundColor: isGloballyOrganized ? 'rgba(16, 185, 129, 0.25)' : undefined,
                color: isGloballyOrganized ? '#10b981' : undefined,
                borderColor: isGloballyOrganized ? '#10b981' : undefined
              }}
            >
              {isGloballyOrganized ? 'Organized' : 'Organize'}
            </button>
          </div>

          <div className="palette-container">
            {PALETTE.map(color => (
              <div key={color} onClick={() => setActiveColor(color)} className="color-swatch" style={{ backgroundColor: color, border: activeColor === color ? '2px solid white' : 'none' }} />
            ))}
            <div style={{ width: '1px', height: '24px', background: '#444', margin: '0 8px' }} />
            <button onClick={() => setActiveColor('BIN')} className="tool-btn" style={{ backgroundColor: activeColor === 'BIN' ? '#3b82f6' : '#333' }}>BIN</button>
            <button onClick={() => setActiveColor('DEC')} className="tool-btn" style={{ backgroundColor: activeColor === 'DEC' ? '#3b82f6' : '#333' }}>DEC</button>
          </div>

          {activeColor === 'DEC' && boxedData && (
            <div className="permutation-box">
              <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px' }}>CONVERT GRID:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {boxedData.perms.map((p, idx) => (
                  <button key={idx} onClick={() => handlePermutationClick(p)} style={{ padding: '6px 12px', background: '#10b981', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {matchResults.map((m, i) => {
            const isPerfect = m.percent >= 99.9;
            const isElevated = symbolsToElevate.has(m.symbol) && !isPerfect;
            const override = cardOverrides[m.symbol] || {};
            const parentSetName = isElevated ? EQUATION_SETS.find(s => s.members.includes(m.symbol) && activeSetIds.includes(s.id))?.id : null;
            const visualBank = [...(colorDigitMap[m.dominantColor] || [])];

            const { map: sacrificedIndices, reserved: reservedForOther } = (() => {
              if (!override.isOrganized) return { map: new Set(), reserved: [] };
              const tempBank = [...visualBank], valStr = m.data.val || "", otherStr = (m.data.mult || "") + (m.data.exp || "");
              
              // Apply UI truncation to the organization logic if active
              const displayValStr = (override.truncateIndex !== undefined && override.truncateIndex !== -1) 
                ? valStr.substring(0, override.truncateIndex + 1) 
                : valStr;

              const valMatches = [];
              displayValStr.split('').forEach((char, i) => {
                const bIdx = tempBank.indexOf(char);
                if (/[0-9]/.test(char) && bIdx !== -1) { valMatches.push({ char, i }); tempBank.splice(bIdx, 1); }
              });
              const gaps = [];
              otherStr.split('').forEach(char => {
                if (/[0-9]/.test(char)) {
                  const bIdx = tempBank.indexOf(char);
                  if (bIdx !== -1) tempBank.splice(bIdx, 1); else gaps.push(char);
                }
              });
              const sacMap = new Set(), res = [];
              gaps.forEach(gapChar => {
                for (let i = valMatches.length - 1; i >= 0; i--) {
                  if (valMatches[i].char === gapChar) { sacMap.add(valMatches[i].i); res.push(gapChar); valMatches.splice(i, 1); break; }
                }
              });
              return { map: sacMap, reserved: res };
            })();

            let hasValMatches = false, hasMultMatches = false;
            const renderDigits = (str, segmentType) => {
              if (!str) return null;
              const isVal = segmentType === 'val';
              
              // TRUNCATE STRING FOR UI:
              let displayStr = str;
            if (isVal) {
              if (override.roundedVal !== undefined) {
                displayStr = override.roundedVal;
              } else if (override.truncateIndex !== undefined && override.truncateIndex !== -1) {
                displayStr = str.substring(0, override.truncateIndex + 1);
              }
            }

            return displayStr.split('').map((char, idx) => {
                const isDigit = /[0-9]/.test(char);
                let color = 'rgba(255,255,255,0.15)';
                if (isDigit) {
                  const isSacrificed = isVal && sacrificedIndices.has(idx);
                  if (isVal) {
                    if (!isSacrificed) {
                      const bankIdx = visualBank.indexOf(char);
                      if (bankIdx !== -1) {
                        const countInBank = visualBank.filter(c => c === char).length;
                        const countReserved = reservedForOther.filter(c => c === char).length;
                        if (countInBank > countReserved) { color = '#ffffff'; hasValMatches = true; visualBank.splice(bankIdx, 1); }
                        else if (countInBank > 0 && countReserved > 0) reservedForOther.splice(reservedForOther.indexOf(char), 1);
                      }
                    }
                  } else {
                    const bankIdx = visualBank.indexOf(char);
                    if (bankIdx !== -1) { color = '#ffffff'; if (segmentType === 'mult') hasMultMatches = true; visualBank.splice(bankIdx, 1); }
                  }
                } else color = '#ffffff';
                return <span key={idx} style={{ color, transition: 'all 0.2s' }}>{char}</span>;
              });
            };

            return (
              <div key={i} className={`constant-card ${isPerfect ? 'perfect-match' : ''} ${isElevated ? 'elevated' : ''}`}
                style={{
                  borderColor: isPerfect ? m.dominantColor : undefined,
                  boxShadow: isPerfect ? `0 0 15px ${m.dominantColor}40` : undefined,
                  backgroundColor: isPerfect ? undefined : (m.percent > 0 ? `${m.dominantColor}15` : undefined),
                  backgroundImage: isPerfect ? `linear-gradient(90deg, ${m.dominantColor}15 0%, ${m.dominantColor}40 50%, ${m.dominantColor}15 100%)` : 'none'
                }}>
                <div className="card-header">
                  <div className="card-content">
                    {parentSetName && <div className="set-badge">{parentSetName.replace(/_/g, ' ')}</div>}
                    <span className="symbol-text">{m.symbol}</span>
                  </div>
                  <div className="action-stack">
                    <span style={{ fontSize: '0.8rem', color: isPerfect ? '#fff' : m.dominantColor, fontWeight: 'bold' }}>
                      {m.percent.toFixed(1)}% {isPerfect && '★'}
                    </span>
                  </div>
                </div>
                <div className="value-display">
                  {renderDigits(m.data.val, 'val')}
                  {m.data.mult && (
                    <>
                      <span style={{ color: (!override.isOrganized || hasValMatches || hasMultMatches) ? 'white' : 'rgba(255,255,255,0.15)' }}>{" × "}</span>
                      <span style={{ position: 'relative' }}>
                        {renderDigits(m.data.mult, 'mult')}
                        <sup style={{ fontSize: '0.75rem', marginLeft: '2px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.15)' }}>{m.data.mag}</span>
                          {renderDigits(m.data.exp, 'exp')}
                        </sup>
                      </span>
                    </>
                  )}
                  <span className="unit-text">{m.data.unit}</span>
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

  if (step === 'HIGHSCORES') return <HighscoresView onBack={() => setStep('TOPIC')} />;

  if (step === 'TOPIC') return (
    <div className="menu-container">
      <button className="menu-btn" onClick={() => setStep('HIGHSCORES')}>
        View Highscores
      </button>
      
      <div className="menu-divider" />
      
      <h2>Topic</h2>
      {["Chinese Zodiac"].map(t => (
        <button key={t} className="menu-btn" onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}>{t}</button>
      ))}
    </div>
  );

  if (step === 'WORD') return (
    <div className="menu-container">
      <h2>Select Animal</h2>
      {["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"].map(w => 
        <button key={w} className="menu-btn" onClick={() => { setSettings({...settings, word: w}); setStep('LANG'); }}>{w}</button>
      )}
    </div>
  );

  if (step === 'LANG') return (
    <div className="menu-container">
      <h2>Language</h2>
      {["Hebrew", "Ancient Greek"].map(l => (
        <button key={l} className="menu-btn" onClick={() => { setSettings({...settings, language: l}); setStep('GRID'); }}>{l}</button>
      ))}
    </div>
  );

  if (step === 'GRID') return (
    <div className="menu-container">
      <h2>Tessellation</h2>
      {["Square Shell", "Hexagon"].map(g => (
        <button key={g} className={`menu-btn ${settings.gridTypes.includes(g) ? 'active-grid' : ''}`} onClick={() => toggleGridType(g)}>
          {g} {settings.gridTypes.includes(g) ? '✓' : ''}
        </button>
      ))}
      <button disabled={settings.gridTypes.length === 0} className="menu-btn confirm-btn" onClick={() => setStep('GAME')}>Confirm Selection</button>
    </div>
  );

  return <GameComponent settings={settings} setStep={setStep} />;
}