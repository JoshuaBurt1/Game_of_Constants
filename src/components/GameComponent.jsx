import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- UTILS & COMPONENTS ---
import GridDisplay from '../components/GridDisplay';

import { 
  ZODIAC_MAPS, 
  ZODIAC_NAMES, 
  EQUATION_SETS, 
  CONSTANTS, 
  SYMBOLS, 
  PALETTE 
} from '../utils/constants';
import { getPermutations, getSquareShellData, getHexagonData } from '../utils/gridUtils';

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
  const [isGloballyTruncated, setIsGloballyTruncated] = useState(false);
  const [isGloballyOrganized, setIsGloballyOrganized] = useState(false);
  const [isGloballyDimensioned, setIsGloballyDimensioned] = useState(false);


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

  const handleGlobalDimension = () => {
    const newState = !isGloballyDimensioned;
    setIsGloballyDimensioned(newState);
    setCardOverrides(prev => {
      const next = { ...prev };
      Object.values(CONSTANTS).forEach(group => {
        Object.keys(group).forEach(symbol => {
          next[symbol] = { ...next[symbol], isDimensioned: newState };
        });
      });
      return next;
    });
  };

  // Global Truncate Handler
  const handleGlobalTruncate = () => {
    const newState = !isGloballyTruncated;
    setIsGloballyTruncated(newState);

    setCardOverrides(prev => {
      const next = { ...prev };
      
      matchResults.forEach(m => {
        if (newState) {
          // 1. Setup Data and Priority
          const override = next[m.symbol] || {};
          const isDim = !!override.isDimensioned;
          const isOrg = !!override.isOrganized;
          
          const valStr = m.data.val || "";
          const multStr = m.data.mult || "";
          const expStr = m.data.exp || "";
          const dimStr = m.data.dim || "";
          
          const tempBank = [...(colorDigitMap[m.dominantColor] || [])];
          let lastMatchIdx = -1;

          // 2. Helper to simulate the bank consumption
          const processSegment = (str, segmentType) => {
            const isVal = segmentType === 'val';
            const isDimSegment = segmentType === 'dim';
            // Use the same regex as the UI for dimensions
            const regex = isDimSegment ? /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/ : /[0-9]/;

            str.split('').forEach((char, idx) => {
              if (regex.test(char)) {
                const bIdx = tempBank.indexOf(char);
                if (bIdx !== -1) {
                  tempBank.splice(bIdx, 1);
                  if (isVal) lastMatchIdx = idx; // Track the last visual highlight
                }
              }
            });
          };

          // 3. Mirror the UI Priority exactly
          if (isDim && isOrg) {
            processSegment(dimStr, 'dim');
            processSegment(expStr, 'exp');
            processSegment(multStr, 'mult');
            processSegment(valStr, 'val');
          } else if (isDim) {
            processSegment(dimStr, 'dim');
            processSegment(valStr, 'val');
            processSegment(multStr, 'mult');
            processSegment(expStr, 'exp');
          } else if (isOrg) {
            processSegment(expStr, 'exp');
            processSegment(multStr, 'mult');
            processSegment(valStr, 'val');
            // Dimension is not processed/accounted for
          } else {
            processSegment(valStr, 'val');
            processSegment(multStr, 'mult');
            processSegment(expStr, 'exp');
            // Dimension is not processed/accounted for
          }

          next[m.symbol] = { ...next[m.symbol], truncateIndex: lastMatchIdx };
        } else {
          // Remove truncation override
          const { truncateIndex, ...rest } = next[m.symbol] || {};
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

      // 1. Grid Metrics & Aggregates
      const gridMetrics = {};
      let aggregateStartingTotal = 0;
      let aggregateEndingTotal = 0;
      let aggregateChanged = 0;
      let aggregateUnchanged = 0;

      settings.gridTypes.forEach(type => {
        const tokensForThisGrid = gridTokens[type] || [];
        const digitTokens = tokensForThisGrid.filter(t => t && !t.isSymbol);

        const originalPool = [];
        const initialTokens = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
        initialTokens.forEach(item => {
          if (item && !item.isSymbol) {
            const val = item.token !== undefined ? String(item.token) : String(item);
            if (/[0-9]/.test(val)) originalPool.push(val);
          }
        });

        const gridStartingTotal = originalPool.length;
        const gridEndingTotal = digitTokens.length;

        let gridChanged = 0;
        let gridUnchanged = 0;

        digitTokens.forEach(token => {
          const val = String(token.token);
          const foundIdx = originalPool.indexOf(val);
          if (foundIdx !== -1) {
            gridUnchanged++;
            originalPool.splice(foundIdx, 1);
          } else {
            gridChanged++;
          }
        });

        const unusedInThisGrid = digitTokens
          .filter(token => token && token.stableId && !selectionsArray.includes(token.stableId))
          .map(token => token.originalDigit || token.token);

        gridMetrics[type] = {
          startingTotal: gridStartingTotal,
          endingTotal: gridEndingTotal,
          gridStartChanged: gridStartingTotal - gridUnchanged,
          changed: gridChanged,
          unchanged: gridUnchanged,
          percentChangedStart: gridStartingTotal > 0 ? Number((( (gridStartingTotal - gridUnchanged) / gridStartingTotal) * 100).toFixed(1)) : 0,
          percentChanged: gridEndingTotal > 0 ? Number(((gridChanged / gridEndingTotal) * 100).toFixed(1)) : 0,
          percentUnchangedStart: gridStartingTotal > 0 ? Number(((gridUnchanged / gridStartingTotal) * 100).toFixed(1)) : 0,
          percentUnchanged: gridEndingTotal > 0 ? Number(((gridUnchanged / gridEndingTotal) * 100).toFixed(1)) : 0,
          unusedDigits: unusedInThisGrid 
        };

        aggregateStartingTotal += gridStartingTotal;
        aggregateEndingTotal += gridEndingTotal;
        aggregateChanged += gridChanged;
        aggregateUnchanged += gridUnchanged;
      });

      const aggregateStartChanged = aggregateStartingTotal - aggregateUnchanged;
      const remainingDigits = allGridTokens
        .filter(token => token && token.stableId && !token.isSymbol && !selectionsArray.includes(token.stableId))
        .map(token => token.originalDigit || token.token);

      const generateMaskedUnit = (targetUnit, matchedDigits) => {
        if (!targetUnit) return "";
        
        let result = "";
        let digitIdx = 0;

        // Iterate through every character of the unit
        for (let char of targetUnit) {
          // FIX: \d won't catch superscripts, use the specific character class
          if (/[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(char)) {
            if (matchedDigits[digitIdx] && matchedDigits[digitIdx] !== '_') {
              result += char; 
            } else {
              result += "_";
            }
            digitIdx++;
          } else {
            // Keep symbols like 'kg', '·', '/', etc.
            result += char;
          }
        }
        return result;
      };

      // 2. Map Performance with Styled Digits & Dimensions
      const performance = matchResults.map(m => {
        const userBank = [...(colorDigitMap[m.dominantColor] || [])];
        const data = m.data;
        const override = cardOverrides[m.symbol] || {};
        const isDim = !!override.isDimensioned;
        const isOrg = !!override.isOrganized;
        
        let valStr = data.val || "";
        if (isGloballyTruncated && override.truncateIndex !== undefined && override.truncateIndex !== -1) {
          valStr = valStr.substring(0, override.truncateIndex + 1);
        }

        const tempBank = [...userBank];
        const results = { val: "", mult: "", exp: "", dim: "" };

        // Helper to match bank digits and return an underscored string
        const allocateAndFormat = (str, segmentType) => {
          if (!str) return "";
          const isDimSegment = segmentType === 'dim';
          const regex = isDimSegment ? /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/ : /[0-9]/;

          return str.split('').map(char => {
            if (regex.test(char)) {
              const bIdx = tempBank.indexOf(char);
              if (bIdx !== -1) {
                tempBank.splice(bIdx, 1);
                return char;
              }
              return "_";
            }
            return char;
          }).join('');
        };

        // PRIORITY ALLOCATION (Must match UI order)
        if (isDim && isOrg) {
          results.dim = allocateAndFormat(data.dim, 'dim');
          results.exp = allocateAndFormat(data.exp, 'exp');
          results.mult = allocateAndFormat(data.mult, 'mult');
          results.val = allocateAndFormat(valStr, 'val');
        } else if (isDim) {
          results.dim = allocateAndFormat(data.dim, 'dim');
          results.val = allocateAndFormat(valStr, 'val');
          results.mult = allocateAndFormat(data.mult, 'mult');
          results.exp = allocateAndFormat(data.exp, 'exp');
        } else if (isOrg) {
          results.exp = allocateAndFormat(data.exp, 'exp');
          results.mult = allocateAndFormat(data.mult, 'mult');
          results.val = allocateAndFormat(valStr, 'val');
        } else {
          results.val = allocateAndFormat(valStr, 'val');
          results.mult = allocateAndFormat(data.mult, 'mult');
          results.exp = allocateAndFormat(data.exp, 'exp');
        }

        const countDigits = (str) => (str ? (str.match(/[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/g) || []).length : 0);
        
        // Calculate total required digits for this specific card
        const requiredDigits = countDigits(valStr) + countDigits(data.mult) + countDigits(data.exp) + (isDim ? countDigits(data.dim) : 0);
        const isPerfect = parseFloat(m.percent) >= 99.9;

        return {
          symbol: m.symbol,
          percent: m.percent.toFixed(1),
          matchedVal: results.val,
          matchedMult: results.mult,
          matchedExp: results.exp,
          matchedDim: results.dim,
          matchedUnit: isDim ? generateMaskedUnit(data.unit, results.dim) : null,
          matchedMag: data.mag,
          unit: data.unit,
          perfectDigitCount: isPerfect ? requiredDigits : 0,
          isPerfect,
          styledDigits: isPerfect ? requiredDigits.toString().split('').map(d => ({ char: d, color: null })) : []
        };
      });

      // 3. --- FIND COMPLETED SET (The Missing Block) ---
      let eqId = "None";
      let eqString = "";
      let originalSet = null;

      if (activeSetIds.length > 0) {
        const completedSets = EQUATION_SETS
          .filter(set => activeSetIds.includes(set.id))
          .filter(set => {
            const perfectCount = set.members.filter(m => 
              matchResults.find(r => r.symbol === m && r.percent >= 99.9)
            ).length;
            return perfectCount === set.members.length;
          });
        
        if (completedSets.length > 0) {
          originalSet = completedSets[0];
          eqId = originalSet.id;
          eqString = originalSet.equation || originalSet.id.replace(/_/g, ' ');
        }
      }

      // 4. --- BADGE IDENTIFICATION & STYLING ---
      const badgeList = [];
      const badgeTargets = {
        "green_camel": { digits: ["2", "1", "9"], color: "#10b981" },
        "blue_camel": { digits: ["7", "3"], color: "#3b82f6" },
        "sigma": { digits: ["3", "4"], color: "#FF69B4" } // version 2: digits: ["3", "4", "1"]
      };

      const allDigitsPool = performance
        .filter(p => p.isPerfect)
        .map(p => p.perfectDigitCount.toString())
        .join('');

      const checkAndStyleBadge = (badgeKey) => {
        const { digits, color } = badgeTargets[badgeKey];
        const pool = allDigitsPool.split('');
        let tempPool = [...pool];
        
        const isMatch = digits.every(d => {
          const idx = tempPool.indexOf(d);
          if (idx !== -1) {
            tempPool.splice(idx, 1);
            return true;
          }
          return false;
        });

        if (isMatch) {
          badgeList.push(badgeKey);
          digits.forEach(targetChar => {
            for (let p of performance) {
              if (!p.isPerfect) continue;
              const digitObj = p.styledDigits.find(sd => sd.char === targetChar && !sd.color);
              if (digitObj) {
                digitObj.color = color;
                break; 
              }
            }
          });
        }
      };

      checkAndStyleBadge("green_camel");
      checkAndStyleBadge("blue_camel");

      // --- NEW: SIGMA BADGE LOGIC (STAT PERMUTATIONS) ---
      const aggregatePercentUnchangedStart = aggregateStartingTotal > 0 
        ? Number(((aggregateUnchanged / aggregateStartingTotal) * 100).toFixed(1)) 
        : 0;

      const sigmaStyledStats = {
        startingTotal: String(aggregateStartingTotal).split('').map(c => ({ char: c, color: null })),
        aggregateStartChanged: String(aggregateStartChanged).split('').map(c => ({ char: c, color: null })),
        changedDigits: String(aggregateChanged).split('').map(c => ({ char: c, color: null })),
        aggregatePercentUnchangedStart: String(aggregatePercentUnchangedStart).split('').map(c => ({ char: c, color: null }))
      };

      const sigmaPool = [
        ...String(aggregateStartingTotal).split(''),
        ...String(aggregateStartChanged).split(''),
        ...String(aggregateChanged).split(''),
        ...String(aggregatePercentUnchangedStart).split('')
      ];

      const checkSigmaBadge = (digits) => {
        let tempPool = [...sigmaPool];
        return digits.every(d => {
          const idx = tempPool.indexOf(d);
          if (idx !== -1) {
            tempPool.splice(idx, 1);
            return true;
          }
          return false;
        });
      };

      let sigmaTargetColor = "#FF69B4";
      let sigmaTargetSet = null;

      // Check 34.1 first, fallback to 34
      if (checkSigmaBadge(["3", "4", "1"])) {
        sigmaTargetSet = ["3", "4", "1"];
      } else if (checkSigmaBadge(["3", "4"])) {
        sigmaTargetSet = ["3", "4"];
      }

      if (sigmaTargetSet) {
        badgeList.push("sigma");
        sigmaTargetSet.forEach(targetChar => {
          const keys = ['startingTotal', 'aggregateStartChanged', 'changedDigits', 'aggregatePercentUnchangedStart'];
          for (const key of keys) {
            const digitObj = sigmaStyledStats[key].find(sd => sd.char === targetChar && !sd.color);
            if (digitObj) {
              digitObj.color = sigmaTargetColor;
              break; // Stop after coloring one instance per required digit
            }
          }
        });
      }

      // 5. Build and Submit Data
      const highscoreData = {
        topic: settings.topic || "General",
        word: settings.word,
        originalValue: wordVal,
        language: settings.language,
        grids: settings.gridTypes,
        results: performance,
        isDimensioned: isGloballyDimensioned,
        badges: badgeList,
        sigmaStyledStats: sigmaStyledStats,
        unusedDigits: remainingDigits,
        startingTotal: aggregateStartingTotal,
        totalDigitsDisplayed: aggregateEndingTotal,
        aggregateStartChanged: aggregateStartChanged,
        changedDigits: aggregateChanged, 
        unchangedDigits: aggregateUnchanged, 
        aggregatePercentChangedStart: aggregateStartingTotal > 0 ? Number(((aggregateStartChanged / aggregateStartingTotal) * 100).toFixed(1)) : 0, 
        percentageChanged: aggregateEndingTotal > 0 ? Number(((aggregateChanged / aggregateEndingTotal) * 100).toFixed(1)) : 0,
        aggregatePercentUnchangedStart: aggregateStartingTotal > 0 ? Number(((aggregateUnchanged / aggregateStartingTotal) * 100).toFixed(1)) : 0, 
        percentageUnchanged: aggregateEndingTotal > 0 ? Number(((aggregateUnchanged / aggregateEndingTotal) * 100).toFixed(1)) : 0,
        gridBreakdown: gridMetrics, 
        timestamp: serverTimestamp(),
        isTruncated: isGloballyTruncated,
        isOrganized: isGloballyOrganized,
        associatedId: eqId,
        associatedEquation: eqString,
        equationMembers: originalSet ? originalSet.members : [] 
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

        let valChars = data.val.split('');
        if (override.truncateIndex !== undefined && override.truncateIndex !== -1) {
          valChars = valChars.slice(0, override.truncateIndex + 1);
        }

        // UPDATED: Only collect dimension digits if the mode is active
        const dimDigits = override.isDimensioned 
          ? (data.dim || "").split('').filter(char => /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(char))
          : [];

        const otherDigits = ((data.mult || "") + (data.exp || "")).split('').filter(char => /[0-9]/.test(char));
        
        // Total required pool now dynamically includes/excludes dimensions
        const allRequiredDigits = [...valChars.filter(c => /[0-9]/.test(c)), ...otherDigits, ...dimDigits];

        let maxPercent = 0;
        let bestColor = null;

        PALETTE.forEach(color => {
          const userBank = [...(colorMap[color] || [])];
          let tempUserBank = [...userBank];
          let totalMatched = 0;

          // Unified Match Logic: Total matches are independent of organization order
          allRequiredDigits.forEach(char => {
            const bIdx = tempUserBank.indexOf(char);
            if (bIdx !== -1) {
              totalMatched++;
              tempUserBank.splice(bIdx, 1);
            }
          });

          const totalRequired = allRequiredDigits.length;
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
            {/* Organize Button */}
            <button
              onClick={handleGlobalOrganize}
              className="reset-btn"
              style={{
                margin: 0, flex: 1,
                backgroundColor: isGloballyOrganized ? 'rgba(245, 158, 11, 0.15)' : undefined,
                color: isGloballyOrganized ? '#fbbf24' : undefined,
                borderColor: isGloballyOrganized ? '#f59e0b' : undefined
              }}
            >
              {isGloballyOrganized ? 'Organized' : 'Organize'}
            </button>

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

            {/* Organize by Dimension Button */}
            <button
              onClick={handleGlobalDimension}
              className="reset-btn"
              style={{
                margin: 0, flex: 1,
                backgroundColor: isGloballyDimensioned ? 'rgba(16, 185, 129, 0.25)' : undefined,
                color: isGloballyDimensioned ? '#10b981' : undefined,
                borderColor: isGloballyDimensioned ? '#10b981' : undefined
              }}
            >
              {isGloballyDimensioned ? 'Dimensioned' : 'Dimension'}
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
            const tempBank = [...visualBank];
            // CLEAN PRIORITY ALLOCATION
            const dimStr = m.data.dim || "";
            const matchedState = { val: [], mult: [], exp: [], dim: [] };

            let displayValStr = m.data.val || "";
            if (override.truncateIndex !== undefined && override.truncateIndex !== -1) {
              displayValStr = displayValStr.substring(0, override.truncateIndex + 1);
            }
            const multStr = m.data.mult || "";
            const expStr = m.data.exp || "";

            // Helper to allocate matches based on string segment
            const allocateMatches = (str, isEnabled = true) => {
              return str.split('').map(char => {
                // Sync regex: standard digits + superscripts
                if (isEnabled && /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(char)) {
                  const bIdx = tempBank.indexOf(char);
                  if (bIdx !== -1) {
                    tempBank.splice(bIdx, 1);
                    return true;
                  }
                }
                return false;
              });
            };

            // CLEAN PRIORITY ALLOCATION
            const isDim = !!override.isDimensioned; // Helper boolean

            if (isDim && override.isOrganized) {
              matchedState.dim = allocateMatches(dimStr, true);
              matchedState.exp = allocateMatches(expStr);
              matchedState.mult = allocateMatches(multStr);
              matchedState.val = allocateMatches(displayValStr);
            } else if (isDim) {
              matchedState.dim = allocateMatches(dimStr, true);
              matchedState.val = allocateMatches(displayValStr);
              matchedState.mult = allocateMatches(multStr);
              matchedState.exp = allocateMatches(expStr);
            } else if (override.isOrganized) {
              matchedState.exp = allocateMatches(expStr);
              matchedState.mult = allocateMatches(multStr);
              matchedState.val = allocateMatches(displayValStr);
              matchedState.dim = allocateMatches(dimStr, false); // Force false
            } else {
              matchedState.val = allocateMatches(displayValStr);
              matchedState.mult = allocateMatches(multStr);
              matchedState.exp = allocateMatches(expStr);
              matchedState.dim = allocateMatches(dimStr, false); // Force false
            }

            let hasValMatches = matchedState.val.includes(true);
            let hasMultMatches = matchedState.mult.includes(true) || matchedState.exp.includes(true);

            const renderDigits = (str, segmentType) => {
              if (!str) return null;
              
              let displayStr = segmentType === 'val' ? displayValStr : str;

              return displayStr.split('').map((char, idx) => {
                const isDigit = /[0-9]/.test(char);
                let color = 'rgba(255,255,255,0.15)'; 
                
                if (isDigit) {
                  if (matchedState[segmentType][idx]) color = '#ffffff'; // Match found
                } else {
                  color = '#ffffff'; // Non-digits (., -) are always rendered white
                }
                return <span key={idx} style={{ color, transition: 'all 0.2s' }}>{char}</span>;
              });
            };

            const renderUnit = (unitStr) => {
              if (!unitStr) return null;
              let dimIdx = 0;
              const digitRegex = /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/;

              return unitStr.split('').map((char, idx) => {
                if (digitRegex.test(char)) {
                  // If isDimensioned was false, matchedState.dim[dimIdx] will be undefined/false
                  const isMatched = matchedState.dim[dimIdx];
                  dimIdx++;
                  const color = isMatched ? '#ffffff' : 'rgba(255,255,255,0.15)';
                  return <span key={`unit-${idx}`} style={{ color, transition: 'all 0.2s' }}>{char}</span>;
                }
                return <span key={`unit-${idx}`} style={{ color: 'rgba(255,255,255,0.4)' }}>{char}</span>;
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
                  <span className="unit-text">{renderUnit(m.data.unit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameComponent;