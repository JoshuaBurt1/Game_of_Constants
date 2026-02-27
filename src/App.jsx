import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; // Added for real-time gems
import { auth, db } from './firebase'; 
import SignInView from './components/SignInView';
import GameComponent from './components/GameComponent';
import HighscoresView from './components/HighscoresView';
import Instructions from './components/Instructions';
import backgroundImage from './assets/background_home.png';
import './App.css';

export default function App() {
  const [settings, setSettings] = useState({ topic: '', word: '', language: '', gridTypes: [] });
  const [user, setUser] = useState(null);
  const [gems, setGems] = useState(0); 
  const [isGuest, setIsGuest] = useState(false);
  const [step, setStep] = useState('AUTH'); 
  const [submissionData, setSubmissionData] = useState({ id: null, earnedGems: 0 });

  // --- Auth & Firestore Sync ---
  useEffect(() => {
  let unsubscribeUserDoc = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      setStep('TOPIC');

      // Consolidated listener for Gems AND display_name
      const userRef = doc(db, 'users', currentUser.uid);
      unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGems(data.gems || 0);
          setUser(prev => (prev ? { ...prev, ...data } : prev)); 
        }
      });
    } else {
      setUser(null);
      setGems(0);
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeUserDoc) unsubscribeUserDoc();
  };
}, []);

  const handleSignOut = () => {
    signOut(auth);
    setUser(null);
    setIsGuest(false);
    setStep('AUTH');
  };
  
  // --- PWA Install Logic ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const handler = (e) => {
      if (isMobile) {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBtn(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => setShowInstallBtn(false));
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // --- Loading Screen Cleanup ---
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      const timer = setTimeout(() => { loader.remove(); }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fixes the "cutoff header" by resetting scroll when switching views
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const toggleGridType = (type) => {
    setSettings(prev => ({
      ...prev,
      gridTypes: prev.gridTypes.includes(type) ? prev.gridTypes.filter(t => t !== type) : [...prev.gridTypes, type]
    }));
  };

  const handleScoreSubmitted = (newSubmissionId, gemsEarned) => {
    setSubmissionData({ id: newSubmissionId, earnedGems: gemsEarned });
    setStep('HIGHSCORES');
  };

  const renderStep = () => {
    if (step === 'AUTH') {
      return (
        <SignInView 
          onAuthSuccess={(u) => { setUser(u); setStep('TOPIC'); }} 
          onGuestSignage={() => { setIsGuest(true); setStep('TOPIC'); }} 
        />
      );
    }
    if (step === 'HIGHSCORES') {
      return (
        <HighscoresView 
          onBack={() => {
            setStep('TOPIC');
            // Clear out the submission data when returning to the menu
            setSubmissionData({ id: null, earnedGems: 0 }); 
          }} 
          newSubmissionId={submissionData.id}
          gemAmount={submissionData.earnedGems}
        />
      );
    }
    if (step === 'INSTRUCTIONS') return <Instructions onBack={() => setStep('TOPIC')} />;

    // Shared wrapper for Gems and Title
    const MenuWrapper = ({ title, children }) => (
      <div className="home-menu-container">
        {!isGuest && <div className="home-gem-display">💎 {gems}</div>}
        <h2 className="home-menu-title">{title}</h2>
        {children}
      </div>
    );

    if (step === 'TOPIC') return (
      <div className="home-menu-container">
        {!isGuest && <div className="home-gem-display">💎 {gems}</div>}
        
        <p className="user-welcome">Welcome, {isGuest ? 'Guest' : user?.displayName}</p>
        
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

        <button className="home-menu-btn signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
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

    return (
      <GameComponent 
        settings={settings} 
        setStep={setStep} 
        user={user} 
        userName={isGuest ? "Guest" : (user?.displayName || "Guest")} 
        onScoreSubmit={handleScoreSubmitted} 
      />
    );
  };

  const getBackground = () => {
    if (step !== 'GAME') return `url(${backgroundImage})`;
    return 'none';
  };

  return (
    <div 
      className={`home-app-wrapper ${step !== 'GAME' ? 'home-bg-active' : ''}`} 
      style={{ 
        backgroundImage: getBackground(),
        justifyContent: step === 'GAME' ? 'center' : 'flex-start',
        WebkitTapHighlightColor: 'transparent', 
        touchAction: 'manipulation'
      }}
    >
      {renderStep()}
    </div>
  );
}