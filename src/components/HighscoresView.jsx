import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './Highscores.css';
import camelBlueImg from '../assets/blue_camel.png'; 
import camelGreenImg from '../assets/green_camel.png';
import sndImg from '../assets/snd.png';

const LoadingBox = () => (
  <div className="loading-box">
    <div className="pulse-spinner" />
    <div className="loading-text">Retrieving Archives...</div>
  </div>
);

// Renamed for broader context, handles fallbacks gracefully
const renderStyledStat = (val, styledArr) => {
  if (styledArr && styledArr.length > 0) {
    return styledArr.map((obj, i) => (
      <span key={i} style={{ color: obj.color || 'inherit', fontWeight: obj.color ? 'bold' : 'normal' }}>
        {obj.char}
      </span>
    ));
  }
  return val; // Fallback for legacy scores
};

function HighscoresView({ onBack, newSubmissionId, gemAmount }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrids, setExpandedGrids] = useState(new Set());
  const [animateGems, setAnimateGems] = useState(false);
  const scrollContainerRef = useRef(null);
  const newRowRef = useRef(null);

  const toggleGrid = (id) => {
    const newSet = new Set(expandedGrids);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedGrids(newSet);
  };

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const q = query(collection(db, "constants_highscores"), orderBy("timestamp", "desc"), limit(68));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const sortedData = data.sort((a, b) => {
          const topicA = a.topic || ""; 
          const topicB = b.topic || "";
          if (topicA !== topicB) return topicB.localeCompare(topicA);
          return (b.word || "").localeCompare(a.word || "");
        });

        setScores(sortedData);

        // Logic for panning and gems
        if (newSubmissionId) {
          setTimeout(() => {
            if (newRowRef.current && scrollContainerRef.current) {
              const container = scrollContainerRef.current;
              const row = newRowRef.current;

              // Calculate the position to center the row ONLY inside the container
              const scrollPos = row.offsetTop - (container.offsetHeight / 2) + (row.offsetHeight / 2);

              container.scrollTo({
                top: scrollPos,
                behavior: 'smooth'
              });
              
              setAnimateGems(true);
            }
          }, 800);
        }

      } catch (err) {
        console.error("Error fetching scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [newSubmissionId]);

  return (
    <div className="hs-view-container">
      {loading ? <LoadingBox /> : (
        <div className="hs-main-card">
          <div className="hs-header">
            <h2 className="hs-menu-title">
              High Scores
            </h2>
            <button onClick={onBack} className="hs-menu-btn">
              Home
            </button>
          </div>

          <div className="hs-table-scroll" ref={scrollContainerRef}>
            <table className="hs-table">
              <thead>
                <tr>
                  <th>TOPIC</th>
                  <th>WORD / GRID</th>
                  <th>FUNCTIONS</th>
                  <th>MATCHES</th>
                  <th>EQUATION</th>
                  <th>REMAINING</th>
                  <th>DIGIT STATS</th>
                  <th>BADGES</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {scores.map(s => {
                  const isExpanded = expandedGrids.has(s.id);
                  const isNew = s.id === newSubmissionId;
                  // Constant style for vertical alignment
                  const cellStyle = { verticalAlign: 'top' };

                  return (
                    <tr key={s.id} className={`hs-row ${isNew ? 'hs-new-row' : ''}`} ref={isNew ? newRowRef : null}>
                      <td className="hs-cell" style={{ ...cellStyle, fontSize: '0.75rem', color: '#888' }}>{s.topic}</td>
                      
                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{s.word}</div>
                        <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '6px' }}>{s.language}</div>
                        {s.grids?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            {[...s.grids]
                              .sort((a, b) => b.localeCompare(a)) 
                              .map((g, idx) => {
                                return (
                                  <span key={idx} className="hs-badge">
                                    {g}
                                  </span>
                                );
                              })
                            }
                          </div>
                        )}
                      </td>

                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          {s.isOrganized && <span className="hs-modifier organized">Organized</span>}
                          {s.isTruncated && <span className="hs-modifier truncated">Truncated</span>}
                          {s.isDimensioned && <span className="hs-modifier dimensioned">Dimensioned</span>}
                          {(!s.isTruncated && !s.isOrganized && !s.isDimensioned) && <span className="hs-badge" style={{ opacity: 0.3 }}>None</span>}
                        </div>
                      </td>
                      
                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '4px', 
                          alignItems: 'flex-start',
                          paddingLeft: '12px',      
                          fontSize: '0.75rem' 
                        }}>
                          {(() => {
                            const hasEquation = s.associatedEquation && s.associatedEquation !== "";
                            const isEquationComplete = hasEquation && 
                              s.equationMembers?.length > 0 && 
                              s.equationMembers.every(member => 
                                s.results?.some(res => res.symbol === member && parseFloat(res.percent) >= 99.9)
                              );

                            return s.results?.slice(0, 6).map((res, idx) => {
                              const isMember = s.equationMembers?.includes(res.symbol);
                              const shouldHighlight = isMember && isEquationComplete;

                              return (
                                <div 
                                  key={idx} 
                                  className={`hs-match-item ${shouldHighlight ? 'highlighted' : ''}`}
                                  style={{ 
                                    fontWeight: isMember ? 'bold' : 'normal',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <strong>[{res.percent}%]</strong>
                                  <span> {res.symbol} =</span>
                                  
                                  <span style={{ opacity: 0.7, marginLeft: '6px', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                    {res.matchedVal}
                                    {res.matchedMult && ` × ${res.matchedMult}`}
                                    {res.matchedExp && (
                                      <sup style={{ fontSize: '0.5rem' }}>
                                        {res.matchedMag}{res.matchedExp}
                                      </sup>
                                    )}
                                    
                                    {s.isDimensioned && (res.matchedUnit || res.matchedDim) && (
                                      <span style={{ 
                                        marginLeft: '4px', 
                                        color: isMember ? '#10b981' : 'inherit', 
                                        fontWeight: isMember ? 'bold' : 'normal' 
                                      }}>
                                        {res.matchedUnit} 
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            });
                          })() || "-"}
                        </div>
                      </td>

                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          {s.associatedEquation ? (
                            <>
                              <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase' }}>
                                {s.associatedId?.replace(/_/g, ' ')}
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981', fontFamily: 'serif' }}>
                                {s.associatedEquation}
                              </div>
                            </>
                          ) : <div className="hs-badge" style={{ border: 'none', background: 'none' }}>None</div>}
                        </div>
                      </td>

                      <td className="hs-cell" style={cellStyle}>
                        <div className="hs-unused-list">
                          <div style={{ color: '#888', marginBottom: '2px', fontSize: '0.6rem', fontWeight: 'bold' }}>
                            TOTAL: ({s.unusedDigits?.length || 0}) 
                          </div>
                          <div style={{ color: '#aaa', marginBottom: isExpanded ? '10px' : '0' }}>
                            {s.unusedDigits?.length > 0 ? s.unusedDigits.join(', ') : "-"}
                          </div>

                          {isExpanded && s.gridBreakdown && 
                            Object.entries(s.gridBreakdown)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([gridName, metrics]) => (
                                <div key={gridName} className="hs-grid-breakdown-box">
                                  <div className="hs-grid-label">{gridName}</div>
                                  <div className="hs-grid-unused">
                                    <span style={{ color: '#666', fontSize: '0.6rem' }}>Unused ({metrics.unusedDigits?.length || 0}):</span>
                                    <div className="hs-monospace-list">
                                      {metrics.unusedDigits?.length > 0 ? metrics.unusedDigits.join(', ') : 'None'}
                                    </div>
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      </td>

                      {/* Updated Digits Section */}
                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', minWidth: '160px' }}>
                          <div style={{ paddingBottom: '6px', borderBottom: (s.grids?.length > 1 && s.gridBreakdown && isExpanded) ? '1px solid #333' : 'none' }}>
                            
                            {/* DIGITS ROW (Equation Matches) */}
                            <div className="hs-stat-text" style={{ marginBottom: '8px' }}>
                              Digits: <span className="hs-stat-val">
                                {s.results?.filter(res => res.isPerfect).map((res, i, arr) => (
                                  <span key={i}>
                                    {res.symbol}: {renderStyledStat(res.perfectDigitCount, res.styledDigits)}
                                    {i < arr.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </span>
                            </div>

                            {/* COMPARISONS WRAPPER */}
                            <div className="hs-stats-row">
                              {/* GLOBAL TOTALS */}
                              <div className="hs-global-block">
                                <div style={{ fontSize: '0.55rem', color: '#555', marginBottom: '2px', fontWeight: 'bold' }}>GLOBAL COMPARISON</div>
                                <div className="hs-stat-text">
                                  Start/End: <span className="hs-stat-val">
                                    {renderStyledStat(s.startingTotal, s.styledStatsData?.globalStats?.startingTotal)} / {renderStyledStat(s.totalDigitsDisplayed, s.styledStatsData?.globalStats?.endingTotal)}
                                  </span>
                                </div>
                                <div className="hs-stat-text">
                                  Changed: <span className="hs-stat-val">
                                    {renderStyledStat(s.aggregateStartChanged, s.styledStatsData?.globalStats?.startChanged)} / {renderStyledStat(s.changedDigits, s.styledStatsData?.globalStats?.changed)}
                                  </span> ({renderStyledStat(s.aggregatePercentChangedStart, s.styledStatsData?.globalPercentages?.percChangedStart)}%) / ({renderStyledStat(s.percentageChanged, s.styledStatsData?.globalPercentages?.percChanged)}%)
                                </div>
                                <div className="hs-stat-text">
                                  Unchanged: <span className="hs-stat-val">
                                    {renderStyledStat(s.unchangedDigits, s.styledStatsData?.globalStats?.unchanged)}
                                  </span> ({renderStyledStat(s.aggregatePercentUnchangedStart, s.styledStatsData?.globalPercentages?.percUnchangedStart)}%) / ({renderStyledStat(s.percentageUnchanged, s.styledStatsData?.globalPercentages?.percUnchanged)}%)
                                </div>
                              </div>

                              {/* ADDITIVE TOTALS */}
                              {s.grids?.length > 1 && s.additiveUnchangedDigits !== undefined && (
                                <div className="hs-additive-block">
                                  <div style={{ fontSize: '0.55rem', color: '#555', marginBottom: '2px', fontWeight: 'bold' }}>ADDITIVE COMPARISON</div>
                                  <div className="hs-stat-text">
                                    Start/End: <span className="hs-stat-val">
                                      {renderStyledStat(s.startingTotal, s.styledStatsData?.additiveStats?.startingTotal)} / {renderStyledStat(s.totalDigitsDisplayed, s.styledStatsData?.additiveStats?.endingTotal)}
                                    </span>
                                  </div>
                                  <div className="hs-stat-text">
                                    Changed: <span className="hs-stat-val">
                                      {renderStyledStat(s.additiveAggregateStartChanged, s.styledStatsData?.additiveStats?.startChanged)} / {renderStyledStat(s.additiveChangedDigits, s.styledStatsData?.additiveStats?.changed)}
                                    </span> ({renderStyledStat(s.additiveAggregatePercentChangedStart, s.styledStatsData?.additivePercentages?.percChangedStart)}%) / ({renderStyledStat(s.additivePercentageChanged, s.styledStatsData?.additivePercentages?.percChanged)}%)
                                  </div>
                                  <div className="hs-stat-text">
                                    Unchanged: <span className="hs-stat-val">
                                      {renderStyledStat(s.additiveUnchangedDigits, s.styledStatsData?.additiveStats?.unchanged)}
                                    </span> ({renderStyledStat(s.additiveAggregatePercentUnchangedStart, s.styledStatsData?.additivePercentages?.percUnchangedStart)}%) / ({renderStyledStat(s.additivePercentageUnchanged, s.styledStatsData?.additivePercentages?.percUnchanged)}%)
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              {s.grids?.length > 1 && s.gridBreakdown && (
                                <button className="hs-grid-btn" onClick={() => toggleGrid(s.id)}>
                                  {isExpanded ? 'Hide' : 'Grids'}
                                  <span className="hs-grid-arrow" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                </button>
                              )}
                            </div>

                          {/* BREAKDOWN LIST - Now wrapped in a row for mobile flex */}
                          {isExpanded && s.grids?.length > 1 && s.gridBreakdown && (
                            <div className="hs-grids-row">
                              {Object.entries(s.gridBreakdown)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([gridName, metrics]) => {
                                  const gridData = s.styledStatsData?.gridStats?.[gridName];
                                  return (
                                    <div key={gridName} className="hs-grid-breakdown-box">
                                      <div className="hs-grid-label">{gridName}</div>
                                      <div className="hs-stat-text" style={{ fontSize: '0.65rem' }}>
                                        <div>Start/End: <span className="hs-stat-val">
                                          {renderStyledStat(metrics.startingTotal, gridData?.stats?.startingTotal)} / {renderStyledStat(metrics.endingTotal, gridData?.stats?.endingTotal)}
                                        </span></div>
                                        <div>Changed: <span className="hs-stat-val">
                                          {renderStyledStat(metrics.startChanged, gridData?.stats?.startChanged)} / {renderStyledStat(metrics.changed, gridData?.stats?.changed)}
                                        </span> ({renderStyledStat(metrics.percentChangedStart, gridData?.percentages?.percChangedStart)}%) / ({renderStyledStat(metrics.percentChanged, gridData?.percentages?.percChanged)}%)</div>
                                        <div>Unchanged: <span className="hs-stat-val">
                                          {renderStyledStat(metrics.unchanged, gridData?.stats?.unchanged)}
                                        </span> ({renderStyledStat(metrics.percentUnchangedStart, gridData?.percentages?.percUnchangedStart)}%) / ({renderStyledStat(metrics.percentUnchanged, gridData?.percentages?.percUnchanged)}%)</div>
                                      </div>
                                    </div>
                                  );
                                })
                              }
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="hs-cell" style={cellStyle}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {(() => {
                            if (!s.badges || s.badges.length === 0) return <span style={{ color: '#444' }}>—</span>;
                            
                            // Group identical badges and normalize the gold trophies
                            const badgeCounts = s.badges.reduce((acc, badge) => {
                              const normalizedBadge = badge.startsWith("gold") ? "gold" : badge;
                              acc[normalizedBadge] = (acc[normalizedBadge] || 0) + 1;
                              return acc;
                            }, {});

                            return Object.entries(badgeCounts).map(([badge, count]) => {
                              let icon = null;
                              if (badge === "green_camel") icon = <img src={camelGreenImg} style={{ width: '20px', height: '20px' }} alt="Green Camel" />;
                              else if (badge === "blue_camel") icon = <img src={camelBlueImg} style={{ width: '20px', height: '20px' }} alt="Blue Camel" />;
                              else if (badge === "sigma") icon = <img src={sndImg} style={{ width: '20px', height: '20px' }} alt="Sigma" />;
                              else if (badge === "gold") icon = <span style={{ fontSize: '1.2rem' }} title="Gold">🏆</span>;
                              
                              if (!icon) return null;

                              return (
                                <div key={badge} style={{ display: 'flex', alignItems: 'flex-start' }}>
                                  {icon}
                                  {count > 1 && (
                                    <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '2px' }}>
                                      x{count}
                                    </span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </td>
                      <td className="hs-cell" style={{ ...cellStyle, fontSize: '0.65rem', color: '#666', position: 'relative' }}>
                        <div className="hs-date-user-wrapper">
                          <div className="hs-timestamp" style={{ lineHeight: '1.2' }}>
                            {s.timestamp ? (
                              <>
                                <div>
                                  {s.timestamp.toDate().toLocaleDateString([], { 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    year: '2-digit' 
                                  })}
                                </div>
                                <div>
                                  {s.timestamp.toDate().toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit',
                                    hour12: false 
                                  })}
                                </div>
                              </>
                            ) : (
                              'Recent'
                            )}
                          </div>
                          
                          <div className="hs-display_name" style={{ fontWeight: 'bold', marginTop: '2px' }}>
                            {s.display_name || "Anonymous"}
                          </div>
                          
                          {/* Gem Animation Trigger */}
                          {isNew && animateGems && (
                            <div className="gem-float-animation">
                              💎 +{gemAmount || 0}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default HighscoresView;