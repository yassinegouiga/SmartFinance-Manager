
const { useState: useStateSet } = React;

function ChangePasswordModal({ onClose }) {
  const toast = useToast();
  const [cur, setCur] = useStateSet("");
  const [nw, setNw] = useStateSet("");
  const [cf, setCf] = useStateSet("");
  const [err, setErr] = useStateSet({});
  function save() {
    const e = {};
    if (!cur) e.cur = "Enter your current password";
    if (nw.length < 6) e.nw = "At least 6 characters";
    if (nw !== cf) e.cf = "Passwords don't match";
    setErr(e); if (Object.keys(e).length) return;
    toast("Password updated"); onClose();
  }
  return (
    <Modal title="Change password" onClose={onClose} icon="lock"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Update password</button></>}>
      <Field label="Current password" error={err.cur}><TextInput icon="lock" type="password" placeholder="••••••••" value={cur} error={err.cur} onChange={e => setCur(e.target.value)} /></Field>
      <Field label="New password" error={err.nw} hint="Use 6+ characters"><TextInput icon="lock" type="password" placeholder="••••••••" value={nw} error={err.nw} onChange={e => setNw(e.target.value)} /></Field>
      <Field label="Confirm new password" error={err.cf}><TextInput icon="lock" type="password" placeholder="••••••••" value={cf} error={err.cf} onChange={e => setCf(e.target.value)} /></Field>
    </Modal>
  );
}

function Section({ title, sub, children }) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="mb16"><h3 style={{ fontSize: 15.5 }}>{title}</h3>{sub && <div className="sub t-xs muted mt4">{sub}</div>}</div>
      {children}
    </div>
  );
}
function Rowi({ label, sub, children, last }) {
  return (
    <div className="between" style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid var(--border-soft)", gap: 16 }}>
      <div style={{ minWidth: 0 }}><div className="fw7 t-sm">{label}</div>{sub && <div className="t-xs muted mt4">{sub}</div>}</div>
      <div className="center gap12" style={{ flex: "none" }}>{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { user, prefs, actions } = useStore();
  const toast = useToast();
  const [firstName, setFirstName] = useStateSet(user.firstName || user.name.split(" ")[0] || "");
  const [lastName, setLastName] = useStateSet(user.lastName || user.name.split(" ").slice(1).join(" ") || "");
  const [avatar, setAvatar] = useStateSet(user.avatar || null);
  const fileRef = React.useRef(null);
  const [pwModal, setPwModal] = useStateSet(false);
  const [delModal, setDelModal] = useStateSet(false);
  const [logoutModal, setLogoutModal] = useStateSet(false);
  const dirty = firstName !== (user.firstName || "") || lastName !== (user.lastName || "") || avatar !== (user.avatar || null);
  const fullName = `${firstName} ${lastName}`.trim();

  function onPickFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("Please choose an image file", "neg"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(f);
  }
  function save() {
    if (!firstName.trim()) { toast("First name can't be empty", "neg"); return; }
    actions.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), name: fullName, avatar });
    toast("Profile saved");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <PageHead />

      <Section title="Profile">
        <div className="center gap16 mb16" style={{ flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Avatar name={fullName || "?"} size={72} src={avatar} />
            <button className="icon-btn" onClick={() => fileRef.current && fileRef.current.click()} title="Change photo"
              style={{ position: "absolute", bottom: -4, right: -4, width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--bg-elev)" }}>
              <Icon name="edit" size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw8" style={{ fontSize: 17 }}>{fullName || "Your name"}</div>
            <div className="t-sm muted">{user.email}</div>
            <div className="row gap8 mt8">
              <button className="btn btn-outline btn-sm" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="upload" size={14} /> Upload photo</button>
              {avatar && <button className="btn btn-ghost btn-sm" onClick={() => setAvatar(null)}><Icon name="trash" size={14} /> Remove</button>}
            </div>
          </div>
        </div>
        <div className="cols-2 keep2" style={{ gap: 14 }}>
          <Field label="First name"><TextInput icon="user" value={firstName} onChange={e => setFirstName(e.target.value)} /></Field>
          <Field label="Last name"><TextInput value={lastName} onChange={e => setLastName(e.target.value)} /></Field>
        </div>
        <Field label="Email"><TextInput icon="mail" value={user.email} disabled style={{ opacity: .65 }} /></Field>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-primary" disabled={!dirty} onClick={save}><Icon name="check" size={17} /> Save changes</button>
        </div>
      </Section>

      <Section title="Preferences">
        <Rowi label="Appearance" sub="Choose how SmartFinance looks">
          <div className="segmented accent">
            <button className={prefs.theme === "light" ? "active" : ""} onClick={() => actions.setTheme("light")}><Icon name="sun" size={15} /> Light</button>
            <button className={prefs.theme === "dark" ? "active" : ""} onClick={() => actions.setTheme("dark")}><Icon name="moon" size={15} /> Dark</button>
          </div>
        </Rowi>
        <Rowi label="Currency" sub="Used across the whole app">
          <div style={{ minWidth: 150 }}>
            <Select value={prefs.currency} onChange={e => { actions.setCurrency(e.target.value); toast("Currency updated"); }}>
              {Object.values(window.CURRENCIES).map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </Select>
          </div>
        </Rowi>
        <Rowi label="Email notifications" sub="Budget alerts & bill reminders"><Toggle on={true} onChange={() => toast("Preference saved")} /></Rowi>
        <Rowi label="Weekly summary" sub="A digest every Monday morning" last><Toggle on={false} onChange={() => toast("Preference saved")} /></Rowi>
      </Section>

      <Section title="Security">
        <Rowi label="Password" sub="Last changed 3 months ago"><button className="btn btn-outline btn-sm" onClick={() => setPwModal(true)}><Icon name="lock" size={15} /> Change</button></Rowi>
        <Rowi label="Two-factor authentication" sub="Add an extra layer of security"><Toggle on={false} onChange={() => toast("2FA setup coming soon", "info")} /></Rowi>
        <Rowi label="Sign out" sub="End your session on this device" last><button className="btn btn-outline btn-sm" onClick={() => setLogoutModal(true)}><Icon name="logout" size={15} /> Sign out</button></Rowi>
      </Section>

      <div className="card pad" style={{ borderColor: "var(--neg)", background: "var(--neg-soft)" }}>
        <div className="mb16 center gap8"><Icon name="alert" size={18} style={{ color: "var(--neg)" }} /><h3 style={{ fontSize: 15.5, color: "var(--neg)" }}>Danger zone</h3></div>
        <Rowi label="Delete account" sub="Permanently erase your data — this cannot be undone" last>
          <button className="btn btn-danger btn-sm" onClick={() => setDelModal(true)}><Icon name="trash" size={15} /> Delete</button>
        </Rowi>
      </div>

      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} />}
      {logoutModal && <ConfirmDialog title="Sign out?" confirmLabel="Sign out" body="You'll need to sign in again to access your account." onConfirm={actions.logout} onClose={() => setLogoutModal(false)} />}
      {delModal && <ConfirmDialog title="Delete your account?" danger confirmLabel="Delete account" body="This permanently removes your profile, transactions, budgets, pots and bills. This action cannot be undone." onConfirm={actions.logout} onClose={() => setDelModal(false)} />}
    </div>
  );
}

window.SettingsPage = SettingsPage;
