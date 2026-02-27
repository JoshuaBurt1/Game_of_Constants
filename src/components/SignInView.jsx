import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function SignInView({ onAuthSuccess, onGuestSignage }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailFields, setShowEmailFields] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const syncUserProfile = async (user, displayName) => {
    if (displayName) {
      await updateProfile(user, { displayName: displayName });
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      display_name: displayName || user.displayName || 'Player',
      last_login: serverTimestamp(),
      gems: increment(0),
    }, { merge: true });
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
      onAuthSuccess(result.user);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEmailAuth = async () => {
    // 3. ENFORCE NAME REQUIREMENT
    if (isRegistering && !name.trim()) {
      alert("Please enter a Player Name to register.");
      return;
    }

    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      await syncUserProfile(userCredential.user, name);
      onAuthSuccess(userCredential.user);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    /* We use a dynamic class to handle height changes when inputs appear */
    <div className={`home-menu-container ${showEmailFields ? 'auth-mode' : ''}`}>
      <h2 className="home-menu-title">CONSTANTS</h2>
      
      {!showEmailFields ? (
        <div className="auth-stack">
          <button className="home-menu-btn google-btn" onClick={handleGoogleSignIn}>
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="G" 
              className="google-icon"
            />
            Sign in with Google
          </button>
          
          <button className="home-menu-btn" onClick={() => setShowEmailFields(true)}>
            Sign in with Email
          </button>

          <div className="home-menu-divider" />
          
          <button className="home-menu-btn guest-btn" onClick={onGuestSignage}>
            Play as Guest
          </button>
        </div>
      ) : (
        <div className="auth-form-wrapper">
          <div className="auth-input-group">
            {isRegistering && (
              <input 
                className="home-menu-input" 
                type="text" 
                placeholder="Player Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            )}
            <input 
              className="home-menu-input" 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              className="home-menu-input" 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          
          <button className="home-confirm-btn auth-primary-btn" onClick={handleEmailAuth}>
            {isRegistering ? 'CREATE ACCOUNT' : 'LOGIN'}
          </button>
          
          <div className="auth-nav-group">
            <p className="auth-toggle-text" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? "ALREADY HAVE AN ACCOUNT? LOGIN" : "NEW USER? REGISTER HERE"}
            </p>

            <button className="auth-back-btn" onClick={() => setShowEmailFields(false)}>
              Back to Options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}