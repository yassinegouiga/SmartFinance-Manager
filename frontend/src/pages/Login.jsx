import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './Login.css';

const provider = new GoogleAuthProvider();

export default function Login() {
  const [tab, setTab] = useState('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(''); setInfo(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (tab === 'signup') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }
    setLoading(true);
    try {
      if (tab === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
          return;
        }
      } else {
        localStorage.setItem('sf_pending_names', JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }));
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setInfo(`Verification email sent to ${email}. Click the link, then sign in here.`);
        setTab('signin');
        setFirstName(''); setLastName(''); setPassword(''); setConfirm('');
      }
    } catch (err) {
      localStorage.removeItem('sf_pending_names');
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.displayName) {
        const parts = result.user.displayName.trim().split(' ');
        localStorage.setItem('sf_pending_names', JSON.stringify({
          first_name: parts[0] || '',
          last_name: parts.slice(1).join(' ') || '',
        }));
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Enter your email above first.'); return; }
    clearMessages();
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(friendlyError(err.code));
    }
  };

  return (
    <div className="login-page">
      <div className="orb orb-purple" />
      <div className="orb orb-teal" />

      <div className="login-card glass">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#lg1)"/>
              <path d="M2 17l10 5 10-5" stroke="url(#lg2)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="url(#lg3)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6C63FF"/><stop offset="100%" stopColor="#3ECFCF"/></linearGradient>
                <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6C63FF"/><stop offset="100%" stopColor="#3ECFCF"/></linearGradient>
                <linearGradient id="lg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6C63FF"/><stop offset="100%" stopColor="#3ECFCF"/></linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="login-brand-name">SmartFinance</h1>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab${tab === 'signin' ? ' active' : ''}`}
            onClick={() => { setTab('signin'); clearMessages(); }}
          >Sign In</button>
          <button
            className={`login-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => { setTab('signup'); clearMessages(); }}
          >Sign Up</button>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {info && <div className="info-msg">{info}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {tab === 'signup' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
          )}

          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : null}
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {tab === 'signin' && (
          <button className="login-forgot" onClick={handleReset} type="button">
            Forgot password?
          </button>
        )}

        <div className="login-divider"><span>or continue with</span></div>

        <button className="btn btn-ghost login-google" onClick={handleGoogle} disabled={loading}>
          <svg width="17" height="17" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="login-tagline">Your finances, beautifully organized.</p>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
