import React, { useState } from 'react';
import GameComponent from './components/GameComponent';
import HighscoresView from './components/HighscoresView';
import backgroundImage from './assets/background_home.png';

import './App.css';

export default function App() {
  const [step, setStep] = useState('TOPIC'); 
  const [settings, setSettings] = useState({ topic: '', word: '', language: '', gridTypes: [] });

  const toggleGridType = (type) => {
    setSettings(prev => ({
      ...prev,
      gridTypes: prev.gridTypes.includes(type) ? prev.gridTypes.filter(t => t !== type) : [...prev.gridTypes, type]
    }));
  };

  const renderStep = () => {
    if (step === 'HIGHSCORES') return <HighscoresView onBack={() => setStep('TOPIC')} />;

    // Menu logic with home- prefix
    const MenuWrapper = ({ title, children }) => (
      <div className="home-menu-container">
        <h2 className="home-menu-title">{title}</h2>
        {children}
      </div>
    );

    if (step === 'TOPIC') return (
      <div className="home-menu-container">
        <button className="home-menu-btn" onClick={() => setStep('HIGHSCORES')}>High Scores</button>
        <div className="home-menu-divider" />
        <h2 className="home-menu-title">Topic</h2>
        {["Chinese Zodiac"].map(t => (
          <button key={t} className="home-menu-btn" onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}>{t}</button>
        ))}
      </div>
    );

    if (step === 'WORD') return (
      <MenuWrapper title="Select Animal">
        <div className="home-grid-layout">
          {["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"].map(w => 
            <button key={w} className="home-menu-btn" onClick={() => { setSettings({...settings, word: w}); setStep('LANG'); }}>{w}</button>
          )}
        </div>
      </MenuWrapper>
    );

    if (step === 'LANG') return (
      <MenuWrapper title="Language">
        {["Hebrew", "Ancient Greek", "Arabic"].map(l => (
          <button key={l} className="home-menu-btn" onClick={() => { setSettings({...settings, language: l}); setStep('GRID'); }}>{l}</button>
        ))}
      </MenuWrapper>
    );

    if (step === 'GRID') return (
      <MenuWrapper title="Tessellation">
        {["Square Shell", "Hexagon"].map(g => (
          <button key={g} className={`home-menu-btn ${settings.gridTypes.includes(g) ? 'home-active' : ''}`} onClick={() => toggleGridType(g)}>
            {g} {settings.gridTypes.includes(g) ? '✓' : ''}
          </button>
        ))}
        <button disabled={settings.gridTypes.length === 0} className="home-confirm-btn" onClick={() => setStep('GAME')}>Confirm Selection</button>
      </MenuWrapper>
    );

    return <GameComponent settings={settings} setStep={setStep} />;
  };

  const getBackground = () => {
    if (step === 'HIGHSCORES') return `url(${backgroundImage})`;
    if (step !== 'GAME') return `url(${backgroundImage})`;
    return 'none';
  };

  return (
    <div 
      className={`home-app-wrapper ${step !== 'GAME' ? 'home-bg-active' : ''}`} 
      style={{ 
        backgroundImage: getBackground(),
        justifyContent: step === 'GAME' ? 'center' : 'flex-start'
      }}
    >
      {renderStep()}
    </div>
  );
}