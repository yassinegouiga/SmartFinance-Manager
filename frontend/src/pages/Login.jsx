import { useState, useEffect } from 'react';
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
import Icon, { GoogleIcon } from '../components/Icons/Icon';
import { Field, TextInput, Spinner } from '../components/UI';

const provider = new GoogleAuthProvider();

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register | verify | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const clear = () => { setErrors({}); setInfo(''); };

  const validate = () => {
    const e = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Enter a valid email address';
    if (mode !== 'forgot' && password.length < 6) e.password = 'Password must be at least 6 characters';
    if (mode === 'register') {
      if (!firstName.trim()) e.firstName = 'First name required';
      if (!lastName.trim()) e.lastName = 'Last name required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clear();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setErrors({ global: 'Please verify your email before signing in. Check your inbox.' });
          return;
        }
      } else if (mode === 'register') {
        localStorage.setItem('sf_pending_names', JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }));
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setMode('verify');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setInfo('Password reset email sent. Check your inbox.');
        setMode('login');
      }
    } catch (err) {
      localStorage.removeItem('sf_pending_names');
      setErrors({ global: friendlyError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clear();
    setGoogleLoading(true);
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
      if (err.code !== 'auth/popup-closed-by-user') setErrors({ global: friendlyError(err.code) });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(true);
    try {
      const cred = auth.currentUser;
      if (cred) await sendEmailVerification(cred);
    } catch { /* silent */ }
  };

  const switchMode = (m) => { clear(); setInfo(''); setMode(m); };

  // ── Verify screen ────────────────────────────────────────────────────────────
  if (mode === 'verify') {
    return (
      <div className="auth">
        <AuthAside />
        <div className="auth-main">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="cat-ic lg" style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
              background: 'var(--accent-soft)', color: 'var(--accent-2)',
            }}>
              <Icon name="mail" size={30} />
            </div>
            <h2>Verify your email</h2>
            <p className="lead" style={{ marginTop: 8 }}>
              We sent a verification link to{' '}
              <b style={{ color: 'var(--text)' }}>{email}</b>.{' '}
              Click it to activate your account.
            </p>
            <div className="banner banner-info mt24" style={{ textAlign: 'left' }}>
              <Icon name="alert" size={18} />
              <div>
                <b>Didn't get it?</b>
                <div className="bd mt4">Check your spam folder, or resend below. Links expire after 24 hours.</div>
              </div>
            </div>
            <p className="t-sm muted mt16">Once verified, return here and sign in.</p>
            <button className="btn btn-ghost btn-block mt8" disabled={resent} onClick={handleResend}>
              {resent ? <><Icon name="check" size={16} /> Email resent</> : 'Resend verification email'}
            </button>
            <button className="btn btn-ghost btn-block mt8" onClick={() => switchMode('login')}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isReg = mode === 'register';
  const isForgot = mode === 'forgot';

  return (
    <div className="auth">
      <AuthAside />
      <div className="auth-main">
        <form className="auth-card" onSubmit={handleSubmit}>

          {/* Mobile brand — shown only when the aside panel is hidden */}
          <div className="brand only-mobile" style={{ marginBottom: 18, padding: 0 }}>
            <div className="logo"><Icon name="wallet" size={20} /></div>
            <div><div className="name">Smart<span>Finance</span></div></div>
          </div>

          <h2>
            {isForgot ? 'Reset password' : isReg ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="lead">
            {isForgot
              ? "Enter your email and we'll send reset instructions."
              : isReg
                ? 'Start managing your money in minutes — it\'s free.'
                : 'Sign in to pick up where you left off.'}
          </p>

          {/* Global error / info */}
          {errors.global && (
            <div className="banner banner-neg mt16">
              <Icon name="alert" size={16} />
              <span>{errors.global}</span>
            </div>
          )}
          {info && (
            <div className="banner banner-info mt16">
              <Icon name="checkCircle" size={16} />
              <span>{info}</span>
            </div>
          )}

          {/* Google button */}
          {!isForgot && (
            <>
              <button type="button" className="google-btn mt24" onClick={handleGoogle} disabled={googleLoading}>
                {googleLoading ? <Spinner /> : <GoogleIcon size={18} />}
                Continue with Google
              </button>
              <div className="divider-or">or {isReg ? 'sign up' : 'sign in'} with email</div>
            </>
          )}

          <div className="grid" style={{ gap: 14, marginTop: isForgot ? 24 : 0 }}>
            {isReg && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="First name" error={errors.firstName}>
                  <TextInput
                    icon="user" placeholder="John"
                    value={firstName} error={errors.firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </Field>
                <Field label="Last name" error={errors.lastName}>
                  <TextInput
                    placeholder="Doe"
                    value={lastName} error={errors.lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Field label="Email" error={errors.email}>
              <TextInput
                icon="mail" type="email" placeholder="you@example.com"
                value={email} error={errors.email}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>

            {!isForgot && (
              <Field label="Password" error={errors.password} hint={isReg ? 'Use 6+ characters' : undefined}>
                <div className="input-icon">
                  <Icon name="lock" size={17} />
                  <input
                    className={'input affixed' + (errors.password ? ' has-err' : '')}
                    style={{ paddingLeft: 40, paddingRight: 44 }}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button" className="icon-btn plain"
                    style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowPw(s => !s)}
                  >
                    <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
                  </button>
                </div>
              </Field>
            )}
          </div>

          {mode === 'login' && (
            <div className="between mt12">
              <label className="center t-sm" style={{ color: 'var(--text-2)', cursor: 'pointer', gap: 7 }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent)' }} />
                Remember me
              </label>
              <BtnLink onClick={() => switchMode('forgot')}>Forgot password?</BtnLink>
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg mt16" type="submit" disabled={loading}>
            {loading
              ? <Spinner />
              : isForgot ? 'Send reset link' : isReg ? 'Create account' : 'Sign in'}
          </button>

          <p className="t-sm muted" style={{ textAlign: 'center', marginTop: 18 }}>
            {isForgot ? (
              <>Remembered it? <BtnLink onClick={() => switchMode('login')}>Back to sign in</BtnLink></>
            ) : isReg ? (
              <>Already have an account? <BtnLink onClick={() => switchMode('login')}>Sign in</BtnLink></>
            ) : (
              <>New to SmartFinance? <BtnLink onClick={() => switchMode('register')}>Create an account</BtnLink></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

function BtnLink({ onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ color: 'var(--accent-2)', fontWeight: 700, background: 'none', border: 0, cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}

function AuthAside() {
  return (
    <div className="auth-aside">
      <div className="brand" style={{ padding: 0 }}>
        <div className="logo"><Icon name="wallet" size={22} /></div>
        <div>
          <div className="name" style={{ fontSize: 19 }}>Smart<span>Finance</span></div>
          <div className="sub">Manager</div>
        </div>
      </div>

      <div>
        <h1 style={{ fontSize: 34, lineHeight: 1.1, maxWidth: 420 }}>
          Every dollar,<br />beautifully accounted for.
        </h1>
        <p style={{ color: 'var(--text-2)', maxWidth: 380, marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>
          Track spending, set budgets, grow savings pots and never miss a bill — all in one calm, focused workspace.
        </p>

        <div className="mock-card-3d">
          <div className="glow" />
          <div className="between" style={{ position: 'relative' }}>
            <div>
              <div style={{ fontSize: 12, opacity: .75, fontWeight: 600 }}>Total balance</div>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>$24,580.40</div>
            </div>
            <Icon name="wallet" size={24} style={{ opacity: .8 }} />
          </div>
          <div className="row" style={{ position: 'relative', marginTop: 24, gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, opacity: .7 }}>Income</div>
              <div className="tnum fw7" style={{ marginTop: 3 }}>+$5,520</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: .7 }}>Spent</div>
              <div className="tnum fw7" style={{ marginTop: 3 }}>−$3,140</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: .7 }}>Saved</div>
              <div className="tnum fw7" style={{ marginTop: 3 }}>38%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 22, color: 'var(--text-3)', fontSize: 12.5, fontWeight: 600 }}>
        <span className="center"><Icon name="shield" size={15} /> Bank-grade security</span>
        <span className="center"><Icon name="sparkle" size={15} /> Smart insights</span>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/email-already-in-use':  'An account with this email already exists.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/too-many-requests':     'Too many attempts. Please try again later.',
    'auth/invalid-credential':    'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
