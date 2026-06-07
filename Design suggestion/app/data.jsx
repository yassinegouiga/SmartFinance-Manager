
const CURRENCIES = {
  USD: { symbol: "$", code: "USD", locale: "en-US" },
  EUR: { symbol: "€", code: "EUR", locale: "de-DE" },
  GBP: { symbol: "£", code: "GBP", locale: "en-GB" },
  JPY: { symbol: "¥", code: "JPY", locale: "ja-JP" },
};
const CATEGORIES = [
  { id: "groceries",    name: "Groceries",     icon: "cart",      color: "#34d399", kind: "expense" },
  { id: "rent",         name: "Rent",          icon: "wallet",    color: "#60a5fa", kind: "expense" },
  { id: "utilities",    name: "Utilities",     icon: "bolt",      color: "#fbbf24", kind: "expense" },
  { id: "entertainment",name: "Entertainment", icon: "film",      color: "#f472b6", kind: "expense" },
  { id: "transport",    name: "Transport",     icon: "car",       color: "#a78bfa", kind: "expense" },
  { id: "salary",       name: "Salary",        icon: "briefcase", color: "#10b981", kind: "income" },
  { id: "investments",  name: "Investments",   icon: "lineChart", color: "#22d3ee", kind: "income" },
  { id: "gifts",        name: "Gifts",         icon: "gift",      color: "#fb7185", kind: "both" },
  { id: "dining",       name: "Dining Out",    icon: "coffee",    color: "#fb923c", kind: "expense" },
  { id: "health",       name: "Health",        icon: "heart",     color: "#f87171", kind: "expense" },
];

const PALETTE = ["#34d399","#60a5fa","#fbbf24","#f472b6","#a78bfa","#10b981","#22d3ee","#fb7185","#fb923c","#f87171","#818cf8","#2dd4bf"];
const ICON_CHOICES = ["cart","wallet","bolt","film","car","briefcase","lineChart","gift","coffee","heart","book","plane","dumbbell","piggy","card","bag","clock"];
const TODAY = new Date(2026, 4, 28);
function dstr(y, m, d) { return new Date(y, m, d); }

const MERCHANTS = {
  groceries: ["Whole Foods", "Trader Joe's", "Safeway", "Costco", "Local Market"],
  rent: ["Parkview Apartments"],
  utilities: ["City Power & Light", "AquaFlow Water", "Comcast Xfinity", "T-Mobile"],
  entertainment: ["Netflix", "Spotify", "Steam", "AMC Theatres", "Disney+"],
  transport: ["Uber", "Shell Gas", "Lyft", "Metro Transit", "Chevron"],
  salary: ["Acme Corp Payroll"],
  investments: ["Vanguard Dividend", "Coinbase", "Fidelity"],
  gifts: ["Etsy", "Amazon Gift", "Birthday — Mom"],
  dining: ["Blue Bottle", "Sweetgreen", "Chipotle", "Olive & Vine", "Ramen House"],
  health: ["CVS Pharmacy", "ClassPass", "Dr. Lin Clinic"],
};

let _tid = 1000;
function mkTx(catId, amount, date, note) {
  const cat = CATEGORIES.find(c => c.id === catId);
  const type = cat.kind === "income" ? "income" : (cat.kind === "both" && amount > 0 ? "income" : "expense");
  const list = MERCHANTS[catId] || ["Payment"];
  return {
    id: "tx" + (++_tid),
    category: catId,
    type,
    amount: Math.abs(amount),
    date,
    note: note || list[Math.floor(Math.random() * list.length)],
  };
}

