
const { useState: useStateSh, useEffect: useEffectSh, createContext: createCtxSh, useContext: useCtxSh, useCallback: useCbSh, useMemo: useMemoSh } = React;

const NAV = [
  { id: "dashboard",     label: "Dashboard",     icon: "dashboard", group: "Overview" },
  { id: "transactions",  label: "Transactions",  icon: "exchange",  group: "Overview" },
  { id: "analytics",     label: "Analytics",     icon: "bars",      group: "Overview" },
  { id: "budgets",       label: "Budgets",       icon: "wallet",    group: "Manage" },
  { id: "pots",          label: "Saving Pots",   icon: "target",    group: "Manage" },
  { id: "bills",         label: "Bills",         icon: "receipt",   group: "Manage" },
  { id: "categories",    label: "Categories",    icon: "grid",      group: "Manage" },
  { id: "notifications", label: "Notifications", icon: "bell",      group: "Account" },
  { id: "settings",      label: "Settings",      icon: "settings",  group: "Account" },
];
const PAGE_META = {
  dashboard: ["Dashboard", "Your money at a glance"],
  transactions: ["Transactions", "Every income & expense"],
  analytics: ["Analytics", "Trends and insights"],
  budgets: ["Budgets", "Spending limits by category"],
  pots: ["Saving Pots", "Goals you're building toward"],
  bills: ["Bills", "Recurring payments"],
  categories: ["Categories", "Organise your spending"],
  notifications: ["Notifications", "Alerts & activity"],
  settings: ["Settings", "Profile & preferences"],
};
const MOBILE_NAV = ["dashboard", "transactions", "__add", "budgets", "settings"];

