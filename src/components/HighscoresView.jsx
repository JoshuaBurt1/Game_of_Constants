import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// --- NEW LOADING BOX COMPONENT ---
const LoadingBox = () => (
  <div style={{
    maxWidth: '1050px',
    margin: '20px auto',
    background: '#222',
    padding: '60px 20px',
    borderRadius: '12px',
    border: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px'
  }}>
    <div className="pulse-spinner" style={{
      width: '40px',
      height: '40px',
      border: '3px solid #444',
      borderTop: '3px solid #4ade80',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <div style={{ 
      color: '#888', 
      fontSize: '0.9rem', 
      letterSpacing: '2px', 
      textTransform: 'uppercase',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      Retrieving Archives...
    </div>
    
    {/* Inline CSS for the animations */}
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    `}</style>
  </div>
);

function HighscoresView({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const q = query(collection(db, "highscores"), orderBy("timestamp", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const sortedData = data.sort((a, b) => {
          const topicA = a.topic || "";
          const topicB = b.topic || "";
          if (topicA < topicB) return -1;
          if (topicA > topicB) return 1;

          const wordA = a.word || "";
          const wordB = b.word || "";
          if (wordA < wordB) return -1;
          if (wordA > wordB) return 1;

          const langA = a.language || "";
          const langB = b.language || "";
          if (langA < langB) return -1;
          if (langA > langB) return 1;

          const hasEqA = a.associatedEquation && a.associatedEquation !== "";
          const hasEqB = b.associatedEquation && b.associatedEquation !== "";
          if (hasEqA && !hasEqB) return -1;
          if (!hasEqA && hasEqB) return 1;

          return 0;
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
  
  const cellStyle = { padding: '12px', verticalAlign: 'middle' };
  
  const badgeStyle = { 
    fontSize: '0.55rem', background: '#333', color: '#888', 
    padding: '2px 6px', borderRadius: '4px', border: '1px solid #444',
    textTransform: 'uppercase', letterSpacing: '0.5px' 
  };

  const modifierStyle = (baseColor) => ({
    ...badgeStyle,
    background: `${baseColor}40`, 
    color: baseColor,
    borderColor: baseColor,
    fontWeight: 'bold'
  });

  return (
    <div style={{ textAlign: 'center', paddingTop: '60px', color: 'white' }}>
      {loading ? (
        <LoadingBox />
      ) : (
        <div style={{ maxWidth: '1050px', margin: '20px auto', background: '#222', padding: '20px', borderRadius: '12px', position: 'relative' }}>
          
          {/* HEADER SECTION: Centered Title, Right-aligned Button */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            paddingBottom: '5px',
            borderBottom: '1px solid #333'
          }}>
            <div style={{ flex: 1 }}></div>
            <h2 className="hs-menu-title">High Scores</h2>
            {/* 3. Right-aligned Button */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <button 
                onClick={onBack} 
                className="home-menu-btn"
                style={{ 
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: '0.75rem', // Smaller text
                  display: 'inline-block' 
                }}
              >
                Back to Menu
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444', color: '#888', fontSize: '0.7rem' }}>
                <th style={{ padding: '10px' }}>TOPIC</th>
                <th style={{ padding: '10px' }}>WORD / GRID</th>
                <th style={{ padding: '10px' }}>FUNCTIONS</th>
                <th style={{ padding: '10px' }}>MATCHES</th>
                <th style={{ padding: '10px' }}>EQUATION</th>
                <th style={{ padding: '10px' }}>REMAINING</th>
                <th style={{ padding: '10px' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ ...cellStyle, fontSize: '0.8rem', color: '#888' }}>{s.topic}</td>
                  
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{s.word}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '6px' }}>{s.language}</div>
                    {s.grids?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {s.grids.map((g, idx) => <span key={idx} style={badgeStyle}>{g}</span>)}
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      {s.isTruncated && <span style={modifierStyle('#3b82f6')}>Truncated</span>}
                      {s.isRounded && <span style={modifierStyle('#8b5cf6')}>Rounded</span>}
                      {s.isOrganized && <span style={modifierStyle('#10b981')}>Organized</span>}
                      {(!s.isTruncated && !s.isRounded && !s.isOrganized) && <span style={{...badgeStyle, opacity: 0.3}}>None</span>}
                    </div>
                  </td>

                  <td style={cellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '0.75rem' }}>
                      {(() => {
                        const hasEquation = s.associatedEquation && s.associatedEquation !== "";
                        const isEquationComplete = hasEquation && s.equationMembers?.length > 0 && s.equationMembers.every(member => 
                          s.results?.some(res => res.symbol === member && parseFloat(res.percent) >= 99.9)
                        );

                        return s.results?.slice(0, 4).map((res, idx) => {
                          const isMember = s.equationMembers?.includes(res.symbol);
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                color: (isMember && isEquationComplete) ? '#4ade80' : '#aaa', 
                                fontWeight: isMember ? 'bold' : 'normal'
                              }}
                            >
                              {res.symbol}: <strong>{res.percent}%</strong>
                            </div>
                          );
                        });
                      })() || "-"}
                    </div>
                  </td>

                  <td style={cellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {s.associatedEquation && s.associatedEquation !== "" ? (
                        <>
                          <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {s.associatedId?.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4ade80', fontFamily: 'serif' }}>
                            {s.associatedEquation}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                          None
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ ...cellStyle, fontSize: '0.7rem', color: '#555', maxWidth: '150px', wordWrap: 'break-word', fontFamily: 'monospace' }}>
                    {s.unusedDigits?.length > 0 ? s.unusedDigits.join(', ') : "-"}
                  </td>

                  <td style={{ ...cellStyle, fontSize: '0.7rem', color: '#666' }}>
                    {s.timestamp ? s.timestamp.toDate().toLocaleDateString() : 'Recent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HighscoresView;