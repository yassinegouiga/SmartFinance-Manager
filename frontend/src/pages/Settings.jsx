import { useEffect, useState } from 'react';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'CHF', label: 'CHF — Swiss Franc (Fr)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'MAD', label: 'MAD — Moroccan Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
  { code: 'AED', label: 'AED — UAE Dirham' },
];

export default function Settings() {
  const { user, profile, theme, toggleTheme, currency, updateProfile, updateCurrency, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Profile
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]   = useState(null);

  // Preferences
  const [currencySaving, setCurrencySaving] = useState(false);

  // Security
  const [resetSent, setResetSent]     = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Data / Delete
  const [exporting, setExporting]     = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteText, setDeleteText]   = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Sync name fields when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile(firstName, lastName);
      setProfileMsg({ ok: true, text: 'Profile updated.' });
    } catch {
      setProfileMsg({ ok: false, text: 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCurrencyChange = async (e) => {
    setCurrencySaving(true);
    try { await updateCurrency(e.target.value); }
    catch { /* reverted in context */ }
    finally { setCurrencySaving(false); }
  };

  const handlePasswordReset = async () => {
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
    } catch { /* silent */ }
    finally { setResetLoading(false); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [txRes, billsRes, budgetsRes, potsRes] = await Promise.all([
        api.get('/api/v1/transactions/?limit=10000'),
        api.get('/api/v1/bills/?limit=10000'),
        api.get('/api/v1/budgets/?limit=10000'),
        api.get('/api/v1/saving-pots/?limit=10000'),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        email: user.email,
        transactions: txRes.data,
        bills: billsRes.data,
        budgets: budgetsRes.data,
        saving_pots: potsRes.data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `smartfinance-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (e) {
      setDeleteError(
        e.code === 'auth/requires-recent-login'
          ? 'For security, please sign out and sign back in before deleting your account.'
          : 'Failed to delete account. Please try again.'
      );
      setDeleting(false);
    }
  };

  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean).map(n => n[0]).join('').toUpperCase()
    || (user?.email || '').slice(0, 2).toUpperCase();

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || user?.email || '';

  const isPasswordUser = profile?.auth_provider !== 'google.com';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your profile and account preferences</p>
      </div>

      <div className="settings-sections">

        {/* ── Profile ─────────────────────────────────── */}
        <section className="settings-card glass">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Profile</h2>
            <p className="settings-card-desc">Update your personal information</p>
          </div>
          <div className="settings-card-body">
            <div className="settings-avatar-row">
              <div className="settings-avatar">{initials}</div>
              <div>
                <p className="settings-avatar-name">{displayName || 'No name set'}</p>
                <p className="settings-avatar-email">{user?.email}</p>
              </div>
            </div>

            <div className="settings-fields">
              <div className="settings-two-col">
                <div className="settings-field">
                  <label className="settings-label">First Name</label>
                  <input
                    className="input"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Last Name</label>
                  <input
                    className="input"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="settings-field">
                <label className="settings-label">Email</label>
                <input className="input settings-input-disabled" value={user?.email || ''} disabled />
              </div>
            </div>

            {profileMsg && (
              <p className={`settings-inline-msg ${profileMsg.ok ? 'ok' : 'err'}`}>{profileMsg.text}</p>
            )}

            <button className="btn-primary settings-save-btn" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </section>

        {/* ── Preferences ─────────────────────────────── */}
        <section className="settings-card glass">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Preferences</h2>
            <p className="settings-card-desc">Customize how SmartFinance looks and works</p>
          </div>
          <div className="settings-card-body">
            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <p className="settings-pref-label">Theme</p>
                <p className="settings-pref-sub">Switch between dark and light mode</p>
              </div>
              <button className="settings-theme-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
              </button>
            </div>

            <div className="settings-divider" />

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <p className="settings-pref-label">Currency</p>
                <p className="settings-pref-sub">Used for displaying monetary values</p>
              </div>
              <select
                className="input settings-currency-select"
                value={currency}
                onChange={handleCurrencyChange}
                disabled={currencySaving}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Security ────────────────────────────────── */}
        <section className="settings-card glass">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Security</h2>
            <p className="settings-card-desc">Manage your password and sign-in sessions</p>
          </div>
          <div className="settings-card-body">
            {isPasswordUser && (
              <>
                <div className="settings-pref-row">
                  <div className="settings-pref-text">
                    <p className="settings-pref-label">Password</p>
                    <p className="settings-pref-sub">Send a reset link to {user?.email}</p>
                  </div>
                  {resetSent
                    ? <span className="settings-inline-msg ok">Reset email sent!</span>
                    : (
                      <button className="settings-outline-btn" onClick={handlePasswordReset} disabled={resetLoading}>
                        {resetLoading ? 'Sending…' : 'Reset Password'}
                      </button>
                    )
                  }
                </div>
                <div className="settings-divider" />
              </>
            )}
            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <p className="settings-pref-label">Sign Out</p>
                <p className="settings-pref-sub">Sign out of your account on this device</p>
              </div>
              <button className="settings-outline-btn" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        </section>

        {/* ── Data ────────────────────────────────────── */}
        <section className="settings-card glass settings-card-danger-zone">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Data</h2>
            <p className="settings-card-desc">Export or permanently delete your account data</p>
          </div>
          <div className="settings-card-body">
            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <p className="settings-pref-label">Export All Data</p>
                <p className="settings-pref-sub">Download your transactions, bills, budgets and saving pots as JSON</p>
              </div>
              <button className="settings-outline-btn" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export Data'}
              </button>
            </div>

            <div className="settings-divider" />

            <div className="settings-pref-row">
              <div className="settings-pref-text">
                <p className="settings-pref-label settings-danger-text">Delete Account</p>
                <p className="settings-pref-sub">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <button
                className="settings-danger-btn"
                onClick={() => { setShowDelete(true); setDeleteText(''); setDeleteError(null); }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Delete Confirmation Modal ──────────────────── */}
      {showDelete && (
        <div className="modal-backdrop" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Account</h3>
              <button className="modal-close" onClick={() => setShowDelete(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="settings-delete-warning">
                This will permanently delete your account and all your data — transactions, bills, budgets, and saving pots. <strong>This cannot be undone.</strong>
              </p>
              <p className="settings-delete-hint">Type <strong>DELETE</strong> to confirm:</p>
              <input
                className="input"
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
              />
              {deleteError && <p className="settings-inline-msg err" style={{ marginTop: 10 }}>{deleteError}</p>}
            </div>
            <div className="modal-footer">
              <button className="settings-outline-btn" onClick={() => setShowDelete(false)}>Cancel</button>
              <button
                className="settings-danger-btn"
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