function buildTransactions() {
  const out = [];
  for (let m = 1; m <= 4; m++) {
    out.push(mkTx("salary", 5200, dstr(2026, m, 1), "Acme Corp Payroll"));
    out.push(mkTx("rent", 1850, dstr(2026, m, 3), "Parkview Apartments"));
    out.push(mkTx("utilities", 142.5, dstr(2026, m, 8), "City Power & Light"));
    out.push(mkTx("utilities", 64.2, dstr(2026, m, 9), "Comcast Xfinity"));
    out.push(mkTx("entertainment", 15.99, dstr(2026, m, 5), "Netflix"));
    out.push(mkTx("entertainment", 11.99, dstr(2026, m, 6), "Spotify"));
    out.push(mkTx("investments", 320, dstr(2026, m, 15), "Vanguard Dividend"));
    out.push(mkTx("groceries", 88 + Math.round(Math.random()*40), dstr(2026, m, 6)));
    out.push(mkTx("groceries", 64 + Math.round(Math.random()*40), dstr(2026, m, 14)));
    out.push(mkTx("groceries", 102 + Math.round(Math.random()*40), dstr(2026, m, 22)));
    out.push(mkTx("dining", 18 + Math.round(Math.random()*30), dstr(2026, m, 4)));
    out.push(mkTx("dining", 24 + Math.round(Math.random()*30), dstr(2026, m, 17)));
    out.push(mkTx("transport", 42 + Math.round(Math.random()*30), dstr(2026, m, 10)));
    out.push(mkTx("transport", 28 + Math.round(Math.random()*20), dstr(2026, m, 20)));
    out.push(mkTx("health", 39, dstr(2026, m, 12), "ClassPass"));
  }
  out.push(mkTx("groceries", 76.4, dstr(2026, 4, 27), "Trader Joe's"));
  out.push(mkTx("dining", 32.5, dstr(2026, 4, 26), "Sweetgreen"));
  out.push(mkTx("transport", 19.8, dstr(2026, 4, 26), "Uber"));
  out.push(mkTx("entertainment", 54, dstr(2026, 4, 24), "AMC Theatres"));
  out.push(mkTx("gifts", 65, dstr(2026, 4, 22), "Etsy"));
  out.push(mkTx("health", 28.9, dstr(2026, 4, 21), "CVS Pharmacy"));
  out.push(mkTx("dining", 14.25, dstr(2026, 4, 28), "Blue Bottle"));
  out.push(mkTx("groceries", 51.1, dstr(2026, 4, 20), "Safeway"));
  out.push(mkTx("transport", 58, dstr(2026, 4, 18), "Shell Gas"));
  out.push(mkTx("gifts", 120, dstr(2026, 4, 14), "Birthday — Mom"));
  return out.sort((a, b) => b.date - a.date);
}

