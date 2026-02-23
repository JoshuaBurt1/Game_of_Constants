//Live display of steps

{/* 
  // --- Live Grid Stats Calculation ---
  const gridStats = useMemo(() => {
    const stats = { total: { changed: 0, unchanged: 0 }, grids: {} };
    
    // Arrays to hold the combined pools across all grids
    const allOriginalPool = [];
    const allCurrentDigits = [];

    settings.gridTypes.forEach(type => {
      const tokensForThisGrid = gridTokens[type] || [];
      const currentDigits = tokensForThisGrid
        .filter(t => t && !t.isSymbol && /[0-9]/.test(String(t.token)))
        .map(t => String(t.token));

      const initialTokens = type === "Square Shell" ? getSquareShellData(wordVal) : getHexagonData(wordVal);
      const originalPool = initialTokens
        .filter(item => {
          const val = item?.token !== undefined ? String(item.token) : String(item);
          return !item?.isSymbol && /[0-9]/.test(val);
        })
        .map(item => item?.token !== undefined ? String(item.token) : String(item));

      // Calculate individual grid stats
      let gridUnchanged = 0;
      const tempOriginalPool = [...originalPool];

      currentDigits.forEach(digit => {
        const foundIdx = tempOriginalPool.indexOf(digit);
        if (foundIdx !== -1) {
          gridUnchanged++;
          tempOriginalPool.splice(foundIdx, 1);
        }
      });

      const gridChanged = currentDigits.length - gridUnchanged;

      // Save individual grid stats
      stats.grids[type] = {
        changed: gridChanged,
        unchanged: gridUnchanged
      };

      // Accumulate for true total calculation
      allCurrentDigits.push(...currentDigits);
      allOriginalPool.push(...originalPool);
    });

    // Calculate true global totals by pooling all grids
    let totalUnchanged = 0;
    const tempAllOriginalPool = [...allOriginalPool];

    allCurrentDigits.forEach(digit => {
      const foundIdx = tempAllOriginalPool.indexOf(digit);
      if (foundIdx !== -1) {
        totalUnchanged++;
        tempAllOriginalPool.splice(foundIdx, 1);
      }
    });

    stats.total.unchanged = totalUnchanged;
    stats.total.changed = allCurrentDigits.length - totalUnchanged;

    return stats;
  }, [gridTokens, settings.gridTypes, wordVal]);
  

return (
    <div className="game-screen-container" onMouseUp={() => setIsDragging(false)}>
      <div className="game-content-max-width">
        <div className="left-scroll-column">
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ margin: 0, letterSpacing: '1px', fontSize: '2rem', marginBottom: '15px' }}>
              {settings.word} ({ZODIAC_NAMES[settings.language][settings.word]})
            </h2>

            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              background: 'rgba(0,0,0,0.2)', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #333'
            }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '8px', fontWeight: 'bold' }}>
                <span style={{ letterSpacing: '1px', color: '#fff' }}>TOTAL GRIDS</span>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span style={{ color: '#10b981' }}>Unchanged: {gridStats.total.unchanged}</span>
                  <span style={{ color: '#3b82f6' }}>Changed: {gridStats.total.changed}</span>
                </div>
              </div>
              
              {settings.gridTypes.map(type => (
                <div key={`stat-${type}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#aaa', letterSpacing: '1px' }}>{type.toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <span style={{ color: 'rgba(16, 185, 137, 0.7)' }}>Unchanged: {gridStats.grids[type]?.unchanged || 0}</span>
                    <span style={{ color: 'rgba(59, 130, 246, 0.7)' }}>Changed: {gridStats.grids[type]?.changed || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
)*/}