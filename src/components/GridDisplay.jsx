import React, { useMemo, useRef } from 'react';

const GridDisplay = ({ 
  gridType, tokens, selections, setSelections, activeColor, 
  isDragging, setIsDragging, binaryMaps, setBinaryMaps, 
  boxSelections, setBoxSelections, SYMBOLS 
}) => {
  
  const lastInteractedId = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const dragModeRef = useRef(null); 
  
  // NEW: Flag to prevent mobile "Ghost Clicks"
  const isTouchRef = useRef(false);

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
          const isCurrentlyActive = !!next[boxKey];

          // NEW: Apply paint/erase lock for DEC mode
          if (isStart) {
            dragModeRef.current = isCurrentlyActive ? 'erase' : 'paint';
          }

          if (dragModeRef.current === 'erase' && isCurrentlyActive) {
            delete next[boxKey];
          } else if (dragModeRef.current === 'paint' && !isCurrentlyActive) {
            next[boxKey] = item.token;
          }
          
          return next;
        });
      } else if (binaryMaps[binaryKey] !== false) {
        setBinaryMaps(prev => ({ ...prev, [binaryKey]: false }));
      }
      return;
    }

    setSelections(prev => {
      const currentGrid = prev[gridType] || {};
      const isCurrentlyActive = currentGrid[item.stableId] === activeColor;

      if (isStart) {
        dragModeRef.current = isCurrentlyActive ? 'erase' : 'paint';
      }

      if (dragModeRef.current === 'erase') {
        if (isCurrentlyActive) {
          return { ...prev, [gridType]: { ...currentGrid, [item.stableId]: null } };
        }
      } else if (dragModeRef.current === 'paint') {
        if (!isCurrentlyActive) {
          return { ...prev, [gridType]: { ...currentGrid, [item.stableId]: activeColor } };
        }
      }

      return prev; 
    });
  };

  // --- MOBILE TOUCH HANDLING ---

  const handleTouchStart = (e, item) => {
    if (e.cancelable) e.preventDefault(); 

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    lastInteractedId.current = null; 
    setIsDragging(true);
    handleInteraction(item, true); 
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
      handleInteraction(itemData, false); 
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastInteractedId.current = null;
    dragModeRef.current = null; 
  };

  return (
    <div 
      className="grid-root"
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
                onMouseDown={(e) => {
                  if (isTouchRef.current) return; // Prevent ghost click
                  if (!isSymStyle && !shouldHide && !isSpacer) {
                    setIsDragging(true);
                    lastInteractedId.current = null;
                    handleInteraction(item, true); 
                  }
                }}
                onMouseEnter={(e) => {
                  if (isTouchRef.current) return; // Prevent ghost click
                  if (isDragging && !isSymStyle && !shouldHide && !isSpacer) {
                    handleInteraction(item, false); 
                  }
                }}
                // --- Mobile Touch ---
                onTouchStart={(e) => {
                  isTouchRef.current = true; // Tell the app to ignore mouse events
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