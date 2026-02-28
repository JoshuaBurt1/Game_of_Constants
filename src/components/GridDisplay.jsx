import React, { useMemo, useRef } from 'react';

const GridDisplay = ({ 
  gridType, tokens, selections, setSelections, activeColor, 
  isDragging, setIsDragging, binaryMaps, setBinaryMaps, 
  boxSelections, setBoxSelections, SYMBOLS 
}) => {
  
  const lastInteractedId = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  
  // NEW: Tracks whether the current continuous drag/tap is meant to paint or erase
  const dragModeRef = useRef(null); 

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

  // NEW: Added isStart parameter to determine if we need to lock in a paint/erase mode
  const handleInteraction = (item, isStart = false) => {
    if (!item || item.isSymbol || item.token === " ") return;
    
    const interactionId = `${gridType}-${item.baseIdx}-${item.subIdx}`;
    if (lastInteractedId.current === interactionId) return;
    lastInteractedId.current = interactionId;

    const binaryKey = `${gridType}-${item.baseIdx}`;

    if (activeColor === 'BIN') {
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

    // REWRITTEN: Coloring mode now respects the locked-in dragModeRef
    setSelections(prev => {
      const currentGrid = prev[gridType] || {};
      const isCurrentlyActive = currentGrid[item.stableId] === activeColor;

      // If this is the initial tap/click, lock in the opposite of the current state
      if (isStart) {
        dragModeRef.current = isCurrentlyActive ? 'erase' : 'paint';
      }

      // Apply the mode
      if (dragModeRef.current === 'erase') {
        if (isCurrentlyActive) {
          return { ...prev, [gridType]: { ...currentGrid, [item.stableId]: null } };
        }
      } else if (dragModeRef.current === 'paint') {
        if (!isCurrentlyActive) {
          return { ...prev, [gridType]: { ...currentGrid, [item.stableId]: activeColor } };
        }
      }

      return prev; // No change needed if it already matches the mode
    });
  };

  // --- MOBILE TOUCH HANDLING ---

  const handleTouchStart = (e, item) => {
    if (e.cancelable) e.preventDefault(); // Moved here to ensure OS gestures are blocked immediately

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    lastInteractedId.current = null; 
    setIsDragging(true);
    handleInteraction(item, true); // true = This is the start of an interaction
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

    if (targetEl && targetEl.dataset.stableId) {
      const itemData = {
        stableId: targetEl.dataset.stableId,
        baseIdx: parseInt(targetEl.dataset.baseIdx),
        subIdx: parseInt(targetEl.dataset.subIdx),
        isBinary: targetEl.dataset.isBinary === 'true',
        token: targetEl.innerText
      };
      handleInteraction(itemData, false); // false = We are continuing a drag, don't change modes
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastInteractedId.current = null;
    dragModeRef.current = null; // Clear the mode
  };

  return (
    <div 
      className="grid-root"
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      // NEW: Apply structural touch locks to the parent container
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
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
                    lastInteractedId.current = null;
                    handleInteraction(item, true); // true = Initial click locks the mode
                  }
                }}
                onMouseEnter={() => {
                  if (isDragging && !isSymStyle && !shouldHide && !isSpacer) {
                    handleInteraction(item, false); // false = Continuing drag
                  }
                }}
                // --- Mobile Touch ---
                onTouchStart={(e) => {
                  if (!isSymStyle && !shouldHide && !isSpacer) {
                    handleTouchStart(e, item);
                  }
                }}
                style={{ 
                  backgroundColor: highlightColor || undefined,
                  visibility: shouldHide ? 'hidden' : 'visible',
                  touchAction: 'none', 
                  userSelect: 'none',  
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