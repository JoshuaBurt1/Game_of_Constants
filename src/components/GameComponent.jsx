import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import './GameComponent.css';

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
const GameComponent = ({ settings, setStep, user, userName }) => {
  const wordVal = ZODIAC_MAPS[settings.language][settings.word];
  const userRef = user ? doc(db, 'users', user.uid) : null;  

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

      const gridMetrics = {};
      let aggregateStartingTotal = 0;
      let aggregateEndingTotal = 0;

      // --- VERSION TRACKING ---
      // Version A: Additive
      let additiveUnchangedTotal = 0;

      // Version B: Global Pooled Bag
      const allOriginalPool = [];
      const allCurrentDigits = [];

      // Check if we are in multi-grid mode
      const isMultiGrid = settings.gridTypes.length > 1;

      settings.gridTypes.forEach(type => {
        const tokensForThisGrid = gridTokens[type] || [];
        const currentDigits = tokensForThisGrid
          .filter(t => t && !t.isSymbol && /[0-9]/.test(String(t.token)))
          .map(t => String(t.token));

        const gridUnusedDigits = tokensForThisGrid
          .filter(token => token && token.stableId && !token.isSymbol && !selectionsArray.includes(token.stableId))
          .map(token => token.originalDigit || token.token);

        const initialTokens = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
        const originalPool = initialTokens
          .filter(item => {
            const val = item?.token !== undefined ? String(item.token) : String(item);
            return !item?.isSymbol && /[0-9]/.test(val);
          })
          .map(item => item?.token !== undefined ? String(item.token) : String(item));

        const gridStartingTotal = originalPool.length;
        const gridEndingTotal = currentDigits.length;

        let gridUnchanged = 0;
        const tempOriginalPool = [...originalPool];

        currentDigits.forEach(digit => {
          const foundIdx = tempOriginalPool.indexOf(digit);
          if (foundIdx !== -1) {
            gridUnchanged++;
            tempOriginalPool.splice(foundIdx, 1);
          }
        });

        // Track Additive Total
        if (isMultiGrid) {
          additiveUnchangedTotal += gridUnchanged;
          
          const gridStartChanged = gridStartingTotal - gridUnchanged;
          const gridEndChanged = gridEndingTotal - gridUnchanged;

          gridMetrics[type] = {
            startingTotal: gridStartingTotal,
            endingTotal: gridEndingTotal,
            unchanged: gridUnchanged,
            startChanged: gridStartChanged,
            changed: gridEndChanged,
            unusedDigits: gridUnusedDigits,
            percUnchangedStart: gridStartingTotal > 0 ? Number(((gridUnchanged / gridStartingTotal) * 100).toFixed(1)) : 0,
            percChangedStart: gridStartingTotal > 0 ? Number(((gridStartChanged / gridStartingTotal) * 100).toFixed(1)) : 0,
            percUnchanged: gridEndingTotal > 0 ? Number(((gridUnchanged / gridEndingTotal) * 100).toFixed(1)) : 0,
            percChanged: gridEndingTotal > 0 ? Number(((gridEndChanged / gridEndingTotal) * 100).toFixed(1)) : 0
          };
        }

        aggregateStartingTotal += gridStartingTotal;
        aggregateEndingTotal += gridEndingTotal;
        allOriginalPool.push(...originalPool);
        allCurrentDigits.push(...currentDigits);
      });

      // --- AGGREGATE CALCULATIONS (VERSION B: GLOBAL/CURRENT) ---
      let aggregateUnchanged = 0;
      const tempAllOriginalPool = [...allOriginalPool];

      allCurrentDigits.forEach(digit => {
        const foundIdx = tempAllOriginalPool.indexOf(digit);
        if (foundIdx !== -1) {
          aggregateUnchanged++;
          tempAllOriginalPool.splice(foundIdx, 1);
        }
      });

      const aggregateStartChanged = aggregateStartingTotal - aggregateUnchanged;
      const aggregateEndChanged = aggregateEndingTotal - aggregateUnchanged;

      const percChangedStart = aggregateStartingTotal > 0 ? Number(((aggregateStartChanged / aggregateStartingTotal) * 100).toFixed(1)) : 0;
      const percChanged = aggregateEndingTotal > 0 ? Number(((aggregateEndChanged / aggregateEndingTotal) * 100).toFixed(1)) : 0;
      const percUnchangedStart = aggregateStartingTotal > 0 ? Number(((aggregateUnchanged / aggregateStartingTotal) * 100).toFixed(1)) : 0;
      const percUnchanged = aggregateEndingTotal > 0 ? Number(((aggregateUnchanged / aggregateEndingTotal) * 100).toFixed(1)) : 0;

      // --- AGGREGATE CALCULATIONS (VERSION A: ADDITIVE) ---
      const additiveStartChanged = aggregateStartingTotal - additiveUnchangedTotal;
      const additiveEndChanged = aggregateEndingTotal - additiveUnchangedTotal;

      const additivePercChangedStart = aggregateStartingTotal > 0 ? Number(((additiveStartChanged / aggregateStartingTotal) * 100).toFixed(1)) : 0;
      const additivePercChanged = aggregateEndingTotal > 0 ? Number(((additiveEndChanged / aggregateEndingTotal) * 100).toFixed(1)) : 0;
      const additivePercUnchangedStart = aggregateStartingTotal > 0 ? Number(((additiveUnchangedTotal / aggregateStartingTotal) * 100).toFixed(1)) : 0;
      const additivePercUnchanged = aggregateEndingTotal > 0 ? Number(((additiveUnchangedTotal / aggregateEndingTotal) * 100).toFixed(1)) : 0;

      const remainingDigits = allGridTokens
        .filter(token => token && token.stableId && !token.isSymbol && !selectionsArray.includes(token.stableId))
        .map(token => token.originalDigit || token.token);

      // --- 2. Performance Mapping & Masking ---
      const generateMaskedUnit = (targetUnit, matchedDigits) => {
        if (!targetUnit) return "";
        let result = "";
        let digitIdx = 0;
        for (let char of targetUnit) {
          if (/[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(char)) {
            if (matchedDigits[digitIdx] && matchedDigits[digitIdx] !== '_') result += char;
            else result += "_";
            digitIdx++;
          } else {
            result += char;
          }
        }
        return result;
      };

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

        const allocateAndFormat = (str, segmentType) => {
          if (!str) return "";
          const regex = (segmentType === 'dim') ? /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/ : /[0-9]/;
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
          extraneousDigits: tempBank,
          styledDigits: isPerfect ? requiredDigits.toString().split('').map(d => ({ char: d, color: null })) : []
        };
      });

      // --- 3. Equation Identification ---
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

      // --- 3.5 Collect Extraneous Digits ---
      let extraneousToKeep = [];
      if (eqString !== "" && originalSet) {
        performance.forEach(p => {
          if (originalSet.members.includes(p.symbol)) {
            extraneousToKeep.push(...p.extraneousDigits);
          }
        });
      } else {
        performance.forEach(p => {
          if (p.isPerfect) {
            extraneousToKeep.push(...p.extraneousDigits);
          }
        });
      }

      const finalUnusedDigits = [...remainingDigits, ...extraneousToKeep];

      // --- 4. Badge Identification & Styled Data ---
      const badgeList = [];
      const badgeTargets = {
        "sigma": { versions: [["3", "4", "1", "3", "4", "4", "7", "4", "6", "0", "6", "8"], ["3", "4", "1", "3", "4", "4", "7", "4", "6", "0", "6"], ["3", "4", "1", "3", "4", "4", "7", "4", "6", "0"], ["3", "4", "1", "3", "4", "4", "7", "4", "6"], ["3", "4", "1", "3", "4", "4", "7", "4"], ["3", "4", "1", "3", "4", "4", "7"], ["3", "4", "1", "3", "4", "4"], ["3", "4", "1", "3", "4"], ["3", "4", "1", "3"], ["3", "4", "1"], ["3", "4"]], color: "#FF69B4" },
        "gold": { versions: [["1", "9", "6", "9"], ["1", "9", "6"], ["7", "9"]], color: "gold" },
        "gold2": { versions: [["7", "9"]], color: "gold" },
        "gold3": { versions: [["1", "1", "6"]], color: "gold" },
        "blue_camel": { versions: [["7", "3"]], color: "#3b82f6" },
        "green_camel": { versions: [["2", "1", "9"]], color: "#10b981" }
      };

      const createStyled = (val) => String(val).split('').map(c => ({ char: c, color: null }));

      const styledData = {
        globalStats: {
          startingTotal: createStyled(aggregateStartingTotal),
          endingTotal: createStyled(aggregateEndingTotal),
          startChanged: createStyled(aggregateStartChanged),
          changed: createStyled(aggregateEndChanged),
          unchanged: createStyled(aggregateUnchanged)
        },
        globalPercentages: {
          percChangedStart: createStyled(percChangedStart),
          percChanged: createStyled(percChanged),
          percUnchangedStart: createStyled(percUnchangedStart),
          percUnchanged: createStyled(percUnchanged)
        },
        additiveStats: isMultiGrid ? {
          startingTotal: createStyled(aggregateStartingTotal),
          endingTotal: createStyled(aggregateEndingTotal),
          startChanged: createStyled(additiveStartChanged),
          changed: createStyled(additiveEndChanged),
          unchanged: createStyled(additiveUnchangedTotal)
        } : {},
        additivePercentages: isMultiGrid ? {
          percChangedStart: createStyled(additivePercChangedStart),
          percChanged: createStyled(additivePercChanged),
          percUnchangedStart: createStyled(additivePercUnchangedStart),
          percUnchanged: createStyled(additivePercUnchanged)
        } : {},
        gridStats: {}
      };

      if (isMultiGrid) {
        settings.gridTypes.forEach(type => {
          const gm = gridMetrics[type];
          styledData.gridStats[type] = {
            stats: {
              startingTotal: createStyled(gm.startingTotal),
              endingTotal: createStyled(gm.endingTotal),
              startChanged: createStyled(gm.startChanged),
              changed: createStyled(gm.changed),
              unchanged: createStyled(gm.unchanged)
            },
            percentages: {
              percChangedStart: createStyled(gm.percChangedStart),
              percChanged: createStyled(gm.percChanged),
              percUnchangedStart: createStyled(gm.percUnchangedStart),
              percUnchanged: createStyled(gm.percUnchanged)
            }
          };
        });
      }

      const pools = [];

      const addPool = (poolName, targetDataObj) => {
        if (!targetDataObj || Object.keys(targetDataObj).length === 0) return;
        pools.push({
          name: poolName,
          get source() {
            return Object.values(targetDataObj)
              .flatMap(arr => arr)
              .filter(sd => !sd.color) 
              .map(sd => sd.char)
              .join('');
          },
          applyStyle: (targetChar, color) => {
            for (const key of Object.keys(targetDataObj)) {
              const digitObj = targetDataObj[key].find(sd => sd.char === targetChar && !sd.color);
              if (digitObj) {
                digitObj.color = color;
                return true;
              }
            }
            return false;
          }
        });
      };

      pools.push({
        name: "digits",
        get source() {
          return performance.filter(p => p.isPerfect).flatMap(p => p.styledDigits).filter(sd => !sd.color).map(sd => sd.char).join('');
        },
        applyStyle: (targetChar, color) => {
          for (let p of performance) {
            if (p.isPerfect) {
              const digitObj = p.styledDigits.find(sd => sd.char === targetChar && !sd.color);
              if (digitObj) { digitObj.color = color; return true; }
            }
          }
          return false;
        }
      });

      addPool("globalStats", styledData.globalStats);
      addPool("globalPercentages", styledData.globalPercentages);

      if (isMultiGrid) {
        addPool("additiveStats", styledData.additiveStats);
        addPool("additivePercentages", styledData.additivePercentages);
        settings.gridTypes.forEach(type => {
          addPool(`gridStats_${type}`, styledData.gridStats[type].stats);
          addPool(`gridPercentages_${type}`, styledData.gridStats[type].percentages);
        });
      }

      const hasPermutation = (sourceString, targetDigitsArray) => {
        let tempPool = sourceString.split('');
        return targetDigitsArray.every(d => {
          const idx = tempPool.indexOf(d);
          if (idx !== -1) {
            tempPool.splice(idx, 1);
            return true;
          }
          return false;
        });
      };

      Object.entries(badgeTargets).forEach(([badgeKey, config]) => {
        for (const pool of pools) {
          let poolHasBadge = true;

          while (poolHasBadge) {
            let awardedThisIteration = false;

            for (const version of config.versions) {
              if (hasPermutation(pool.source, version)) {
                badgeList.push(badgeKey);
                version.forEach(targetChar => pool.applyStyle(targetChar, config.color));
                awardedThisIteration = true;
                break; 
              }
            }

            if (!awardedThisIteration) {
              poolHasBadge = false; 
            }
          }
        }
      });

      // --- 4.5 NEW: Calculate Gems Earned ---
      let totalGems = 0;
      if (eqString !== "") {
        const gemValues = {
          "sigma": 10,
          "gold": 15,
          "gold2": 15,
          "gold3": 15,
          "blue_camel": 20,
          "green_camel": 20
        };

        // Iterating through badgeList handles multiples gracefully 
        // (e.g., getting "gold" twice awards 30 gems)
        badgeList.forEach(badge => {
          if (gemValues[badge]) {
            totalGems += gemValues[badge];
          }
        });
      }

      // --- 5. Final Submission ---
      const highscoreData = {
        userId: user?.uid || "Guest",
        display_name: userName || "Guest", 
        gemsEarned: totalGems,
        topic: settings.topic || "General",
        word: settings.word,
        originalValue: wordVal,
        language: settings.language,
        grids: settings.gridTypes,
        results: performance,
        isDimensioned: isGloballyDimensioned,
        badges: badgeList,
        
        // EXPORT ENTIRE EXPANDED STYLED DATA FOR RENDERER
        styledStatsData: styledData,
        unusedDigits: finalUnusedDigits,

        // SHARED TOTALS
        startingTotal: aggregateStartingTotal,
        totalDigitsDisplayed: aggregateEndingTotal,

        // GLOBAL GRID CHANGE STATS (GLOBAL BAG)
        aggregateStartChanged: aggregateStartChanged,
        changedDigits: aggregateEndChanged,
        unchangedDigits: aggregateUnchanged,
        aggregatePercentChangedStart: percChangedStart,
        percentageChanged: percChanged,
        aggregatePercentUnchangedStart: percUnchangedStart,
        percentageUnchanged: percUnchanged,

        // ADDITIVE GRID CHANGE STATS
        ...(isMultiGrid && {
          additiveAggregateStartChanged: additiveStartChanged,
          additiveChangedDigits: additiveEndChanged,
          additiveUnchangedDigits: additiveUnchangedTotal,
          additiveAggregatePercentChangedStart: additivePercChangedStart,
          additivePercentageChanged: additivePercChanged,
          additiveAggregatePercentUnchangedStart: additivePercUnchangedStart,
          additivePercentageUnchanged: additivePercUnchanged,
          gridBreakdown: gridMetrics,
        }),
        
        timestamp: serverTimestamp(),
        isTruncated: isGloballyTruncated,
        isOrganized: isGloballyOrganized,
        associatedId: eqId,
        associatedEquation: eqString,
        equationMembers: originalSet ? originalSet.members : []
      };
      
      // --- NEW: Immediately update the user's gem count in Firebase ---
      if (user?.uid) {
        await addDoc(collection(db, "constants_highscores"), highscoreData);
        
        // 2. Only update the user document if userRef exists
        if (totalGems > 0 && userRef) {
          await updateDoc(userRef, {
            gems: increment(totalGems)
          });
        }
        alert("Score submitted successfully!");
      } else {
        // Guest Logic: Just log it and skip Firebase to avoid crashes
        console.log("Guest mode: Score not saved to Firebase.");
      }

      // 3. Always move the user to the next screen, regardless of guest status
      setStep('HIGHSCORES');

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

  // 4. Scoring Logic (Truncation & Tie-Breaking)
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

        const dimDigits = override.isDimensioned 
          ? (data.dim || "").split('').filter(char => /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(char))
          : [];

        const otherDigits = ((data.mult || "") + (data.exp || "")).split('').filter(char => /[0-9]/.test(char));
        
        const allRequiredDigits = [...valChars.filter(c => /[0-9]/.test(c)), ...otherDigits, ...dimDigits];

        let maxPercent = 0;
        let maxConsecutiveOverall = 0; // NEW: Track highest streak globally
        let bestColor = null;

        PALETTE.forEach(color => {
          const userBank = [...(colorMap[color] || [])];
          let tempUserBank = [...userBank];
          let totalMatched = 0;
          
          let currentConsecutive = 0; // Track current running streak
          let maxConsecutive = 0;     // Track best streak for this specific color

          allRequiredDigits.forEach(char => {
            const bIdx = tempUserBank.indexOf(char);
            if (bIdx !== -1) {
              totalMatched++;
              tempUserBank.splice(bIdx, 1);
              
              // NEW: Increase streak on successful match
              currentConsecutive++;
              if (currentConsecutive > maxConsecutive) {
                maxConsecutive = currentConsecutive;
              }
            } else {
              // NEW: Break streak on miss
              currentConsecutive = 0;
            }
          });

          const totalRequired = allRequiredDigits.length;
          let percent = totalRequired > 0 ? (totalMatched / totalRequired) * 100 : 0;

          // --- UPDATED TIE-BREAKER LOGIC ---
          if (percent > maxPercent) { 
            maxPercent = percent; 
            maxConsecutiveOverall = maxConsecutive; // Lock in the new highest streak
            bestColor = color; 
          } else if (percent > 0 && percent === maxPercent) {
            // Primary Tie-Breaker: Most consecutive highlighted digits
            if (maxConsecutive > maxConsecutiveOverall) {
              maxConsecutiveOverall = maxConsecutive;
              bestColor = color;
            } 
            // Final Fallback: If even the streaks tie, use the active tool color
            else if (maxConsecutive === maxConsecutiveOverall && color === activeColor) {
              bestColor = color;
            }
          }
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
  }, [selections, gridTokens, cardOverrides, activeColor]);

  const avgMatch = matchResults.reduce((acc, curr) => acc + curr.percent, 0) / matchResults.length;
  const brightness = 26 + (avgMatch * 0.4);

  return (
    <div className="game-screen-container" onMouseUp={() => setIsDragging(false)}>
      <div className="game-content-max-width">
        <div className="left-scroll-column">
          <div className="action-footer nav-header">
            <button onClick={() => setStep('TOPIC')} className="reset-btn">Home</button>
            <button onClick={clearAllHighlights} className="reset-btn">Clear<span className="desktop-text"> All Highlights</span></button>
            <button onClick={resetToOriginal} className="reset-btn">Reset</button>
            <button onClick={handleSubmitScore} className="reset-btn submit-btn">Submit<span className="desktop-text"> Score</span></button>
          </div>
          <div className="game-title-container">
            <h2 className="game-main-title">
              {settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})
            </h2>
          </div>
          
          <div className="grid-x-scroller">
            <div className="grid-stack">
              {settings.gridTypes.map(type => (
                <div key={type}>
                  <h5 className="grid-section-label">{type}</h5>
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
            <button onClick={clearAllHighlights} className="reset-btn">Clear<span className="desktop-text"> All Highlights</span></button>
            <button onClick={resetToOriginal} className="reset-btn">Reset</button>
            <button onClick={handleSubmitScore} className="reset-btn submit-btn">Submit<span className="desktop-text"> Score</span></button>
          </div>
        </div>

        <div className="sticky-right-panel" style={{ backgroundColor: `rgb(${brightness}, ${brightness + 5}, ${brightness + 10})` }}>
          <div className="control-btn-group">
            <button
              onClick={handleGlobalOrganize}
              className={`reset-btn toggle-btn ${isGloballyOrganized ? 'organized-active' : ''}`}
            >
              {isGloballyOrganized ? 'Organized' : 'Organize'}
            </button>

            <button
              onClick={handleGlobalTruncate}
              className={`reset-btn toggle-btn ${isGloballyTruncated ? 'truncated-active' : ''}`}
            >
              {isGloballyTruncated ? 'Truncated' : 'Truncate'}
            </button>

            <button
              onClick={handleGlobalDimension}
              className={`reset-btn toggle-btn ${isGloballyDimensioned ? 'dimension-active' : ''}`}
            >
              {isGloballyDimensioned ? 'Dimensioned' : 'Dimension'}
            </button>
          </div>

          <div className="palette-container">
            {PALETTE.map(color => (
              <div 
                key={color} 
                onClick={() => setActiveColor(color)} 
                className={`color-swatch ${activeColor === color ? 'active' : ''}`} 
                style={{ backgroundColor: color }} 
              />
            ))}
            <div className="palette-divider" />
            <button onClick={() => setActiveColor('BIN')} className="tool-btn" style={{ backgroundColor: activeColor === 'BIN' ? '#3b82f6' : '#333' }}>BIN</button>
            <button onClick={() => setActiveColor('DEC')} className="tool-btn" style={{ backgroundColor: activeColor === 'DEC' ? '#3b82f6' : '#333' }}>DEC</button>
          </div>

          {activeColor === 'DEC' && boxedData && (
            <div className="permutation-box">
              <div className="perm-label">CONVERT GRID:</div>
              <div className="perm-btn-grid">
                {boxedData.perms.filter(p => p <= 9).length > 0 ? (
                  boxedData.perms.filter(p => p <= 9).map((p, idx) => (
                    <button key={idx} onClick={() => handlePermutationClick(p)} className="perm-click-btn">{p}</button>
                  ))
                ) : (
                  <div className="perm-label">Invalid selection.</div>
                )}
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