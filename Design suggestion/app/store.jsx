
const { useState: useStateS, useContext: useContextS, createContext: createContextS, useMemo: useMemoS } = React;

const StoreCtx = createContextS(null);
function useStore() { return useContextS(StoreCtx); }

let _uid = 0;
const uid = (p) => p + Date.now().toString(36) + (_uid++);

function StoreProvider({ children, onLogout }) {
  const [user, setUser] = useStateS(SEED.user);
  const [prefs, setPrefs] = useStateS(SEED.prefs);
  const [transactions, setTransactions] = useStateS(SEED.transactions);
  const [budgets, setBudgets] = useStateS(SEED.budgets);
  const [pots, setPots] = useStateS(SEED.pots);
  const [bills, setBills] = useStateS(SEED.bills);
  const [notifications, setNotifications] = useStateS(SEED.notifications);
  const [categories, setCategories] = useStateS(CATEGORIES);

  const actions = useMemoS(() => ({
    addTransaction: (t) => setTransactions(s => [{ ...t, id: uid("tx") }, ...s].sort((a, b) => b.date - a.date)),
    deleteTransaction: (id) => setTransactions(s => s.filter(t => t.id !== id)),
    addCategory: (c) => setCategories(s => [...s, { ...c, id: uid("cat") }]),
    deleteCategory: (id) => setCategories(s => s.filter(c => c.id !== id)),
    addBudget: (b) => setBudgets(s => [...s, { ...b, id: uid("b") }]),
    updateBudget: (id, patch) => setBudgets(s => s.map(b => b.id === id ? { ...b, ...patch } : b)),
    deleteBudget: (id) => setBudgets(s => s.filter(b => b.id !== id)),
    addPot: (p) => setPots(s => [...s, { ...p, id: uid("p"), current: p.current || 0 }]),
    depositPot: (id, amt) => setPots(s => s.map(p => p.id === id ? { ...p, current: p.current + amt } : p)),
    withdrawPot: (id, amt) => setPots(s => s.map(p => p.id === id ? { ...p, current: Math.max(0, p.current - amt) } : p)),
    deletePot: (id) => setPots(s => s.filter(p => p.id !== id)),
    addBill: (b) => setBills(s => [...s, { ...b, id: uid("bl"), paid: false }]),
    toggleBillPaid: (id) => setBills(s => s.map(b => b.id === id ? { ...b, paid: !b.paid } : b)),
    deleteBill: (id) => setBills(s => s.filter(b => b.id !== id)),
    markNotifRead: (id) => setNotifications(s => s.map(n => n.id === id ? { ...n, read: true } : n)),
    markAllRead: () => setNotifications(s => s.map(n => ({ ...n, read: true }))),
    clearNotifs: () => setNotifications([]),
    setTheme: (theme) => setPrefs(p => ({ ...p, theme })),
    setCurrency: (currency) => { window.__cur = currency; setPrefs(p => ({ ...p, currency })); },
    updateProfile: (patch) => setUser(u => ({ ...u, ...patch })),
    logout: onLogout,
  }), [onLogout]);

  const value = { user, prefs, transactions, budgets, pots, bills, notifications, categories, actions };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

Object.assign(window, { StoreProvider, useStore });
