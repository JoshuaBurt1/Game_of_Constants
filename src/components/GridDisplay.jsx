import React, { useMemo, useRef } from 'react';

const GridDisplay = ({ 
  gridType, tokens, selections, setSelections, activeColor, 
  isDragging, setIsDragging, binaryMaps, setBinaryMaps, 
  boxSelections, setBoxSelections, SYMBOLS 
}) => {
  
  // Track the last item interacted with during a single drag to avoid flip-flop toggling
  const lastInteractedId = useRef(null);

  const expandedData = useMemo(() => {
    if (!tokens) return [];
    let result = [];
    tokens.forEach((item, baseIdx) => {
      const binaryKey = `${gridType}-${baseIdx}`;
      const currentVal = item?.token !== undefined ? item.token : item;

      if (item === null) {
        result.push({ token: null, baseIdx });
      } else if (item.isSymbol) {
        result.push({ ...item, baseIdx, subIdx: 0 });
      } else if (binaryMaps[binaryKey]) {
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
    if (!item || item.isSymbol || item.token === " ") return;
    
    // Safety check: Don't toggle the same cell twice in one drag session
    if (lastInteractedId.current === item.stableId) return;
    lastInteractedId.current = item.stableId;

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
          next[boxKey] ? delete next[boxKey] : (next[boxKey] = item.token);
          return next;
        });
      } else {
        setBinaryMaps(prev => ({ ...prev, [binaryKey]: false }));
      }
      return;
    }

    setSelections(prev => {
      const newMap = { ...prev };
      const currentGrid = { ...(newMap[gridType] || {}) };
      currentGrid[item.stableId] = currentGrid[item.stableId] === activeColor ? null : activeColor;
      newMap[gridType] = currentGrid;
      return newMap;
    });
  };

  // --- TOUCH HANDLERS ---
  const handleTouchMove = (e) => {
    if (!isDragging) return;

    // Identify the element currently under the user's finger
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

    // If the element is one of our grid tokens, extract data and interact
    if (targetEl && targetEl.dataset.stableId) {
      const itemData = {
        stableId: targetEl.dataset.stableId,
        baseIdx: parseInt(targetEl.dataset.baseIdx),
        subIdx: parseInt(targetEl.dataset.subIdx),
        isBinary: targetEl.dataset.isBinary === 'true',
        token: targetEl.innerText
      };
      handleInteraction(itemData);
    }
  };

  const stopDragging = () => {
    setIsDragging(false);
    lastInteractedId.current = null;
  };

  return (
    <div 
      className="grid-root"
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onTouchMove={handleTouchMove}
      onTouchEnd={stopDragging}
      onTouchCancel={stopDragging}
    >
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="grid-row">
          {row.map((item, i) => {
            const isSpacer = item.token === " ";
            const isSymbolToken = SYMBOLS.includes(item.token) || item.isSymbol;
            const shouldHide = rIdx === 3 && (isSpacer || isSymbolToken);
            const isSymStyle = isSymbolToken && !isSpacer;
            const highlightColor = (!isSymStyle && !shouldHide) ? (selections[gridType] || {})[item.stableId] : null;
            const boxKey = `${gridType}-${item.baseIdx}-${item.subIdx}`;
            const isBoxed = boxSelections[boxKey] !== undefined && boxSelections[boxKey] !== null;

            return (
              <div
                key={`${item.stableId}-${i}`}
                // Data attributes allow handleTouchMove to identify the cell
                data-stable-id={item.stableId}
                data-base-idx={item.baseIdx}
                data-sub-idx={item.subIdx}
                data-is-binary={item.isBinary}
                className={[
                  'grid-token',
                  item.isBinary ? 'binary' : 'decimal',
                  isSymStyle ? 'symbol' : 'interactive',
                  shouldHide ? 'hidden' : '',
                  isBoxed ? 'boxed' : '',
                ].join(' ')}
                onMouseDown={() => {
                  if (!isSymStyle && !shouldHide && !isSpacer) {
                    setIsDragging(true);
                    handleInteraction(item);
                  }
                }}
                onMouseEnter={() => {
                  if (isDragging && !isSymStyle && !shouldHide && !isSpacer) {
                    handleInteraction(item);
                  }
                }}
                onTouchStart={(e) => {
                  if (!isSymStyle && !shouldHide && !isSpacer) {
                    // Prevent page scrolling while dragging on the grid
                    if (e.cancelable) e.preventDefault();
                    setIsDragging(true);
                    handleInteraction(item);
                  }
                }}
                style={{ 
                  backgroundColor: highlightColor || undefined,
                  visibility: shouldHide ? 'hidden' : 'visible'
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

export default GridDisplay;