
const { useMemo: useMemoD } = React;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function StatCard({ label, icon, iconBg, iconColor, value, delta, deltaUp, accent }) {
  return (
    <div className="card stat">
      <div className="stat-ic" style={{ background: iconBg, color: iconColor }}><Icon name={icon} size={19} /></div>
      <div className="label">{label}</div>
      <div className="value tnum" style={accent ? { color: "var(--accent-2)" } : undefined}>{value}</div>
      {delta && <div className="delta"><span className={"badge " + (deltaUp ? "badge-pos" : "badge-neg")}><Icon name={deltaUp ? "trendUp" : "trendDown"} size={13} />{delta}</span><span className="t-xs muted" style={{ marginLeft: 8 }}>vs last month</span></div>}
    </div>
  );
}

function DashboardPage() {
  const { transactions, budgets, bills, pots, user, prefs } = useStore();
  const nav = useNav();
  const cur = prefs.currency;

  const thisM = useMemoD(() => monthTotals(transactions), [transactions]);
  const lastM = useMemoD(() => monthTotals(transactions, new Date(window.TODAY.getFullYear(), window.TODAY.getMonth() - 1, 1)), [transactions]);
  const balance = useMemoD(() => totalBalance(transactions), [transactions]);
  const spent = useMemoD(() => spentByCategory(transactions), [transactions]);
  const savingsRate = thisM.income > 0 ? Math.round((thisM.net / thisM.income) * 100) : 0;
  const recent = transactions.slice(0, 6);

  const pctDelta = (cur2, prev) => prev > 0 ? Math.round(((cur2 - prev) / prev) * 100) : 0;
  const flow = useMemoD(() => {
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const ref = new Date(window.TODAY.getFullYear(), window.TODAY.getMonth() - i, 1);
      const t = monthTotals(transactions, ref);
      months.push({ label: ref.toLocaleDateString("en-US", { month: "short" }), income: t.income, expense: t.expense });
    }
    return months;
  }, [transactions]);
  const th = chartTheme();
  const flowData = {
    labels: flow.map(m => m.label),
    datasets: [
      { label: "Income", data: flow.map(m => m.income), backgroundColor: th.accent, borderRadius: 6, maxBarThickness: 22 },
      { label: "Expenses", data: flow.map(m => m.expense), backgroundColor: th.faint + "66", borderRadius: 6, maxBarThickness: 22 },
    ],
  };

  const upcomingBills = bills.filter(b => !b.paid).sort((a, b) => a.dueDay - b.dueDay).slice(0, 4);
  const topBudgets = budgets.map(b => ({ ...b, spent: spent[b.category] || 0 })).sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit)).slice(0, 4);
  const dueDate = (day) => new Date(window.TODAY.getFullYear(), window.TODAY.getMonth(), day).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <PageHead>
        <button className="btn btn-outline hide-mobile" onClick={() => nav.setPage("analytics")}><Icon name="bars" size={17} /> Reports</button>
        <button className="btn btn-primary" onClick={nav.openQuickAdd}><Icon name="plus" size={18} /> <span className="hide-mobile">Add transaction</span></button>
      </PageHead>

      {}
      <div className="between mb24" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="t-sm fw7" style={{ color: "var(--accent-2)", letterSpacing: ".02em" }}>{monthName()}</div>
          <h1 style={{ fontSize: 34, marginTop: 6 }}>{greeting()}, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted mt8" style={{ fontSize: 14.5 }}>Here's how your money is doing this month.</p>
        </div>
        <div className="card pad center gap12 hide-mobile" style={{ padding: "14px 18px" }}>
          <div className="cat-ic" style={{ background: thisM.net >= 0 ? "var(--pos-soft)" : "var(--neg-soft)", color: thisM.net >= 0 ? "var(--pos)" : "var(--neg)" }}><Icon name={thisM.net >= 0 ? "trendUp" : "trendDown"} size={20} /></div>
          <div>
            <div className="t-xs muted">Net this month</div>
            <div className="fw8 tnum" style={{ fontSize: 18, color: thisM.net >= 0 ? "var(--pos)" : "var(--neg)" }}>{thisM.net >= 0 ? "+" : "−"}{fmtMoney(thisM.net, cur)}</div>
          </div>
        </div>
      </div>

      {}
      <div className="cols-4 keep2 mb16">
        <StatCard label="Total balance" icon="wallet" iconBg="var(--accent-soft)" iconColor="var(--accent-2)" value={fmtMoney(balance, cur)} delta={Math.abs(pctDelta(thisM.net, lastM.net)) + "%"} deltaUp={thisM.net >= lastM.net} />
        <StatCard label="Monthly income" icon="arrowDownRight" iconBg="var(--pos-soft)" iconColor="var(--pos)" value={fmtMoney(thisM.income, cur)} delta={Math.abs(pctDelta(thisM.income, lastM.income)) + "%"} deltaUp={thisM.income >= lastM.income} />
        <StatCard label="Monthly expenses" icon="arrowUpRight" iconBg="var(--neg-soft)" iconColor="var(--neg)" value={fmtMoney(thisM.expense, cur)} delta={Math.abs(pctDelta(thisM.expense, lastM.expense)) + "%"} deltaUp={thisM.expense < lastM.expense} />
        <StatCard label="Savings rate" icon="piggy" iconBg="var(--info-soft)" iconColor="var(--info)" value={savingsRate + "%"} delta={fmtMoney(thisM.net, cur)} deltaUp={thisM.net >= 0} />
      </div>

      <div className="dash-grid">
        {}
        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}><h3>Cash flow</h3><div className="sub">Income vs expenses · last 5 months</div></div>
              <div className="center gap12 t-xs fw7">
                <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--accent-2)", display: "inline-block" }} />Income</span>
                <span className="center" style={{ gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: "var(--text-faint)", display: "inline-block" }} />Expenses</span>
              </div>
            </div>
            <ChartCanvas type="bar" data={flowData} options={gridOpts(th, true)} height={240} />
          </div>

          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}><h3>Recent transactions</h3></div>
              <button className="btn btn-ghost btn-sm" onClick={() => nav.setPage("transactions")}>View all <Icon name="chevronRight" size={15} /></button>
            </div>
            <div style={{ margin: "0 -6px" }}>
              {recent.map(t => {
                const c = catById(t.category);
                return (
                  <div className="tx-row" key={t.id}>
                    <CatIcon cat={c} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw7" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note}</div>
                      <div className="t-xs muted">{c.name} · {fmtDate(t.date, "rel")}</div>
                    </div>
                    <Money amount={t.amount} type={t.type} strong />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {}
        <div className="grid" style={{ gap: 16 }}>
          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}><h3>Budgets</h3><div className="sub">{monthName()}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => nav.setPage("budgets")}>Manage</button>
            </div>
            <div className="grid" style={{ gap: 16 }}>
              {topBudgets.map(b => {
                const c = catById(b.category);
                const pct = Math.round((b.spent / b.limit) * 100);
                const over = b.spent > b.limit;
                return (
                  <div key={b.id}>
                    <div className="between" style={{ marginBottom: 8 }}>
                      <span className="center gap8"><CatIcon cat={c} size="sm" /><span className="fw7 t-sm">{c.name}</span></span>
                      <span className="t-sm tnum" style={{ color: over ? "var(--neg)" : "var(--text-2)" }}>{fmtMoney(b.spent, cur)} <span className="faint">/ {fmtMoney(b.limit, cur)}</span></span>
                    </div>
                    <Progress value={b.spent} max={b.limit} color={c.color} thin />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card pad">
            <div className="card-head">
              <div style={{ flex: 1 }}><h3>Upcoming bills</h3></div>
              <button className="btn btn-ghost btn-sm" onClick={() => nav.setPage("bills")}>All bills</button>
            </div>
            {upcomingBills.length === 0 ? (
              <div className="center" style={{ color: "var(--text-3)", gap: 8, padding: "8px 0" }}><Icon name="checkCircle" size={18} style={{ color: "var(--pos)" }} /> All bills paid this month 🎉</div>
            ) : (
              <div className="grid" style={{ gap: 4, margin: "0 -6px" }}>
                {upcomingBills.map(b => {
                  const c = catById(b.category);
                  return (
                    <div className="tx-row" key={b.id} style={{ padding: "10px 6px" }}>
                      <CatIcon cat={c} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw7 t-sm">{b.name}</div>
                        <div className="t-xs muted">Due {dueDate(b.dueDay)} · {b.frequency}</div>
                      </div>
                      <span className="fw7 tnum t-sm">{fmtMoney(b.amount, cur)}</span>
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

window.DashboardPage = DashboardPage;
