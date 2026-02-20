import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './Highscores.css'; // Import the new CSS

const LoadingBox = () => (
  <div className="loading-box">
    <div className="pulse-spinner" />
    <div className="loading-text">Retrieving Archives...</div>
  </div>
);

function HighscoresView({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrids, setExpandedGrids] = useState(new Set());

  const toggleGrid = (id) => {
    const newSet = new Set(expandedGrids);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedGrids(newSet);
  };

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const q = query(collection(db, "highscores"), orderBy("timestamp", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sorting logic remains unchanged
        const sortedData = data.sort((a, b) => {
          const topicA = a.topic || ""; const topicB = b.topic || "";
          if (topicA !== topicB) return topicA.localeCompare(topicB);
          return (a.word || "").localeCompare(b.word || "");
        });

        setScores(sortedData);
      } catch (err) {
        console.error("Error fetching scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  return (
    <div className="hs-view-container">
      {loading ? <LoadingBox /> : (
        <div className="hs-main-card">
          <div className="hs-header">
            <div style={{ flex: 1 }}></div>
            <h2 className="hs-menu-title">High Scores</h2>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <button onClick={onBack} className="home-menu-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}>
                Back to Menu
              </button>
            </div>
          </div>

          <div className="hs-table-scroll">
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
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {scores.map(s => (
                  <tr key={s.id} className="hs-row">
                    <td className="hs-cell" style={{ fontSize: '0.8rem', color: '#888' }}>{s.topic}</td>
                    
                    <td className="hs-cell">
                      <div style={{ fontWeight: 'bold' }}>{s.word}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '6px' }}>{s.language}</div>
                      {s.grids?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {s.grids.map((g, idx) => <span key={idx} className="hs-badge">{g}</span>)}
                        </div>
                      )}
                    </td>

                    <td className="hs-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        {s.isTruncated && <span className="hs-modifier truncated">Truncated</span>}
                        {s.isRounded && <span className="hs-modifier rounded">Rounded</span>}
                        {s.isOrganized && <span className="hs-modifier organized">Organized</span>}
                        {(!s.isTruncated && !s.isRounded && !s.isOrganized) && <span className="hs-badge" style={{ opacity: 0.3 }}>None</span>}
                      </div>
                    </td>

                    <td className="hs-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '0.75rem' }}>
                        {(() => {
                          const hasEquation = s.associatedEquation && s.associatedEquation !== "";
                          
                          // Check if all members of the equation have reached 99.9%
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
                                style={{ fontWeight: isMember ? 'bold' : 'normal' }} // Keep bolding for members even if incomplete
                              >
                                {res.symbol}: <strong>{res.percent}%</strong>
                              </div>
                            );
                          });
                        })() || "-"}
                      </div>
                    </td>

                    <td className="hs-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        {s.associatedEquation ? (
                          <>
                            <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase' }}>
                              {s.associatedId?.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4ade80', fontFamily: 'serif' }}>
                              {s.associatedEquation}
                            </div>
                          </>
                        ) : <div className="hs-badge" style={{ border: 'none', background: 'none' }}>None</div>}
                      </div>
                    </td>

                    <td className="hs-cell" style={{ fontSize: '0.7rem', color: '#555', maxWidth: '150px', wordWrap: 'break-word', fontFamily: 'monospace' }}>
                      {s.unusedDigits?.length > 0 ? s.unusedDigits.join(', ') : "-"}
                    </td>

                    <td className="hs-cell" style={{ fontSize: '0.7rem', color: '#aaa' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', minWidth: '160px' }}>
                        <div style={{ paddingBottom: '6px', borderBottom: (s.gridBreakdown && expandedGrids.has(s.id)) ? '1px solid #333' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span className="hs-badge" style={{ border: 'none', background: 'none', padding: 0 }}>Total Aggregate</span>
                            {s.gridBreakdown && (
                              <button className="hs-grid-btn" onClick={() => toggleGrid(s.id)}>
                                {expandedGrids.has(s.id) ? 'Hide' : 'Grids'}
                                <span className="hs-grid-arrow" style={{ transform: expandedGrids.has(s.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                              </button>
                            )}
                          </div>
                          <div>Start/End: <span style={{ color: '#fff' }}>{s.startingTotal} / {s.totalDigitsDisplayed}</span></div>
                          <div>Changed: <span style={{ color: '#fff' }}>{s.changedDigits}</span> ({s.percentageChanged}%)</div>
                          <div>Unchanged: <span style={{ color: '#fff' }}>{s.unchangedDigits}</span> ({s.percentageUnchanged}%)</div>
                        </div>

                        {expandedGrids.has(s.id) && s.gridBreakdown && 
                          Object.entries(s.gridBreakdown)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([gridName, metrics]) => (
                              <div key={gridName} style={{ opacity: 0.9, paddingLeft: '8px', borderLeft: '1px solid #3b82f6', marginTop: '4px' }}>
                                <div style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }}>{gridName}</div>
                                <div style={{ fontSize: '0.65rem' }}>
                                  <div>Start/End: <span style={{ color: '#fff' }}>{metrics.startingTotal} / {metrics.endingTotal}</span></div>
                                  <div>Changed: <span style={{ color: '#fff' }}>{metrics.changed}</span> ({metrics.percentChanged}%)</div>
                                  <div>Unchanged: <span style={{ color: '#fff' }}>{metrics.unchanged}</span> ({metrics.percentUnchanged}%)</div>
                                </div>
                              </div>
                            ))
                        }
                      </div>
                    </td>

                    <td className="hs-cell" style={{ fontSize: '0.7rem', color: '#666' }}>
                      {s.timestamp ? (
                        <>
                          <div>{s.timestamp.toDate().toLocaleDateString()}</div>
                          <div style={{ opacity: 0.7 }}>{s.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </>
                      ) : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default HighscoresView;