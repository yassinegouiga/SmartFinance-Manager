
const { useState: useStateAn, useEffect: useEffectAn, useMemo: useMemoAn } = React;

function AnalyticsPage() {
  const { transactions } = useStore();
  const [loading, setLoading] = useStateAn(true);
  const [range, setRange] = useStateAn("6m");
  const cur = window.__cur;
  useEffectAn(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); }, [range]);

  const th = chartTheme();
  const spent = useMemoAn(() => spentByCategory(transactions), [transactions]);
  const catRows = useMemoAn(() => Object.entries(spent).map(([id, v]) => ({ cat: catById(id), value: v })).sort((a, b) => b.value - a.value), [spent]);
  const totalSpent = catRows.reduce((a, c) => a + c.value, 0);
  const donut = {
    labels: catRows.map(r => r.cat.name),
    datasets: [{ data: catRows.map(r => r.value), backgroundColor: catRows.map(r => r.cat.color), borderColor: th.surface, borderWidth: 3, hoverOffset: 6 }],
  };
  const donutOpts = { responsive: true, maintainAspectRatio: false, animation: false, cutout: "66%", plugins: { legend: { display: false }, tooltip: { backgroundColor: th.surface, borderColor: th.grid, borderWidth: 1, titleColor: th.text, bodyColor: th.text, padding: 11, cornerRadius: 10, bodyFont: { family: "Plus Jakarta Sans", weight: "600" }, callbacks: { label: (c) => "  " + window.fmtMoney(c.parsed, cur) + "  ·  " + Math.round((c.parsed / totalSpent) * 100) + "%" } } } };
  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const trend = useMemoAn(() => {
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const ref = new Date(window.TODAY.getFullYear(), window.TODAY.getMonth() - i, 1);
      const t = monthTotals(transactions, ref);
      out.push({ label: ref.toLocaleDateString("en-US", { month: "short" }), income: t.income, expense: t.expense, net: t.net });
    }
    return out;
  }, [transactions, months]);
  const trendData = {
    labels: trend.map(m => m.label),
    datasets: [
      { type: "bar", label: "Income", data: trend.map(m => m.income), backgroundColor: th.accent + "cc", borderRadius: 6, maxBarThickness: 26, order: 2 },
      { type: "bar", label: "Expenses", data: trend.map(m => m.expense), backgroundColor: th.faint + "55", borderRadius: 6, maxBarThickness: 26, order: 2 },
      { type: "line", label: "Net savings", data: trend.map(m => m.net), borderColor: th.accent, backgroundColor: th.accent, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: th.accent, order: 1, fill: false },
    ],
  };

  const maxCat = catRows[0]?.value || 1;

  if (loading) {
    return (
      <div>
        <PageHead><div className="segmented"><button className="active">Loading…</button></div></PageHead>
        <div className="cols-2 mb16" style={{ gridTemplateColumns: "1fr 1.3fr" }}>
          <div className="card pad"><Skeleton w="40%" h={18} /><div style={{ display: "grid", placeItems: "center", height: 240 }}><Skeleton w={180} h={180} r="50%" /></div></div>
          <div className="card pad"><Skeleton w="40%" h={18} /><Skeleton w="100%" h={240} style={{ marginTop: 18, borderRadius: 12 }} /></div>
        </div>
        <div className="card pad"><Skeleton w="30%" h={18} />{[1,2,3,4].map(i => <Skeleton key={i} w="100%" h={40} style={{ marginTop: 12, borderRadius: 10 }} />)}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHead deps={[range]}>
        <div className="segmented accent">
          {[["3m", "3M"], ["6m", "6M"], ["12m", "12M"]].map(([v, l]) => <button key={v} className={range === v ? "active" : ""} onClick={() => setRange(v)}>{l}</button>)}
        </div>
      </PageHead>

      <div className="cols-2 mb16" style={{ gridTemplateColumns: "1fr 1.35fr" }}>
        {}
        <div className="card pad">
          <div className="card-head"><div style={{ flex: 1 }}><h3>Spending by category</h3><div className="sub">{monthName()}</div></div></div>
          {catRows.length === 0 ? <EmptyState icon="bars" title="No spending yet" body="Add some expenses to see your breakdown." /> : (
            <>
              <div style={{ position: "relative" }}>
                <ChartCanvas type="doughnut" data={donut} options={donutOpts} height={230} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <div style={{ textAlign: "center" }}><div className="t-xs muted">Total</div><div className="fw8 tnum" style={{ fontSize: 20 }}>{fmtMoney(totalSpent, cur)}</div></div>
                </div>
              </div>
              <div className="grid" style={{ gap: 8, marginTop: 16 }}>
                {catRows.slice(0, 5).map(r => (
                  <div className="between t-sm" key={r.cat.id}>
                    <span className="center gap8"><i style={{ width: 10, height: 10, borderRadius: 3, background: r.cat.color }} /><span className="fw7">{r.cat.name}</span></span>
                    <span className="muted tnum">{fmtMoney(r.value, cur)} · {Math.round((r.value / totalSpent) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {}
        <div className="card pad">
          <div className="card-head">
            <div style={{ flex: 1 }}><h3>Income vs expenses</h3><div className="sub">Last {months} months</div></div>
            <div className="center gap12 t-xs fw7">
              <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--accent-2)", display: "inline-block" }} />Income</span>
              <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--text-faint)", display: "inline-block" }} />Expenses</span>
              <span className="center" style={{ gap: 6 }}><i style={{ width: 14, height: 3, borderRadius: 3, background: "var(--accent-2)", display: "inline-block" }} />Net</span>
            </div>
          </div>
          <ChartCanvas type="bar" data={trendData} options={gridOpts(th, true)} height={282} />
        </div>
      </div>

      {}
      <div className="card pad">
        <div className="card-head"><div style={{ flex: 1 }}><h3>Top spending categories</h3><div className="sub">{monthName()}</div></div></div>
        {catRows.length === 0 ? <EmptyState icon="trendUp" title="Nothing to rank yet" /> : (
          <div className="grid" style={{ gap: 16 }}>
            {catRows.slice(0, 6).map((r, i) => (
              <div key={r.cat.id} className="center gap12">
                <span className="fw8 muted tnum" style={{ width: 18 }}>{i + 1}</span>
                <CatIcon cat={r.cat} size="sm" />
                <div style={{ flex: 1 }}>
                  <div className="between" style={{ marginBottom: 6 }}><span className="fw7 t-sm">{r.cat.name}</span><span className="tnum t-sm muted">{fmtMoney(r.value, cur)} · {Math.round((r.value / totalSpent) * 100)}%</span></div>
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

window.AnalyticsPage = AnalyticsPage;
