
const { useState: useStateB, useMemo: useMemoB } = React;

function BudgetModal({ onClose, editing }) {
  const { categories, budgets, actions } = useStore();
  const toast = useToast();
  const [category, setCategory] = useStateB(editing?.category || "");
  const [limit, setLimit] = useStateB(editing ? String(editing.limit) : "");
  const [err, setErr] = useStateB({});
  const used = new Set(budgets.filter(b => !editing || b.id !== editing.id).map(b => b.category));
  const avail = categories.filter(c => c.kind !== "income" && !used.has(c.id));

  function save() {
    const e = {};
    if (!editing && !category) e.category = "Choose a category";
    const lim = parseFloat(limit);
    if (!lim || lim <= 0) e.limit = "Enter a monthly limit";
    setErr(e); if (Object.keys(e).length) return;
    if (editing) { actions.updateBudget(editing.id, { limit: lim }); toast("Budget updated"); }
    else { actions.addBudget({ category, limit: lim }); toast("Budget created"); }
    onClose();
  }
  const c = editing ? catById(editing.category) : (category ? catById(category) : null);
  return (
    <Modal title={editing ? "Edit budget" : "New budget"} sub={monthName() + " spending limit"} onClose={onClose} icon={c?.icon || "wallet"} iconColor={c?.color}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><Icon name="check" size={17} /> {editing ? "Save changes" : "Create budget"}</button></>}>
      {editing ? (
        <div className="center gap12" style={{ padding: 14, background: "var(--surface-2)", borderRadius: "var(--r)" }}><CatIcon cat={c} size="lg" /><div className="fw8" style={{ fontSize: 16 }}>{c.name}</div></div>
      ) : (
        <Field label="Category" error={err.category}>
          <Select value={category} error={err.category} onChange={e => setCategory(e.target.value)}>
            <option value="" disabled>Select a category…</option>
            {avail.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {avail.length === 0 && <div className="hint">All expense categories already have budgets.</div>}
        </Field>
      )}
      <Field label="Monthly limit" error={err.limit}>
        <TextInput affix={window.CURRENCIES[window.__cur||"USD"].symbol} type="number" inputMode="decimal" placeholder="0.00" value={limit} error={err.limit} onChange={e => setLimit(e.target.value)} />
      </Field>
    </Modal>
  );
}

function BudgetsPage() {
  const { budgets, transactions, actions } = useStore();
  const toast = useToast();
  const [modal, setModal] = useStateB(null);
  const [del, setDel] = useStateB(null);
  const spent = useMemoB(() => spentByCategory(transactions), [transactions]);
  const cur = window.__cur;

  const rows = budgets.map(b => ({ ...b, spent: spent[b.category] || 0 }));
  const totalLimit = rows.reduce((a, b) => a + b.limit, 0);
  const totalSpent = rows.reduce((a, b) => a + b.spent, 0);
  const overCount = rows.filter(b => b.spent > b.limit).length;

  return (
    <div>
      <PageHead><button className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={18} /> <span className="hide-mobile">Add budget</span></button></PageHead>

      {}
      <div className="card pad mb16">
        <div className="row wrap between" style={{ alignItems: "center", gap: 20 }}>
          <div>
            <div className="t-sm muted">Total budgeted · {monthName()}</div>
            <div className="row" style={{ alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span className="fw8 tnum" style={{ fontSize: 26 }}>{fmtMoney(totalSpent, cur)}</span>
              <span className="muted tnum">of {fmtMoney(totalLimit, cur)}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
            <Progress value={totalSpent} max={totalLimit} thick />
            <div className="between t-xs muted mt8">
              <span>{Math.round((totalSpent / totalLimit) * 100)}% used</span>
              <span>{fmtMoney(Math.max(0, totalLimit - totalSpent), cur)} remaining</span>
            </div>
          </div>
          {overCount > 0 && <div className="banner banner-warn" style={{ alignItems: "center" }}><Icon name="alert" size={18} /><span><b>{overCount}</b> budget{overCount > 1 ? "s" : ""} over limit</span></div>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="wallet" title="No budgets yet" body="Set monthly limits per category to keep your spending on track." action={<button className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Add budget</button>} /></div>
      ) : (
        <div className="budget-grid">
          {rows.map(b => {
            const c = catById(b.category);
            const pct = Math.round((b.spent / b.limit) * 100);
            const over = b.spent > b.limit;
            const remaining = b.limit - b.spent;
            return (
              <div className="card pad budget-card" key={b.id}>
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <span className="center gap8"><CatIcon cat={c} /><div><div className="fw7">{c.name}</div><div className="t-xs muted">{b.frequency || "Monthly"} budget</div></div></span>
                  <div className="center gap8 card-acts">
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setModal({ edit: b })} title="Edit"><Icon name="edit" size={15} /></button>
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setDel(b)} title="Delete"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 16 }}>
                  <span className="fw8 tnum" style={{ fontSize: 22, color: over ? "var(--neg)" : "var(--text)" }}>{fmtMoney(b.spent, cur)}</span>
                  <span className="muted tnum t-sm">/ {fmtMoney(b.limit, cur)}</span>
                </div>
                <div className="mt12"><Progress value={b.spent} max={b.limit} color={c.color} /></div>
                <div className="between mt8">
                  <span className={"badge " + (over ? "badge-neg" : pct > 80 ? "badge-warn" : "badge-muted")}>{pct}% used</span>
                  <span className="t-xs tnum" style={{ color: over ? "var(--neg)" : "var(--text-3)" }}>{over ? fmtMoney(Math.abs(remaining), cur) + " over" : fmtMoney(remaining, cur) + " left"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <BudgetModal editing={modal.edit} onClose={() => setModal(null)} />}
      {del && <ConfirmDialog title="Delete budget?" danger confirmLabel="Delete" body={`The ${catById(del.category).name} budget will be removed.`} onConfirm={() => { actions.deleteBudget(del.id); toast("Budget deleted", "neg"); }} onClose={() => setDel(null)} />}
    </div>
  );
}

window.BudgetsPage = BudgetsPage;
