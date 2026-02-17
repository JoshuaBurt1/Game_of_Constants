import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Adjust path if your firebase.js is in src/
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

function HighscoresView({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const q = query(collection(db, "highscores"), orderBy("timestamp", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setScores(data);
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

  return (
    <div style={{ textAlign: 'center', paddingTop: '60px', color: 'white' }}>
      <h2>Recent Achievements</h2>
      {loading ? <p>Loading...</p> : (
        <div style={{ maxWidth: '950px', margin: '20px auto', background: '#222', padding: '20px', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444', color: '#888', fontSize: '0.7rem' }}>
                <th style={{ padding: '10px' }}>TOPIC</th>
                <th style={{ padding: '10px' }}>WORD / GRID</th>
                <th style={{ padding: '10px' }}>MATCHES</th>
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
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>{s.language}</div>
                    {s.grids?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'center' }}>
                        {s.grids.map((g, idx) => <span key={idx} style={badgeStyle}>{g}</span>)}
                      </div>
                    )}
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '0.75rem' }}>
                      {s.results?.slice(0, 3).map((res, idx) => (
                        <div key={idx} style={{ color: parseFloat(res.percent) >= 90 ? '#4ade80' : '#aaa' }}>
                          {res.symbol}: <strong>{res.percent}%</strong>
                        </div>
                      )) || "--"}
                    </div>
                  </td>
                  <td style={{ ...cellStyle, fontSize: '0.7rem', color: '#555', maxWidth: '150px', wordWrap: 'break-word', fontFamily: 'monospace' }}>
                    {s.unusedDigits?.length > 0 ? s.unusedDigits.join(', ') : "None"}
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
      <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer', background: '#444', border: 'none', color: 'white', borderRadius: '6px' }}>
        Back to Menu
      </button>
    </div>
  );
}

export default HighscoresView;