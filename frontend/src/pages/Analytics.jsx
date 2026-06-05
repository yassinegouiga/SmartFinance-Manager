import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { Progress, EmptyState, Spinner, PageHead, CatIcon } from '../components/UI';
import { ChartCanvas, chartTheme, gridOpts } from '../components/Chart';
import { fmtMoney } from '../utils/format';

const inMonth = (d, ref) => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();

function monthTotals(txns, ref) {
  let income = 0, expense = 0;
  txns.forEach(t => {
    const d = new Date(t.date);
    if (inMonth(d, ref)) { if (t.type === 'INCOME') income += t.amount; else expense += t.amount; }
  });
  return { income, expense, net: income - expense };
}

export default function Analytics() {
  const { currency = 'USD' } = useAuth();
  const { catById } = useCategories();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('6m');

  useEffect(() => {
    api.get('/api/v1/transactions/', { params: { limit: 1000 } })
      .then(r => setTransactions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  // spending by category — this month
  const catRows = useMemo(() => {
    const m = {};
    transactions.forEach(t => {
      if (t.type === 'EXPENSE' && inMonth(new Date(t.date), now)) {
        m[t.category_id] = (m[t.category_id] || 0) + t.amount;
      }
    });
    return Object.entries(m)
      .map(([id, value]) => ({ cat: catById(id), value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, catById]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalSpent = catRows.reduce((a, c) => a + c.value, 0);

  const months = range === '3m' ? 3 : range === '12m' ? 12 : 6;
  const trend = useMemo(() => {
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const t = monthTotals(transactions, ref);
      out.push({ label: ref.toLocaleDateString('en-US', { month: 'short' }), ...t });
    }
    return out;
  }, [transactions, months]); // eslint-disable-line react-hooks/exhaustive-deps

  const th = chartTheme();

  const donutData = {
    labels: catRows.map(r => r.cat.name),
    datasets: [{
      data: catRows.map(r => r.value),
      backgroundColor: catRows.map(r => r.cat.color),
      borderColor: th.surface, borderWidth: 3, hoverOffset: 6,
    }],
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false, animation: false, cutout: '66%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: th.surface, borderColor: th.grid, borderWidth: 1, titleColor: th.text, bodyColor: th.text,
        padding: 11, cornerRadius: 10, bodyFont: { family: 'Plus Jakarta Sans', weight: '600' },
        callbacks: { label: (c) => '  ' + fmtMoney(c.parsed, currency) + '  ·  ' + Math.round((c.parsed / totalSpent) * 100) + '%' },
      },
    },
  };

  const trendData = {
    labels: trend.map(m => m.label),
    datasets: [
      { type: 'bar', label: 'Income', data: trend.map(m => m.income), backgroundColor: th.accent + 'cc', borderRadius: 6, maxBarThickness: 26, order: 2 },
      { type: 'bar', label: 'Expenses', data: trend.map(m => m.expense), backgroundColor: th.faint + '55', borderRadius: 6, maxBarThickness: 26, order: 2 },
      { type: 'line', label: 'Net', data: trend.map(m => m.net), borderColor: th.accent, backgroundColor: th.accent, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: th.accent, order: 1, fill: false },
    ],
  };

  const maxCat = catRows[0]?.value || 1;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead deps={[range]}>
        <div className="segmented accent">
          {[['3m', '3M'], ['6m', '6M'], ['12m', '12M']].map(([v, l]) => (
            <button key={v} className={range === v ? 'active' : ''} onClick={() => setRange(v)}>{l}</button>
          ))}
        </div>
      </PageHead>

      <div className="cols-2 mb16" style={{ gridTemplateColumns: '1fr 1.35fr' }}>
        {/* Donut */}
        <div className="card pad">
          <div className="card-head">
            <div style={{ flex: 1 }}><h3>Spending by category</h3><div className="sub">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div></div>
          </div>
          {catRows.length === 0 ? (
            <EmptyState icon="bars" title="No spending yet" body="Add some expenses to see your breakdown." />
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <ChartCanvas type="doughnut" data={donutData} options={donutOpts} height={230} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="t-xs muted">Total</div>
                    <div className="fw8 tnum" style={{ fontSize: 20 }}>{fmtMoney(totalSpent, currency)}</div>
                  </div>
                </div>
              </div>
              <div className="grid" style={{ gap: 8, marginTop: 16 }}>
                {catRows.slice(0, 5).map(r => (
                  <div className="between t-sm" key={r.cat.id}>
                    <span className="center gap8"><i style={{ width: 10, height: 10, borderRadius: 3, background: r.cat.color }} /><span className="fw7">{r.cat.name}</span></span>
                    <span className="muted tnum">{fmtMoney(r.value, currency)} · {Math.round((r.value / totalSpent) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Trend */}
        <div className="card pad">
          <div className="card-head">
            <div style={{ flex: 1 }}><h3>Income vs expenses</h3><div className="sub">Last {months} months</div></div>
            <div className="center gap12 t-xs fw7">
              <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--accent-2)', display: 'inline-block' }} />Income</span>
              <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--text-faint)', display: 'inline-block' }} />Expenses</span>
              <span className="center" style={{ gap: 6 }}><i style={{ width: 14, height: 3, borderRadius: 3, background: 'var(--accent-2)', display: 'inline-block' }} />Net</span>
            </div>
          </div>
          <ChartCanvas type="bar" data={trendData} options={gridOpts(th, true, currency)} height={282} />
        </div>
      </div>

      {/* Top categories */}
      <div className="card pad">
        <div className="card-head"><div style={{ flex: 1 }}><h3>Top spending categories</h3><div className="sub">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div></div></div>
        {catRows.length === 0 ? (
          <EmptyState icon="trendUp" title="Nothing to rank yet" />
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {catRows.slice(0, 6).map((r, i) => (
              <div key={r.cat.id} className="center gap12">
                <span className="fw8 muted tnum" style={{ width: 18 }}>{i + 1}</span>
                <CatIcon cat={r.cat} size="sm" />
                <div style={{ flex: 1 }}>
                  <div className="between" style={{ marginBottom: 6 }}>
                    <span className="fw7 t-sm">{r.cat.name}</span>
                    <span className="tnum t-sm muted">{fmtMoney(r.value, currency)} · {Math.round((r.value / totalSpent) * 100)}%</span>
                  </div>
                  <Progress value={r.value} max={maxCat} color={r.cat.color} thin />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