const NavCtx = createCtxSh(null);
const useNav = () => useCtxSh(NavCtx);
const DeviceCtx = createCtxSh("desktop");
const useDevice = () => useCtxSh(DeviceCtx);
function Sidebar({ page, setPage }) {
  const { user, notifications } = useStore();
  const unread = notifications.filter(n => !n.read).length;
  const groups = [...new Set(NAV.map(n => n.group))];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><Icon name="wallet" size={21} /></div>
        <div>
          <div className="name">Smart<span>Finance</span></div>
          <div className="sub">Manager</div>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1, margin: "0 -6px", padding: "0 6px" }}>
        {groups.map(g => (
          <div key={g}>
            <div className="nav-group-label">{g}</div>
            {NAV.filter(n => n.group === g).map(n => (
              <button key={n.id} className={"nav-item" + (page === n.id ? " active" : "")} onClick={() => setPage(n.id)}>
                <Icon name={n.icon} size={19} />
                {n.label}
                {n.id === "notifications" && unread > 0 && <span className="badge-dot">{unread}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <button className="user-chip" onClick={() => setPage("settings")}>
          <Avatar name={user.name} size={36} src={user.avatar} />
          <div className="meta" style={{ flex: 1 }}>
            <div className="nm">{user.name}</div>
            <div className="em">{user.email}</div>
          </div>
          <Icon name="chevronRight" size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>
    </aside>
  );
}
function BottomNav({ page, setPage, onAdd }) {
  return (
    <nav className="bottomnav">
      {MOBILE_NAV.map(id => {
        if (id === "__add") return (
          <button key="add" className="fab" onClick={onAdd}><div className="fab-btn"><Icon name="plus" size={24} /></div></button>
        );
        const n = NAV.find(x => x.id === id);
        return (
          <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
            <Icon name={n.icon} size={21} />{n.label}
          </button>
        );
      })}
    </nav>
  );
}
function TopBar({ header, theme, onToggleTheme, unread, onBell }) {
  const { page } = useNav();
  const meta = PAGE_META[page] || ["", ""];
  const title = (header && header.title) || meta[0];
  const sub = (header && header.sub) || meta[1];
  return (
    <header className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
        <div className="page-sub hide-mobile">{sub}</div>
      </div>
      <div className="topbar-spacer" />
      <div className="center gap8">
        {header && header.actions}
        <button className="icon-btn" title="Toggle notifications" onClick={onBell} style={{ position: "relative" }}>
          <Icon name="bell" size={18} />
          {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 99, background: "var(--neg)", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid var(--bg-elev)" }}>{unread}</span>}
        </button>
        <button className="icon-btn" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} aria-label="Toggle theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
      </div>
    </header>
  );
}
function AppShell() {
  const store = useStore();
  const device = useDevice();
  const [page, setPageState] = useStateSh("dashboard");
  const [quickAdd, setQuickAdd] = useStateSh(false);
  const [header, setHeaderState] = useStateSh(null);
  useEffectSh(() => {
    document.documentElement.setAttribute("data-theme", store.prefs.theme);
    document.documentElement.classList.add("theming");
    const t = setTimeout(() => document.documentElement.classList.remove("theming"), 400);
    return () => clearTimeout(t);
  }, [store.prefs.theme]);
  useEffectSh(() => { window.__cur = store.prefs.currency; }, [store.prefs.currency]);

  const setPage = useCbSh((p) => setPageState(p), []);
  const openQuickAdd = useCbSh(() => setQuickAdd(true), []);
  const setHeader = useCbSh((h) => setHeaderState(h), []);
  const navValue = useMemoSh(() => ({ page, setPage, openQuickAdd, setHeader }), [page, setPage, openQuickAdd, setHeader]);
  const toggleTheme = () => store.actions.setTheme(store.prefs.theme === "dark" ? "light" : "dark");
  const unread = store.notifications.filter(n => !n.read).length;

  const PAGES = {
    dashboard: window.DashboardPage, transactions: window.TransactionsPage, analytics: window.AnalyticsPage,
    budgets: window.BudgetsPage, pots: window.PotsPage, bills: window.BillsPage, categories: window.CategoriesPage,
    notifications: window.NotificationsPage, settings: window.SettingsPage,
  };
  const Page = PAGES[page] || (() => null);

  return (
    <NavCtx.Provider value={navValue}>
      <div className="app">
        {device === "desktop" && <Sidebar page={page} setPage={setPage} />}
        <div className="main">
          <TopBar header={header} theme={store.prefs.theme} onToggleTheme={toggleTheme} unread={unread} onBell={() => setPage("notifications")} />
          <div className="content" key={page}>
            <div className="content-inner">
              <Page />
            </div>
          </div>
        </div>
        {device === "mobile" && <BottomNav page={page} setPage={setPage} onAdd={() => setQuickAdd(true)} />}
      </div>
      {quickAdd && window.AddTransactionModal && <window.AddTransactionModal onClose={() => setQuickAdd(false)} />}
    </NavCtx.Provider>
  );
}
function DeviceToggle({ device, setDevice }) {
  return (
    <div style={{ position: "fixed", bottom: 14, right: 14, zIndex: 300, display: "flex", gap: 4, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 99, padding: 4, boxShadow: "var(--shadow-lg)" }}>
      {[["desktop", "Desktop"], ["mobile", "Mobile"]].map(([v, label]) => (
        <button key={v} onClick={() => setDevice(v)}
          style={{ border: 0, borderRadius: 99, padding: "6px 13px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            background: device === v ? "var(--accent-soft)" : "transparent", color: device === v ? "var(--accent-2)" : "var(--text-3)" }}>
          {label}
        </button>
      ))}
    </div>
  );
}
function RootApp() {
  const [authed, setAuthed] = useStateSh(false);
  const [device, setDevice] = useStateSh(window.innerWidth < 760 ? "mobile" : "desktop");

  useEffectSh(() => { document.documentElement.setAttribute("data-theme", "dark"); }, []);

  const inner = authed
    ? <StoreProvider onLogout={() => setAuthed(false)}><DeviceCtx.Provider value={device}><AppShell /></DeviceCtx.Provider></StoreProvider>
    : <AuthScreen onAuthed={() => setAuthed(true)} />;

  return (
    <>
      <DeviceToggle device={device} setDevice={setDevice} />
      <div className={"viewport-host" + (device === "mobile" ? " is-mobile" : "")}>
        {device === "mobile" && authed ? (
          <div className="phone">
            <div className="notch" />
            <div className="statusbar"><span>9:41</span><span className="dots"><Icon name="bell" size={13} /><Icon name="wallet" size={13} /></span></div>
            <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>{inner}</div>
          </div>
        ) : device === "mobile" ? (
          <div className="phone">
            <div className="notch" />
            <div className="statusbar"><span>9:41</span><span className="dots"><Icon name="wallet" size={13} /></span></div>
            <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>{inner}</div>
          </div>
        ) : inner}
      </div>
    </>
  );
}

Object.assign(window, { RootApp, useNav, useDevice, TopBar, NavCtx });
