import React, { useMemo, useRef } from 'react';

const GridDisplay = ({ 
  gridType, tokens, selections, setSelections, activeColor, 
  isDragging, setIsDragging, binaryMaps, setBinaryMaps, 
  boxSelections, setBoxSelections, SYMBOLS 
}) => {
  
  const lastInteractedId = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

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
    
    // 1. Check if we're hitting the exact same sub-item again in one go
    const interactionId = `${gridType}-${item.baseIdx}-${item.subIdx}`;
    if (lastInteractedId.current === interactionId) return;
    lastInteractedId.current = interactionId;

    const binaryKey = `${gridType}-${item.baseIdx}`;

    if (activeColor === 'BIN') {
      // Only update if it's currently NOT binary
      if (!binaryMaps[binaryKey]) {
        setBinaryMaps(prev => ({ ...prev, [binaryKey]: true }));
      }
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
      } else if (binaryMaps[binaryKey] !== false) {
        setBinaryMaps(prev => ({ ...prev, [binaryKey]: false }));
      }
      return;
    }

    // Coloring mode: Only update if the color is actually changing
    setSelections(prev => {
      const currentGrid = prev[gridType] || {};
      if (currentGrid[item.stableId] === activeColor) {
        // Optional: Toggle off if clicking the same color
        const newGrid = { ...currentGrid, [item.stableId]: null };
        return { ...prev, [gridType]: newGrid };
      }
      const newGrid = { ...currentGrid, [item.stableId]: activeColor };
      return { ...prev, [gridType]: newGrid };
    });
  };

  // --- MOBILE TOUCH HANDLING ---

  const handleTouchStart = (e, item) => {
    // Record touch start for drag/tap distance logic
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // Clear the ref so this specific tap is ALWAYS processed
    lastInteractedId.current = null; 
    
    setIsDragging(true);
    handleInteraction(item);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

    // Ensure we are hovering over an actual token cell
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

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastInteractedId.current = null;
  };

  return (
    <div 
      className="grid-root"
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
                // --- Desktop Mouse ---
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
                // --- Mobile Touch ---
                onTouchStart={(e) => {
                  if (!isSymStyle && !shouldHide && !isSpacer) {
                    // Critical: Prevents the "magnifying glass" and scroll while painting
                    if (e.cancelable) e.preventDefault();
                    handleTouchStart(e, item);
                  }
                }}
                style={{ 
                  backgroundColor: highlightColor || undefined,
                  visibility: shouldHide ? 'hidden' : 'visible',
                  touchAction: 'none', // Prevents browser scroll/zoom gestures
                  userSelect: 'none',  // Prevents long-press copy/paste UI
                  WebkitUserSelect: 'none'
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