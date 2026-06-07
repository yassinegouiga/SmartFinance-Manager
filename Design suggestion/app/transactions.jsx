
const { useState: useStateTx, useMemo: useMemoTx } = React;

function todayISO() { const d = window.TODAY; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function AddTransactionModal({ onClose, initial }) {
  const { categories, actions } = useStore();
  const toast = useToast();
  const [type, setType] = useStateTx(initial?.type || "expense");
  const [amount, setAmount] = useStateTx(initial?.amount ? String(initial.amount) : "");
  const [category, setCategory] = useStateTx(initial?.category || "");
  const [date, setDate] = useStateTx(initial?.dateISO || todayISO());
  const [note, setNote] = useStateTx(initial?.note || "");
  const [err, setErr] = useStateTx({});

  const cats = categories.filter(c => c.kind === type || c.kind === "both");

  function save() {
    const e = {};
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) e.amount = "Enter an amount greater than 0";
    if (!category) e.category = "Pick a category";
    setErr(e);
    if (Object.keys(e).length) return;
    actions.addTransaction({ type, amount: amt, category, date: new Date(date + "T12:00:00"), note: note.trim() || catById(category).name });
    toast(`${type === "income" ? "Income" : "Expense"} of ${fmtMoney(amt, window.__cur)} added`);
    onClose();
  }

  return (
    <Modal title="Add transaction" sub="Record income or an expense" onClose={onClose} icon="plus"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={17} /> Save transaction</button>
      </>}>
      <Segmented value={type} accent onChange={(v) => { setType(v); setCategory(""); }} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
      <Field label="Amount" error={err.amount}>
        <TextInput affix={window.CURRENCIES[window.__cur||"USD"].symbol} type="number" inputMode="decimal" placeholder="0.00" value={amount} error={err.amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="Category" error={err.category}>
        <Select value={category} error={err.category} onChange={e => setCategory(e.target.value)}>
          <option value="" disabled>Select a category…</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <div className="cols-2 keep2" style={{ gap: 14 }}>
        <Field label="Date">
          <input className="input" type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <TextInput placeholder="e.g. Weekly shop" value={note} onChange={e => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
function TransactionsPage() {
  const { transactions, categories, actions } = useStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useStateTx(false);
  const [exportOpen, setExportOpen] = useStateTx(false);
  const [q, setQ] = useStateTx("");
  const [type, setType] = useStateTx("all");
  const [cat, setCat] = useStateTx("all");
  const [period, setPeriod] = useStateTx("all");

  const filtered = useMemoTx(() => {
    return transactions.filter(t => {
      if (type !== "all" && t.type !== type) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (q && !(t.note.toLowerCase().includes(q.toLowerCase()) || catById(t.category).name.toLowerCase().includes(q.toLowerCase()))) return false;
      if (period === "thism" && !window.sameMonth(t.date)) return false;
      if (period === "lastm") { const r = new Date(window.TODAY.getFullYear(), window.TODAY.getMonth() - 1, 1); if (!window.sameMonth(t.date, r)) return false; }
      return true;
    });
  }, [transactions, type, cat, q, period]);

  const totals = useMemoTx(() => filtered.reduce((a, t) => { if (t.type === "income") a.in += t.amount; else a.out += t.amount; return a; }, { in: 0, out: 0 }), [filtered]);
  const hasFilters = q || type !== "all" || cat !== "all" || period !== "all";
  const groups = useMemoTx(() => {
    const m = new Map();
    filtered.forEach(t => { const k = fmtDate(t.date, "rel"); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
    return [...m.entries()];
  }, [filtered]);
  function exportCSV() {
    const cur = window.__cur || "USD";
    const rows = [["Date", "Type", "Category", "Note", "Amount", "Currency"]];
    filtered.forEach(t => {
      const d = (t.date instanceof Date ? t.date : new Date(t.date)).toISOString().slice(0, 10);
      const amt = (t.type === "income" ? "" : "-") + t.amount.toFixed(2);
      const esc = (s) => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
      rows.push([d, t.type, catById(t.category).name, t.note, amt, cur].map(esc));
    });
    const csv = rows.map(r => r.join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `smartfinance-transactions-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false);
    toast(`Exported ${filtered.length} transactions to CSV`);
  }

  function exportPDF() {
    const cur = window.__cur || "USD";
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#10b981";
    const body = filtered.map(t => {
      const d = (t.date instanceof Date ? t.date : new Date(t.date)).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const c = catById(t.category);
      const sign = t.type === "income" ? "+" : "−";
      const color = t.type === "income" ? "#059669" : "#e11d48";
      return `<tr><td>${d}</td><td><span class="dot" style="background:${c.color}"></span>${c.name}</td><td>${t.note.replace(/</g,"&lt;")}</td><td style="text-align:right;color:${color};font-weight:700">${sign}${window.fmtMoney(t.amount, cur)}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SmartFinance — Transactions</title>
    <style>
      *{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;box-sizing:border-box}
      body{margin:40px;color:#0e1320}
      .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:24px}
      .brand{font-size:22px;font-weight:800;letter-spacing:-.02em}.brand span{color:${accent}}
      .sub{color:#828c9d;font-size:12px;margin-top:4px}
      .totals{display:flex;gap:28px;margin-bottom:24px}
      .totals .t{font-size:12px;color:#828c9d}.totals .v{font-size:18px;font-weight:800;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:12.5px}
      th{text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:.06em;color:#828c9d;padding:8px 10px;border-bottom:1px solid #e2e7ee}
      th:last-child{text-align:right}
      td{padding:9px 10px;border-bottom:1px solid #eef1f6}
      .dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:7px;vertical-align:middle}
      .foot{margin-top:24px;color:#aab2c0;font-size:11px;text-align:center}
      @media print{body{margin:18px}}
    </style></head><body>
      <div class="head">
        <div><div class="brand">Smart<span>Finance</span></div><div class="sub">Transaction statement · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div></div>
        <div class="sub">${filtered.length} transactions</div>
      </div>
      <div class="totals">
        <div><div class="t">Income</div><div class="v" style="color:#059669">${window.fmtMoney(totals.in, cur)}</div></div>
        <div><div class="t">Expenses</div><div class="v" style="color:#e11d48">${window.fmtMoney(totals.out, cur)}</div></div>
        <div><div class="t">Net</div><div class="v">${window.fmtMoney(totals.in - totals.out, cur)}</div></div>
      </div>
      <table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table>
      <div class="foot">Generated by SmartFinance Manager · ${new Date().toLocaleString()}</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to export PDF", "neg"); setExportOpen(false); return; }
    w.document.write(html); w.document.close();
    setExportOpen(false);
    toast("Opening print dialog — choose “Save as PDF”", "info");
  }

  return (
    <div>
      <PageHead>
        <div style={{ position: "relative" }}>
          <button className="btn btn-outline" onClick={() => setExportOpen(o => !o)}>
            <Icon name="download" size={17} /> <span className="hide-mobile">Export</span> <Icon name="chevronDown" size={14} />
          </button>
          {exportOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setExportOpen(false)} />
              <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, width: 230, padding: 6, boxShadow: "var(--shadow-lg)" }}>
                <div className="t-xs muted" style={{ padding: "6px 10px 4px" }}>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""} · current filter</div>
                <button className="menu-item" onClick={exportCSV}>
                  <span className="cat-ic sm" style={{ background: "var(--pos-soft)", color: "var(--pos)" }}><Icon name="grid" size={15} /></span>
                  <div><div className="fw7 t-sm">Export as CSV</div><div className="t-xs muted">Spreadsheet file</div></div>
                </button>
                <button className="menu-item" onClick={exportPDF}>
                  <span className="cat-ic sm" style={{ background: "var(--neg-soft)", color: "var(--neg)" }}><Icon name="receipt" size={15} /></span>
                  <div><div className="fw7 t-sm">Export as PDF</div><div className="t-xs muted">Printable statement</div></div>
                </button>
              </div>
            </>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} /> <span className="hide-mobile">Add transaction</span></button>
      </PageHead>

      {}
      <div className="cols-3 mb16" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="arrowDownRight" size={15} style={{ color: "var(--pos)" }} />Income</div><div className="value pos tnum" style={{ fontSize: 22 }}>{fmtMoney(totals.in, window.__cur)}</div></div></div>
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="arrowUpRight" size={15} style={{ color: "var(--neg)" }} />Expenses</div><div className="value neg tnum" style={{ fontSize: 22 }}>{fmtMoney(totals.out, window.__cur)}</div></div></div>
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="wallet" size={15} />Net</div><div className="value tnum" style={{ fontSize: 22, color: totals.in - totals.out >= 0 ? "var(--pos)" : "var(--neg)" }}>{fmtMoney(totals.in - totals.out, window.__cur)}</div></div></div>
      </div>

      {}
      <div className="card pad mb16">
        <div className="row wrap gap12" style={{ alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 180 }}><SearchInput value={q} onChange={setQ} placeholder="Search note or category…" /></div>
          <Segmented value={type} accent onChange={setType} options={[{ value: "all", label: "All" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          <div style={{ minWidth: 150 }}>
            <Select value={cat} onChange={e => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div style={{ minWidth: 140 }}>
            <Select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="thism">This month</option>
              <option value="lastm">Last month</option>
            </Select>
          </div>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setType("all"); setCat("all"); setPeriod("all"); }}><Icon name="x" size={15} /> Clear</button>}
        </div>
      </div>

      {}
      <div className="card" style={{ padding: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="search" title={hasFilters ? "No matching transactions" : "No transactions yet"}
            body={hasFilters ? "Try adjusting or clearing your filters to see more." : "Add your first transaction to start tracking your money."}
            action={hasFilters ? <button className="btn btn-outline" onClick={() => { setQ(""); setType("all"); setCat("all"); setPeriod("all"); }}>Clear filters</button> : <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={17} /> Add transaction</button>} />
        ) : groups.map(([day, items]) => (
          <div key={day} style={{ marginBottom: 6 }}>
            <div className="between" style={{ padding: "12px 12px 6px" }}>
              <span className="t-xs fw7" style={{ color: "var(--text-3)", letterSpacing: ".04em", textTransform: "uppercase" }}>{day}</span>
              <span className="t-xs muted tnum">{items.length} item{items.length > 1 ? "s" : ""}</span>
            </div>
            {items.map(t => {
              const c = catById(t.category);
              return (
                <div className="tx-row" key={t.id}>
                  <CatIcon cat={c} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw7" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note}</div>
                    <div className="t-xs muted">{c.name} · {fmtDate(t.date)}</div>
                  </div>
                  <Money amount={t.amount} type={t.type} strong />
                  <button className="icon-btn plain del-btn" title="Delete" onClick={() => { actions.deleteTransaction(t.id); toast("Transaction deleted", "neg"); }} style={{ width: 32, height: 32 }}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

window.AddTransactionModal = AddTransactionModal;
window.TransactionsPage = TransactionsPage;
