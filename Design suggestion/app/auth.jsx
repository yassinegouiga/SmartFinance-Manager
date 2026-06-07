
const { useState: useStateA } = React;

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useStateA("login");
  const [email, setEmail] = useStateA("jordan.avery@gmail.com");
  const [pw, setPw] = useStateA("");
  const [firstName, setFirstName] = useStateA("");
  const [lastName, setLastName] = useStateA("");
  const [showPw, setShowPw] = useStateA(false);
  const [errors, setErrors] = useStateA({});
  const [loading, setLoading] = useStateA(false);
  const [googleLoading, setGoogleLoading] = useStateA(false);
  const [resent, setResent] = useStateA(false);

  function validate() {
    const e = {};
    if (mode !== "verify") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Enter a valid email address";
      if (mode !== "forgot" && pw.length < 6) e.pw = "Password must be at least 6 characters";
      if (mode === "register") {
        if (!firstName.trim()) e.firstName = "First name required";
        if (!lastName.trim()) e.lastName = "Last name required";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mode === "login") onAuthed({ name: "Jordan Avery", email, verified: true });
      else if (mode === "register") setMode("verify");
      else if (mode === "forgot") setMode("login");
    }, 950);
  }

  function google() {
    setGoogleLoading(true);
    setTimeout(() => { setGoogleLoading(false); onAuthed({ name: "Jordan Avery", email: "jordan.avery@gmail.com", verified: true }); }, 1100);
  }
  if (mode === "verify") {
    return (
      <div className="auth">
        <AuthAside />
        <div className="auth-main">
          <div className="auth-card" style={{ textAlign: "center" }}>
            <div className="cat-ic lg" style={{ margin: "0 auto 18px", background: "var(--accent-soft)", color: "var(--accent-2)", width: 64, height: 64, borderRadius: 20 }}>
              <Icon name="mail" size={30} />
            </div>
            <h2>Verify your email</h2>
            <p className="lead">We sent a verification link to <b style={{ color: "var(--text)" }}>{email}</b>. Click it to activate your account.</p>
            <div className="banner banner-info mt24" style={{ textAlign: "left" }}>
              <Icon name="alert" size={18} />
              <div><b>Didn't get it?</b><div className="bd mt4">Check your spam folder, or resend below. Links expire after 24 hours.</div></div>
            </div>
            <button className="btn btn-primary btn-block btn-lg mt16" onClick={() => onAuthed({ name: "Jordan Avery", email, verified: true })}>
              I've verified — continue <Icon name="arrowRight" size={17} />
            </button>
            <button className="btn btn-ghost btn-block mt8" disabled={resent} onClick={() => setResent(true)}>
              {resent ? <><Icon name="check" size={16} /> Email resent</> : "Resend verification email"}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => { setMode("login"); setResent(false); }}>Back to sign in</button>
          </div>
        </div>
      </div>
    );
  }

  const isReg = mode === "register";
  const isForgot = mode === "forgot";
  return (
    <div className="auth">
      <AuthAside />
      <div className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="brand only-mobile" style={{ marginBottom: 18, padding: 0 }}>
            <div className="logo"><Icon name="wallet" size={20} /></div>
            <div><div className="name">Smart<span>Finance</span></div></div>
          </div>
          <h2>{isForgot ? "Reset password" : isReg ? "Create your account" : "Welcome back"}</h2>
          <p className="lead">{isForgot ? "Enter your email and we'll send reset instructions." : isReg ? "Start managing your money in minutes — it's free." : "Sign in to pick up where you left off."}</p>

          {!isForgot && (
            <>
              <button type="button" className="google-btn mt24" onClick={google} disabled={googleLoading}>
                {googleLoading ? <Spinner /> : <GoogleIcon size={18} />} Continue with Google
              </button>
              <div className="divider-or">or {isReg ? "sign up" : "sign in"} with email</div>
            </>
          )}

          <div className="grid" style={{ gap: 14, marginTop: isForgot ? 24 : 0 }}>
            {isReg && (
              <div className="cols-2 keep2" style={{ gap: 14 }}>
                <Field label="First name" error={errors.firstName}>
                  <TextInput icon="user" placeholder="Jordan" value={firstName} error={errors.firstName} onChange={e => setFirstName(e.target.value)} />
                </Field>
                <Field label="Last name" error={errors.lastName}>
                  <TextInput placeholder="Avery" value={lastName} error={errors.lastName} onChange={e => setLastName(e.target.value)} />
                </Field>
              </div>
            )}
            <Field label="Email" error={errors.email}>
              <TextInput icon="mail" type="email" placeholder="you@email.com" value={email} error={errors.email} onChange={e => setEmail(e.target.value)} />
            </Field>
            {!isForgot && (
              <Field label="Password" error={errors.pw} hint={isReg ? "Use 6+ characters" : undefined}>
                <div className="input-icon">
                  <Icon name="lock" size={17} />
                  <input className={"input affixed" + (errors.pw ? " has-err" : "")} style={{ paddingLeft: 40, paddingRight: 44 }}
                    type={showPw ? "text" : "password"} placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} />
                  <button type="button" className="icon-btn plain" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }} onClick={() => setShowPw(s => !s)}>
                    <Icon name={showPw ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
              </Field>
            )}
          </div>

          {mode === "login" && (
            <div className="between mt12">
              <label className="center t-sm" style={{ color: "var(--text-2)", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent)" }} /> Remember me
              </label>
              <button type="button" className="t-sm fw7" style={{ color: "var(--accent-2)", background: "none", border: 0 }} onClick={() => setMode("forgot")}>Forgot password?</button>
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg mt16" type="submit" disabled={loading}>
            {loading ? <Spinner /> : isForgot ? "Send reset link" : isReg ? "Create account" : "Sign in"}
          </button>

          <p className="t-sm muted" style={{ textAlign: "center", marginTop: 18 }}>
            {isForgot ? (
              <>Remembered it? <BtnLink onClick={() => setMode("login")}>Back to sign in</BtnLink></>
            ) : isReg ? (
              <>Already have an account? <BtnLink onClick={() => setMode("login")}>Sign in</BtnLink></>
            ) : (
              <>New to SmartFinance? <BtnLink onClick={() => setMode("register")}>Create an account</BtnLink></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

function BtnLink({ onClick, children }) {
  return <button type="button" onClick={onClick} style={{ color: "var(--accent-2)", fontWeight: 700, background: "none", border: 0 }}>{children}</button>;
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
        <h1 style={{ fontSize: 34, lineHeight: 1.1, maxWidth: 420 }}>Every dollar,<br />beautifully accounted for.</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 380, marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>
          Track spending, set budgets, grow savings pots and never miss a bill — all in one calm, focused workspace.
        </p>

        <div className="mock-card-3d">
          <div className="glow" />
          <div className="between" style={{ position: "relative" }}>
            <div>
              <div style={{ fontSize: 12, opacity: .75, fontWeight: 600 }}>Total balance</div>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>$24,580.40</div>
            </div>
            <Icon name="wallet" size={24} style={{ opacity: .8 }} />
          </div>
          <div className="row" style={{ position: "relative", marginTop: 24, gap: 20 }}>
            <div><div style={{ fontSize: 11, opacity: .7 }}>Income</div><div className="tnum fw7" style={{ marginTop: 3 }}>+$5,520</div></div>
            <div><div style={{ fontSize: 11, opacity: .7 }}>Spent</div><div className="tnum fw7" style={{ marginTop: 3 }}>−$3,140</div></div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}><div style={{ fontSize: 11, opacity: .7 }}>Saved</div><div className="tnum fw7" style={{ marginTop: 3 }}>38%</div></div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 22, color: "var(--text-3)", fontSize: 12.5, fontWeight: 600 }}>
        <span className="center"><Icon name="shield" size={15} /> Bank-grade security</span>
        <span className="center"><Icon name="sparkle" size={15} /> Smart insights</span>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