const SEED = {
  user: { firstName: "Jordan", lastName: "Avery", name: "Jordan Avery", email: "jordan.avery@gmail.com", initials: "JA", avatar: null, verified: false },
  prefs: { theme: "dark", currency: "USD" },
  transactions: buildTransactions(),
  budgets: [
    { id: "b1", category: "groceries",    limit: 600 },
    { id: "b2", category: "dining",       limit: 250 },
    { id: "b3", category: "transport",    limit: 200 },
    { id: "b4", category: "entertainment",limit: 120 },
    { id: "b5", category: "utilities",    limit: 250 },
    { id: "b6", category: "health",       limit: 150 },
  ],
  pots: [
    { id: "p1", name: "Emergency Fund",   target: 10000, current: 6800, color: "#34d399", icon: "shield" },
    { id: "p2", name: "Japan Trip 2026",  target: 4500,  current: 2950, color: "#60a5fa", icon: "plane" },
    { id: "p3", name: "New MacBook",      target: 2400,  current: 2400, color: "#a78bfa", icon: "card" },
    { id: "p4", name: "Wedding Gift Pool",target: 800,   current: 180,  color: "#fb7185", icon: "gift" },
  ],
  bills: [
    { id: "bl1", name: "Rent — Parkview",     amount: 1850, category: "rent",        dueDay: 3,  frequency: "Monthly",   paid: true },
    { id: "bl2", name: "Electricity",         amount: 142.5,category: "utilities",   dueDay: 8,  frequency: "Monthly",   paid: false },
    { id: "bl3", name: "Internet — Xfinity",  amount: 64.2, category: "utilities",   dueDay: 9,  frequency: "Monthly",   paid: false },
    { id: "bl4", name: "Netflix",             amount: 15.99,category: "entertainment",dueDay: 5, frequency: "Monthly",   paid: true },
    { id: "bl5", name: "Spotify",             amount: 11.99,category: "entertainment",dueDay: 6, frequency: "Monthly",   paid: true },
    { id: "bl6", name: "T-Mobile",            amount: 70,   category: "utilities",   dueDay: 12, frequency: "Monthly",   paid: false },
    { id: "bl7", name: "Car Insurance",       amount: 540,  category: "transport",   dueDay: 1,  frequency: "Quarterly", paid: false },
    { id: "bl8", name: "Gym — ClassPass",     amount: 39,   category: "health",      dueDay: 12, frequency: "Monthly",   paid: true },
  ],
  notifications: [
    { id: "n1", type: "warn",  title: "Dining Out budget exceeded", body: "You've spent $268 of your $250 limit this month.", time: "2h ago", read: false, link: "budgets" },
    { id: "n2", type: "info",  title: "Bill due in 3 days", body: "Electricity ($142.50) is due May 8.", time: "5h ago", read: false, link: "bills" },
    { id: "n3", type: "pos",   title: "Goal reached! 🎉", body: "Your New MacBook pot hit its $2,400 target.", time: "1d ago", read: false, link: "pots" },
    { id: "n4", type: "info",  title: "Salary received", body: "$5,200.00 from Acme Corp Payroll was added.", time: "2d ago", read: true, link: "transactions" },
    { id: "n5", type: "warn",  title: "Unusual spend detected", body: "AMC Theatres charge of $54 is higher than usual.", time: "4d ago", read: true, link: "transactions" },
    { id: "n6", type: "pos",   title: "Emergency Fund growing", body: "You're 68% toward your $10,000 goal. Keep it up!", time: "6d ago", read: true, link: "pots" },
  ],
};
function fmtMoney(n, cur = "USD", opts = {}) {
  const c = CURRENCIES[cur] || CURRENCIES.USD;
  const max = c.code === "JPY" ? 0 : 2;
  const v = new Intl.NumberFormat(c.locale, { minimumFractionDigits: opts.compact ? 0 : max, maximumFractionDigits: max }).format(Math.abs(n));
  const sign = n < 0 ? "−" : "";
  return `${sign}${c.symbol}${v}`;
}
function fmtDate(d, style = "med") {
  const dt = d instanceof Date ? d : new Date(d);
  if (style === "rel") {
    const days = Math.round((TODAY - dt) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days > 1 && days < 7) return days + " days ago";
  }
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: style === "long" ? "numeric" : undefined });
}
function catById(id) { return CATEGORIES.find(c => c.id === id) || { id, name: id, icon: "more", color: "#94a3b8", kind: "expense" }; }
function sameMonth(d, ref = TODAY) { return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear(); }
function monthName(ref = TODAY) { return ref.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }

function monthTotals(txs, ref = TODAY) {
  let income = 0, expense = 0;
  txs.forEach(t => { if (sameMonth(t.date, ref)) { if (t.type === "income") income += t.amount; else expense += t.amount; } });
  return { income, expense, net: income - expense };
}
function spentByCategory(txs, ref = TODAY) {
  const m = {};
  txs.forEach(t => { if (t.type === "expense" && sameMonth(t.date, ref)) m[t.category] = (m[t.category] || 0) + t.amount; });
  return m;
}
function totalBalance(txs) {
  let bal = 8420;
  txs.forEach(t => bal += t.type === "income" ? t.amount : -t.amount);
  return bal;
}

Object.assign(window, {
  CURRENCIES, CATEGORIES, PALETTE, ICON_CHOICES, SEED, TODAY,
  fmtMoney, fmtDate, catById, sameMonth, monthName, monthTotals, spentByCategory, totalBalance,
});
