import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import './Dashboard.css';

const CATEGORY_COLORS = [
  '#6C63FF','#3ECFCF','#f59e0b','#ef4444','#22c55e','#3b82f6','#ec4899','#8b5cf6',
];

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n ?? 0);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/dashboard/summary'),
      api.get('/api/v1/transactions/', { params: { limit: 100 } }),
      api.get('/api/v1/bills/'),
      api.get('/api/v1/categories/'),
    ]).then(([s, t, b, c]) => {
      setSummary(s.data);
      setTransactions(t.data);
      setBills(b.data);
      setCategories(c.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const categoryMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const chartData = useMemo(() => {
    const byMonth = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { month: MONTHS[d.getMonth()], income: 0, expense: 0, _sort: d.getFullYear() * 12 + d.getMonth() };
      if (t.type === 'INCOME') byMonth[key].income += t.amount;
      else byMonth[key].expense += t.amount;
    });
    return Object.values(byMonth).sort((a, b) => a._sort - b._sort).slice(-6);
  }, [transactions]);

  const donutData = useMemo(() => {
    const byCat = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const name = categoryMap[t.category_id] || 'Other';
      byCat[name] = (byCat[name] || 0) + t.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [transactions, categoryMap]);

  const recent = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
    [transactions]
  );

  const activeBills = bills.filter(b => b.status !== 'PAID').length;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        <StatCard
          label="Total Balance"
          value={fmt(summary?.total_balance ?? 0)}
          icon={<BalanceIcon />}
          color="accent"
          trend={summary?.total_balance >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Monthly Income"
          value={fmt(summary?.total_income ?? 0)}
          icon={<IncomeIcon />}
          color="green"
        />
        <StatCard
          label="Monthly Expenses"
          value={fmt(summary?.total_expense ?? 0)}
          icon={<ExpenseIcon />}
          color="red"
        />
        <StatCard
          label="Active Bills"
          value={activeBills}
          icon={<BillIcon />}
          color="yellow"
          suffix="unpaid"
        />
      </div>

      {/* Charts row */}
      <div className="dashboard-charts">
        <div className="glass dashboard-chart-main">
          <div className="chart-header">
            <h3 className="chart-title">Income vs Expenses</h3>
            <span className="chart-subtitle">Last 6 months</span>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <EmptyChartIcon />
              <h4>No data yet</h4>
              <p>Add transactions to see your trend</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#4a5568', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip
                  contentStyle={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
                  formatter={(v) => [fmt(v)]}
                />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass dashboard-chart-side">
          <div className="chart-header">
            <h3 className="chart-title">Spending by Category</h3>
          </div>
          {donutData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <EmptyChartIcon />
              <h4>No expenses yet</h4>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(v) => <span style={{ fontSize: 12, color: '#8892a4' }}>{v}</span>}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip
                  contentStyle={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
                  formatter={(v) => [fmt(v)]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass dashboard-recent">
        <div className="chart-header">
          <h3 className="chart-title">Recent Transactions</h3>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <EmptyTxnIcon />
            <h4>No transactions yet</h4>
            <p>Head to Transactions to add your first entry</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.description || '—'}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(108,99,255,0.12)', color: 'var(--accent)' }}>
                        {categoryMap[t.category_id] || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.type.toLowerCase()}`}>{t.type}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'INCOME' ? 'var(--green)' : 'var(--red)' }}>
                      {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, trend, suffix }) {
  const colors = {
    accent: { bg: 'rgba(108,99,255,0.1)', border: 'rgba(108,99,255,0.2)', icon: '#6C63FF' },
    green:  { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  icon: '#22c55e' },
    red:    { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  icon: '#ef4444' },
    yellow: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '#f59e0b' },
  };
  const c = colors[color];
  return (
    <div className="glass stat-card">
      <div className="stat-card-icon" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.icon }}>
        {icon}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-value-row">
          <span className="stat-card-value">{value}</span>
          {suffix && <span className="stat-card-suffix">{suffix}</span>}
          {trend && (
            <span className={`stat-card-trend ${trend}`}>
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const BalanceIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const IncomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const ExpenseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const BillIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const EmptyChartIcon = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const EmptyTxnIcon = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
