
const { useState: useStateUP } = React;

const PAGE_TITLES = {
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

function PageHead({ children, title, sub, deps }) {
  const nav = useNav();
  React.useEffect(() => {
    nav.setHeader({ title: title || null, sub: sub || null, actions: children || null });
    return () => nav.setHeader(null);
  }, [title, sub, ...(deps || [])]);
  return null;
}
function Money({ amount, type, signed, className = "", strong }) {
  const cur = window.__cur || "USD";
  let cls = className + " tnum";
  let prefix = "";
  if (type === "income" || (signed && amount >= 0)) { cls += " pos"; prefix = "+"; }
  else if (type === "expense" || (signed && amount < 0)) { cls += " neg"; prefix = "−"; }
  if (strong) cls += " fw8";
  return <span className={cls}>{prefix}{window.fmtMoney(amount, cur)}</span>;
}

function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="input-icon" style={{ minWidth: 0 }}>
      <Icon name="search" size={17} />
      <input className="input" style={{ paddingLeft: 40 }} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

window.PageHead = PageHead;
window.Money = Money;
window.SearchInput = SearchInput;
