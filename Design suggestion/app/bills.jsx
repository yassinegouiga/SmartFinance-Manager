
const { useState: useStateBl, useMemo: useMemoBl } = React;

const FREQS = ["Monthly", "Quarterly", "Weekly", "Yearly"];

function AddBillModal({ onClose }) {
  const { categories, actions } = useStore();
  const toast = useToast();
  const [name, setName] = useStateBl("");
  const [amount, setAmount] = useStateBl("");
  const [category, setCategory] = useStateBl("");
  const [dueDay, setDueDay] = useStateBl("1");
  const [frequency, setFrequency] = useStateBl("Monthly");
  const [err, setErr] = useStateBl({});
  const cats = categories.filter(c => c.kind !== "income");
  function save() {
    const e = {};
    if (!name.trim()) e.name = "Name the bill";
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) e.amount = "Enter the amount";
    if (!category) e.category = "Pick a category";
    setErr(e); if (Object.keys(e).length) return;
    actions.addBill({ name: name.trim(), amount: amt, category, dueDay: parseInt(dueDay), frequency });
    toast(`Bill “${name.trim()}” added`); onClose();
  }
  return (
    <Modal title="Add bill" sub="Track a recurring payment" onClose={onClose} icon="receipt"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><Icon name="check" size={17} /> Add bill</button></>}>
      <Field label="Bill name" error={err.name}><TextInput placeholder="e.g. Electricity" value={name} error={err.name} onChange={e => { setName(e.target.value); setErr({ ...err, name: "" }); }} autoFocus /></Field>
      <div className="cols-2 keep2" style={{ gap: 14 }}>
        <Field label="Amount" error={err.amount}><TextInput affix={window.CURRENCIES[window.__cur||"USD"].symbol} type="number" placeholder="0.00" value={amount} error={err.amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Category" error={err.category}>
          <Select value={category} error={err.category} onChange={e => setCategory(e.target.value)}>
            <option value="" disabled>Select…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="cols-2 keep2" style={{ gap: 14 }}>
        <Field label="Due day of month"><Select value={dueDay} onChange={e => setDueDay(e.target.value)}>{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}</Select></Field>
        <Field label="Frequency"><Select value={frequency} onChange={e => setFrequency(e.target.value)}>{FREQS.map(f => <option key={f} value={f}>{f}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}

function BillsPage() {
  const { bills, actions } = useStore();
  const toast = useToast();
  const [add, setAdd] = useStateBl(false);
  const [del, setDel] = useStateBl(null);
  const [filter, setFilter] = useStateBl("all");
  const cur = window.__cur;

  const sorted = useMemoBl(() => [...bills].sort((a, b) => (a.paid - b.paid) || (a.dueDay - b.dueDay)), [bills]);
  const shown = sorted.filter(b => filter === "all" || (filter === "unpaid" ? !b.paid : b.paid));
  const dueTotal = bills.filter(b => !b.paid).reduce((a, b) => a + b.amount, 0);
  const paidTotal = bills.filter(b => b.paid).reduce((a, b) => a + b.amount, 0);
  const dueDate = (day) => new Date(window.TODAY.getFullYear(), window.TODAY.getMonth(), day);
  const daysUntil = (day) => Math.round((dueDate(day) - window.TODAY) / 86400000);

  return (
    <div>
      <PageHead><button className="btn btn-primary" onClick={() => setAdd(true)}><Icon name="plus" size={18} /> <span className="hide-mobile">Add bill</span></button></PageHead>

      <div className="cols-2 keep2 mb16">
        <div className="card pad"><div className="label t-sm muted center gap8"><Icon name="clock" size={16} style={{ color: "var(--warn)" }} /> Still due this month</div><div className="fw8 tnum mt8" style={{ fontSize: 24, color: "var(--warn)" }}>{fmtMoney(dueTotal, cur)}</div></div>
        <div className="card pad"><div className="label t-sm muted center gap8"><Icon name="checkCircle" size={16} style={{ color: "var(--pos)" }} /> Paid this month</div><div className="fw8 tnum mt8" style={{ fontSize: 24, color: "var(--pos)" }}>{fmtMoney(paidTotal, cur)}</div></div>
      </div>

      <div className="between mb16">
        <Segmented value={filter} accent onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unpaid", label: "Unpaid" }, { value: "paid", label: "Paid" }]} />
        <span className="t-sm muted hide-mobile">{shown.length} bill{shown.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card" style={{ padding: 8 }}>
        {shown.length === 0 ? (
          <EmptyState icon="receipt" title={filter === "paid" ? "No paid bills yet" : filter === "unpaid" ? "Nothing due — you're all caught up!" : "No bills yet"} body={filter === "all" ? "Add your recurring payments so you never miss a due date." : undefined} action={filter === "all" ? <button className="btn btn-primary" onClick={() => setAdd(true)}><Icon name="plus" size={17} /> Add bill</button> : undefined} />
        ) : shown.map(b => {
          const c = catById(b.category);
          const du = daysUntil(b.dueDay);
          const soon = !b.paid && du <= 3;
          return (
            <div className="tx-row" key={b.id} style={{ padding: "12px 10px" }}>
              <CatIcon cat={c} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={"fw7" + (b.paid ? " dim" : "")}>{b.name}</div>
                <div className="t-xs muted center gap8" style={{ flexWrap: "wrap" }}>
                  <span>{c.name}</span>·<span className="center" style={{ gap: 3 }}><Icon name="repeat" size={12} />{b.frequency}</span>·
                  <span className="center" style={{ gap: 3 }}><Icon name="calendar" size={12} />Due {dueDate(b.dueDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
              {!b.paid && soon && <span className="badge badge-warn nowrap hide-mobile">{du <= 0 ? "Due today" : `In ${du}d`}</span>}
              <span className={"fw7 tnum" + (b.paid ? " dim" : "")}>{fmtMoney(b.amount, cur)}</span>
              {b.paid ? (
                <button className="btn btn-ghost btn-sm nowrap" onClick={() => actions.toggleBillPaid(b.id)}><Icon name="checkCircle" size={15} style={{ color: "var(--pos)" }} /> <span className="hide-mobile">Paid</span></button>
              ) : (
                <button className="btn btn-outline btn-sm nowrap" onClick={() => { actions.toggleBillPaid(b.id); toast(`${b.name} marked as paid`); }}><Icon name="check" size={15} /> <span className="hide-mobile">Mark paid</span></button>
              )}
              <button className="icon-btn plain del-btn" style={{ width: 30, height: 30 }} onClick={() => setDel(b)} title="Delete"><Icon name="trash" size={15} /></button>
            </div>
          );
        })}
      </div>

      {add && <AddBillModal onClose={() => setAdd(false)} />}
      {del && <ConfirmDialog title="Delete bill?" danger confirmLabel="Delete" body={`“${del.name}” will no longer be tracked.`} onConfirm={() => { actions.deleteBill(del.id); toast("Bill deleted", "neg"); }} onClose={() => setDel(null)} />}
    </div>
  );
}

window.BillsPage = BillsPage;
