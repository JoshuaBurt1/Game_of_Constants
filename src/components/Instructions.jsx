// components/Instructions.jsx
import React from 'react';

const Instructions = ({ onBack }) => {
  return (
    <div className="home-menu-container">
      <h2 className="home-menu-title">How to Play</h2>
      
      <div style={{ 
        background: 'rgba(0, 0, 0, 0.6)', 
        padding: '20px', 
        borderRadius: '8px', 
        textAlign: 'left', 
        lineHeight: '1.6',
        fontSize: '0.9rem',
        color: '#eee',
        border: '1px solid #444',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '15px' }}>
          <strong>Main goal:</strong> Find an equation.
        </p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 15px 0' }}>
          <li style={{ marginBottom: '10px' }}>
           Use the palette to colour the numbers.
          </li>
          <li style={{ marginBottom: '10px' }}>
            Use the BIN and DEC buttons to change numbers between binary and decimal.
          </li>
          <li>
            Use the Organize, Truncate, and Dimension buttons to assist with reaching a 100% constant match.
          </li>
        </ul>
      </div>

      <button className="home-menu-btn" onClick={onBack}>
        Back to Menu
      </button>
    </div>
  );
};

export default Instructions;