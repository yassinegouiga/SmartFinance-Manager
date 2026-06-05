import { useEffect, useState, useRef } from 'react';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Icon from '../components/Icons/Icon';
import { Modal, Field, TextInput, Select, Spinner, ConfirmDialog, useToast } from '../components/UI';

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

// Read an image file and downscale it to a small square avatar data URL,
// so it fits comfortably in the profile's avatar_url text field (no storage infra).
function fileToAvatarDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Section({ title, sub, danger, children }) {
  return (
    <div
      className="card pad mb16"
      style={danger ? { borderColor: 'var(--neg)', background: 'var(--neg-soft)' } : undefined}
    >
      <div style={{ marginBottom: 16 }}>
        <div className="center gap8">
          {danger && <Icon name="alert" size={17} style={{ color: 'var(--neg)' }} />}
          <h3 style={{ fontSize: 15.5, color: danger ? 'var(--neg)' : 'var(--text)' }}>{title}</h3>
        </div>
        {sub && <div className="t-xs muted" style={{ marginTop: 4 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Rowi({ label, sub, children, last }) {
  return (
    <div
      className="between"
      style={{
        padding: '14px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-soft)',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="fw7 t-sm">{label}</div>
        {sub && <div className="t-xs muted" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      <div className="center gap12" style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, profile, theme, toggleTheme, currency, updateProfile, updateAvatar, updateCurrency, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Profile
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving]   = useState(false);
  const fileRef = useRef(null);

  // Security
  const [pwModal, setPwModal]             = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Currency
  const [currencySaving, setCurrencySaving] = useState(false);

  // Data / Delete
  const [exporting, setExporting]     = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteText, setDeleteText]   = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const dirty = firstName !== (profile?.first_name || '') || lastName !== (profile?.last_name || '');

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { toast && toast("First name can't be empty", 'neg'); return; }
    setProfileSaving(true);
    try {
      await updateProfile(firstName.trim(), lastName.trim());
      toast && toast('Profile saved', 'pos');
    } catch {
      toast && toast('Failed to update profile', 'neg');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast && toast('Please choose an image file', 'neg'); return; }
    setAvatarSaving(true);
    try {
      const dataUrl = await fileToAvatarDataURL(file);
      await updateAvatar(dataUrl);
      toast && toast('Profile photo updated', 'pos');
    } catch {
      toast && toast('Failed to update photo', 'neg');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarSaving(true);
    try {
      await updateAvatar(null);
      toast && toast('Profile photo removed', 'neg');
    } catch {
      toast && toast('Failed to remove photo', 'neg');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleCurrencyChange = async (e) => {
    setCurrencySaving(true);
    try {
      await updateCurrency(e.target.value);
      toast && toast('Currency updated', 'pos');
    } catch { /* reverted in context */ }
    finally { setCurrencySaving(false); }
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
      toast && toast('Export downloaded', 'pos');
    } catch {
      toast && toast('Export failed', 'neg');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
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
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* ── Profile ──────────────────────────────────────── */}
      <Section title="Profile" sub="Update your personal information">
        <div className="center gap16 mb16" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              className="avatar"
              style={{
                width: 68, height: 68, fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px',
                background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                color: '#fff',
              }}
            >
              {avatarSaving
                ? <Spinner />
                : profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
            </div>
            <button
              className="icon-btn"
              onClick={() => fileRef.current && fileRef.current.click()}
              title="Change photo"
              disabled={avatarSaving}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--bg-elev)' }}
            >
              <Icon name="edit" size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePickAvatar} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw8" style={{ fontSize: 17 }}>{displayName || 'No name set'}</div>
            <div className="t-sm muted">{user?.email}</div>
            <div className="row gap8 mt8">
              <button className="btn btn-outline btn-sm" onClick={() => fileRef.current && fileRef.current.click()} disabled={avatarSaving}>
                <Icon name="upload" size={14} /> Upload photo
              </button>
              {profile?.avatar_url && (
                <button className="btn btn-ghost btn-sm" onClick={handleRemoveAvatar} disabled={avatarSaving}>
                  <Icon name="trash" size={14} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Field label="First name">
            <TextInput
              icon="user"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name">
            <TextInput
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Email">
          <TextInput
            icon="mail"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.65 }}
          />
        </Field>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveProfile}
            disabled={!dirty || profileSaving}
          >
            {profileSaving ? <Spinner /> : <Icon name="check" size={17} />}
            Save changes
          </button>
        </div>
      </Section>

      {/* ── Preferences ──────────────────────────────────── */}
      <Section title="Preferences" sub="Customise how SmartFinance looks and works">
        <Rowi label="Appearance" sub="Choose between dark and light mode">
          <div className="segmented accent">
            <button className={theme === 'light' ? 'active' : ''} onClick={() => { if (theme !== 'light') toggleTheme(); }}>
              <Icon name="sun" size={15} /> Light
            </button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => { if (theme !== 'dark') toggleTheme(); }}>
              <Icon name="moon" size={15} /> Dark
            </button>
          </div>
        </Rowi>
        <Rowi label="Currency" sub="Used for displaying monetary values" last>
          <div style={{ minWidth: 190 }}>
            <Select
              value={currency}
              onChange={handleCurrencyChange}
              disabled={currencySaving}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </Select>
          </div>
        </Rowi>
      </Section>

      {/* ── Security ─────────────────────────────────────── */}
      <Section title="Security" sub="Manage your password and sign-in sessions">
        {isPasswordUser ? (
          <Rowi label="Password" sub="Change your account password">
            <button className="btn btn-outline btn-sm" onClick={() => setPwModal(true)}>
              <Icon name="lock" size={15} /> Change
            </button>
          </Rowi>
        ) : (
          <Rowi label="Password" sub="You sign in with Google — password is managed there">
            <span className="badge badge-muted"><Icon name="shield" size={13} /> Google account</span>
          </Rowi>
        )}
        <Rowi label="Sign out" sub="End your session on this device" last>
          <button className="btn btn-outline btn-sm" onClick={() => setLogoutConfirm(true)}>
            <Icon name="logout" size={15} /> Sign out
          </button>
        </Rowi>
      </Section>

      {/* ── Data + Danger zone ───────────────────────────── */}
      <Section title="Data" sub="Export or permanently delete your account data" danger>
        <Rowi label="Export all data" sub="Download your transactions, bills, budgets and saving pots as JSON">
          <button className="btn btn-outline btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Spinner /> : <Icon name="download" size={15} />}
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </Rowi>
        <Rowi
          label="Delete account"
          sub="Permanently delete your account and all data. This cannot be undone."
          last
        >
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { setShowDelete(true); setDeleteText(''); setDeleteError(''); }}
          >
            <Icon name="trash" size={15} /> Delete
          </button>
        </Rowi>
      </Section>

      {/* Change password */}
      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} />}

      {/* Sign out confirm */}
      {logoutConfirm && (
        <ConfirmDialog
          title="Sign out?"
          body="You'll need to sign in again to access your account."
          confirmLabel="Sign out"
          onConfirm={handleSignOut}
          onClose={() => setLogoutConfirm(false)}
        />
      )}

      {/* Delete account modal */}
      {showDelete && (
        <Modal
          title="Delete your account?"
          sub="This cannot be undone"
          onClose={() => setShowDelete(false)}
          icon="alert"
          iconColor="var(--neg)"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deleting}
              >
                {deleting ? <Spinner /> : <Icon name="trash" size={17} />}
                Delete account
              </button>
            </>
          }
        >
          <div className="banner banner-neg">
            <Icon name="alert" size={16} />
            <span>
              This will permanently remove your profile, transactions, budgets, pots and bills.
            </span>
          </div>

          <Field label="Type DELETE to confirm" error={deleteError}>
            <TextInput
              placeholder="DELETE"
              value={deleteText}
              error={deleteError}
              onChange={e => { setDeleteText(e.target.value); setDeleteError(''); }}
              autoFocus
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!current) errs.current = 'Enter your current password';
    if (next.length < 6) errs.next = 'Use at least 6 characters';
    if (next !== confirm) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, next);
      toast && toast('Password updated', 'pos');
      onClose();
    } catch (err) {
      const code = err.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrors({ current: 'Current password is incorrect' });
      } else if (code === 'auth/weak-password') {
        setErrors({ next: 'Password is too weak' });
      } else if (code === 'auth/too-many-requests') {
        setErrors({ current: 'Too many attempts. Try again later.' });
      } else {
        setErrors({ confirm: 'Failed to update password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Change password"
      sub="Enter your current password, then choose a new one"
      onClose={onClose}
      icon="lock"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />} Update password
          </button>
        </>
      }
    >
      <Field label="Current password" error={errors.current}>
        <TextInput icon="lock" type="password" placeholder="••••••••" value={current}
          error={errors.current} onChange={e => { setCurrent(e.target.value); setErrors(s => ({ ...s, current: '' })); }} autoFocus />
      </Field>
      <Field label="New password" error={errors.next} hint="Use 6+ characters">
        <TextInput icon="lock" type="password" placeholder="••••••••" value={next}
          error={errors.next} onChange={e => { setNext(e.target.value); setErrors(s => ({ ...s, next: '' })); }} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        <TextInput icon="lock" type="password" placeholder="••••••••" value={confirm}
          error={errors.confirm} onChange={e => { setConfirm(e.target.value); setErrors(s => ({ ...s, confirm: '' })); }} />
      </Field>
    </Modal>
  );
}
