import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import Icon from '../components/Icons/Icon';
import { Progress, EmptyState, Spinner, Money, PageHead, CatIcon } from '../components/UI';
import { ChartCanvas, chartTheme, gridOpts } from '../components/Chart';
import { fmtMoney, fmtDate } from '../utils/format';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function monthTotals(txns, ref) {
  let income = 0, expense = 0;
  txns.forEach(t => {
    const d = new Date(t.date);
    if (d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()) {
      if (t.type === 'INCOME') income += t.amount; else expense += t.amount;
    }
  });
  return { income, expense, net: income - expense };
}

const pctDelta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0);

function StatCard({ label, icon, iconBg, iconColor, value, delta, deltaUp }) {
  return (
    <div className="card stat">
      <div className="stat-ic" style={{ background: iconBg, color: iconColor }}>
        <Icon name={icon} size={19} />
      </div>
      <div className="label">{label}</div>
      <div className="value tnum">{value}</div>
      {delta != null && (
        <div className="delta">
          <span className={'badge ' + (deltaUp ? 'badge-pos' : 'badge-neg')}>
            <Icon name={deltaUp ? 'trendUp' : 'trendDown'} size={13} />{delta}
          </span>
          <span className="t-xs muted" style={{ marginLeft: 8 }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { profile, currency = 'USD' } = useAuth();
  const { catById } = useCategories();
  const navigate = useNavigate();

  const [summary, setSummary]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills]               = useState([]);
  const [budgets, setBudgets]           = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/dashboard/summary'),
      api.get('/api/v1/transactions/', { params: { limit: 500 } }),
      api.get('/api/v1/bills/'),
      api.get('/api/v1/budgets/'),
    ]).then(([s, t, b, bu]) => {
      setSummary(s.data);
      setTransactions(t.data);
      setBills(b.data);
      setBudgets(bu.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisM = useMemo(() => monthTotals(transactions, now), [transactions]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastM = useMemo(() => monthTotals(transactions, new Date(now.getFullYear(), now.getMonth() - 1, 1)), [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const flow = useMemo(() => {
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const t = monthTotals(transactions, ref);
      months.push({ label: ref.toLocaleDateString('en-US', { month: 'short' }), income: t.income, expense: t.expense });
    }
    return months;
  }, [transactions]); // eslint-disable-line react-hooks/exhaustive-deps

  const recent = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [transactions],
  );

  const upcomingBills = useMemo(
    () => bills.filter(b => b.status !== 'PAID').sort((a, b) => (a.due_day || 1) - (b.due_day || 1)).slice(0, 4),
    [bills],
  );

  const topBudgets = useMemo(
    () => budgets
      .map(b => ({ ...b, cat: catById(b.category_id) }))
      .sort((a, b) => (b.spent_amount / (b.monthly_limit || 1)) - (a.spent_amount / (a.monthly_limit || 1)))
      .slice(0, 4),
    [budgets, catById],
  );

  // The summary endpoint exposes figures under `breakdown` (current build) or
  // `current_month_summary` (older build) — read whichever is present.
  const breakdown = summary?.breakdown || summary?.current_month_summary || {};
  const income  = breakdown.total_income  ?? 0;
  const expense = breakdown.total_expense ?? 0;
  const balance = breakdown.total_balance ?? 0;
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const firstName = profile?.first_name || 'there';

  const th = chartTheme();
  const flowData = {
    labels: flow.map(m => m.label),
    datasets: [
      { label: 'Income',   data: flow.map(m => m.income),  backgroundColor: th.accent,        borderRadius: 6, maxBarThickness: 22 },
      { label: 'Expenses', data: flow.map(m => m.expense), backgroundColor: th.faint + '66',  borderRadius: 6, maxBarThickness: 22 },
    ],
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  const hasFlow = flow.some(m => m.income || m.expense);

  return (
    <div>
      <PageHead>
        <button className="btn btn-outline hide-mobile" onClick={() => navigate('/analytics')}>
          <Icon name="bars" size={17} /> Reports
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/transactions')}>
          <Icon name="plus" size={18} /> <span className="hide-mobile">Add transaction</span>
        </button>
      </PageHead>

      {/* Greeting hero */}
      <div className="between mb24" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="t-sm fw7" style={{ color: 'var(--accent-2)', letterSpacing: '.02em' }}>
            {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 30, marginTop: 6 }}>{greeting()}, {firstName} 👋</h1>
          <p className="muted mt8" style={{ fontSize: 14.5 }}>Here's how your money is doing this month.</p>
        </div>
        <div className="card pad center gap12 hide-mobile" style={{ padding: '14px 18px' }}>
          <div className="cat-ic" style={{ background: net >= 0 ? 'var(--pos-soft)' : 'var(--neg-soft)', color: net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
            <Icon name={net >= 0 ? 'trendUp' : 'trendDown'} size={20} />
          </div>
          <div>
            <div className="t-xs muted">Net this month</div>
            <div className="fw8 tnum" style={{ fontSize: 18, color: net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
              {net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net), currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="cols-4 keep2 mb16">
        <StatCard label="Total balance" icon="wallet" iconBg="var(--accent-soft)" iconColor="var(--accent-2)"
          value={fmtMoney(balance, currency, { compact: true })}
          delta={lastM.net !== 0 ? Math.abs(pctDelta(thisM.net, lastM.net)) + '%' : null} deltaUp={thisM.net >= lastM.net} />
        <StatCard label="Monthly income" icon="arrowDownRight" iconBg="var(--pos-soft)" iconColor="var(--pos)"
          value={fmtMoney(income, currency, { compact: true })}
          delta={lastM.income > 0 ? Math.abs(pctDelta(thisM.income, lastM.income)) + '%' : null} deltaUp={thisM.income >= lastM.income} />
        <StatCard label="Monthly expenses" icon="arrowUpRight" iconBg="var(--neg-soft)" iconColor="var(--neg)"
          value={fmtMoney(expense, currency, { compact: true })}
          delta={lastM.expense > 0 ? Math.abs(pctDelta(thisM.expense, lastM.expense)) + '%' : null} deltaUp={thisM.expense < lastM.expense} />
        <StatCard label="Savings rate" icon="piggy" iconBg="var(--info-soft)" iconColor="var(--info)"
          value={savingsRate + '%'} />
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* Left column */}
        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}>
                <h3>Cash flow</h3>
                <div className="sub">Income vs expenses · last 5 months</div>
              </div>
              <div className="center gap12 t-xs fw7">
                <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--accent-2)', display: 'inline-block' }} />Income</span>
                <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--text-faint)', display: 'inline-block' }} />Expenses</span>
              </div>
            </div>
            {hasFlow ? (
              <ChartCanvas type="bar" data={flowData} options={gridOpts(th, true, currency)} height={240} />
            ) : (
              <EmptyState icon="bars" title="No data yet" body="Add transactions to see your cash flow" />
            )}
          </div>

          <div className="card pad">
            <div className="card-head">
              <h3 style={{ flex: 1 }}>Recent transactions</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>
                View all <Icon name="chevronRight" size={15} />
              </button>
            </div>
            {recent.length === 0 ? (
              <EmptyState icon="exchange" title="No transactions yet" body="Add your first income or expense" />
            ) : (
              <div style={{ margin: '0 -6px' }}>
                {recent.map(t => {
                  const c = catById(t.category_id);
                  return (
                    <div className="tx-row" key={t.id}>
                      <CatIcon cat={c} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw7" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description || c.name}
                        </div>
                        <div className="t-xs muted">{c.name} · {fmtDate(t.date, 'rel')}</div>
                      </div>
                      <Money amount={t.amount} type={t.type === 'INCOME' ? 'income' : 'expense'} cur={currency} strong />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}>
                <h3>Budgets</h3>
                <div className="sub">{now.toLocaleDateString('en-US', { month: 'long' })}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/budgets')}>Manage</button>
            </div>
            {topBudgets.length === 0 ? (
              <EmptyState icon="wallet" title="No budgets set" body="Create budgets to track your spending" />
            ) : (
              <div className="grid" style={{ gap: 16 }}>
                {topBudgets.map(b => {
                  const over = b.spent_amount > b.monthly_limit;
                  return (
                    <div key={b.id}>
                      <div className="between" style={{ marginBottom: 8 }}>
                        <span className="center gap8"><CatIcon cat={b.cat} size="sm" /><span className="fw7 t-sm">{b.cat.name}</span></span>
                        <span className="t-sm tnum" style={{ color: over ? 'var(--neg)' : 'var(--text-2)' }}>
                          {fmtMoney(b.spent_amount, currency)} <span className="faint">/ {fmtMoney(b.monthly_limit, currency)}</span>
                        </span>
                      </div>
                      <Progress value={b.spent_amount} max={b.monthly_limit} color={b.cat.color} thin />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="card-head">
              <h3 style={{ flex: 1 }}>Upcoming bills</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bills')}>All bills</button>
            </div>
            {upcomingBills.length === 0 ? (
              <div className="center" style={{ color: 'var(--text-3)', gap: 8, padding: '8px 0' }}>
                <Icon name="checkCircle" size={18} style={{ color: 'var(--pos)' }} />
                All bills paid this month 🎉
              </div>
            ) : (
              <div className="grid" style={{ gap: 4, margin: '0 -6px' }}>
                {upcomingBills.map(b => {
                  const c = b.category_id ? catById(b.category_id) : { icon: 'receipt', color: 'var(--accent)' };
                  const dueDate = new Date(now.getFullYear(), now.getMonth(), b.due_day || 1)
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div className="tx-row" key={b.id} style={{ padding: '10px 6px' }}>
                      <CatIcon cat={c} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw7 t-sm">{b.name}</div>
                        <div className="t-xs muted">Due {dueDate} · {b.frequency}</div>
                      </div>
                      <span className="fw7 tnum t-sm">{fmtMoney(b.amount, currency)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
