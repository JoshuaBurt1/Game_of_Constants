import React, { useState, useEffect } from 'react'; // Added useEffect
import GameComponent from './components/GameComponent';
import HighscoresView from './components/HighscoresView';
import Instructions from './components/Instructions';
import backgroundImage from './assets/background_home.png';
import './App.css';

export default function App() {
  const [step, setStep] = useState('TOPIC'); 
  const [settings, setSettings] = useState({ topic: '', word: '', language: '', gridTypes: [] });
  
  // --- PWA Install Logic ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // --- NEW: Loading Screen Cleanup ---
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0'; // Trigger the CSS transition
      const timer = setTimeout(() => {
        loader.remove(); // Clean up the DOM
      }, 500); // Matches the 0.5s transition in your CSS
      return () => clearTimeout(timer);
    }
  }, []);
  // -----------------------------------

  const toggleGridType = (type) => {
    setSettings(prev => ({
      ...prev,
      gridTypes: prev.gridTypes.includes(type) ? prev.gridTypes.filter(t => t !== type) : [...prev.gridTypes, type]
    }));
  };

  const renderStep = () => {
    if (step === 'HIGHSCORES') return <HighscoresView onBack={() => setStep('TOPIC')} />;
    if (step === 'INSTRUCTIONS') return <Instructions onBack={() => setStep('TOPIC')} />;

    const MenuWrapper = ({ title, children }) => (
      <div className="home-menu-container">
        <h2 className="home-menu-title">{title}</h2>
        {children}
      </div>
    );

    if (step === 'TOPIC') return (
      <div className="home-menu-container">
        {/* Only show if the browser supports it and app isn't installed */}
        {showInstallBtn && (
          <button className="home-menu-btn install-btn" onClick={handleInstallClick}>
            📲 Install App
          </button>
        )}
        
        <button className="home-menu-btn" onClick={() => setStep('HIGHSCORES')}>High Scores</button>
        <button className="home-menu-btn" onClick={() => setStep('INSTRUCTIONS')}>Instructions</button>
        
        <div className="home-menu-divider" />
        <h2 className="home-menu-title">TOPIC</h2>
        
        {["Chinese Zodiac"].map(t => (
          <button 
            key={t} 
            className="home-menu-btn" 
            onClick={() => { setSettings({...settings, topic: t}); setStep('WORD'); }}
          >
            {t}
          </button>
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
        {["Hebrew", "Ancient Greek", "Arabic", "Sanskrit"].map(l => (
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
    // Show background for everything except the active Game
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