
const { useState: useStateP } = React;

const POT_ICONS = ["shield", "plane", "card", "gift", "target", "piggy", "book", "heart", "car", "bag", "coffee", "dumbbell"];

function AddPotModal({ onClose }) {
  const { actions } = useStore();
  const toast = useToast();
  const [name, setName] = useStateP("");
  const [target, setTarget] = useStateP("");
  const [current, setCurrent] = useStateP("");
  const [icon, setIcon] = useStateP("target");
  const [color, setColor] = useStateP(PALETTE[1]);
  const [err, setErr] = useStateP({});
  function save() {
    const e = {};
    if (!name.trim()) e.name = "Name your goal";
    const t = parseFloat(target);
    if (!t || t <= 0) e.target = "Set a target amount";
    setErr(e); if (Object.keys(e).length) return;
    actions.addPot({ name: name.trim(), target: t, current: parseFloat(current) || 0, icon, color });
    toast(`Saving pot “${name.trim()}” created`); onClose();
  }
  return (
    <Modal title="New saving pot" sub="Set a goal and start saving" onClose={onClose} icon={icon} iconColor={color}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><Icon name="check" size={17} /> Create pot</button></>}>
      <Field label="Goal name" error={err.name}><TextInput placeholder="e.g. New car fund" value={name} error={err.name} onChange={e => { setName(e.target.value); setErr({ ...err, name: "" }); }} autoFocus /></Field>
      <div className="cols-2 keep2" style={{ gap: 14 }}>
        <Field label="Target amount" error={err.target}><TextInput affix={window.CURRENCIES[window.__cur||"USD"].symbol} type="number" placeholder="0.00" value={target} error={err.target} onChange={e => setTarget(e.target.value)} /></Field>
        <Field label="Starting balance" hint="Optional"><TextInput affix={window.CURRENCIES[window.__cur||"USD"].symbol} type="number" placeholder="0.00" value={current} onChange={e => setCurrent(e.target.value)} /></Field>
      </div>
      <Field label="Icon">
        <div className="row wrap" style={{ gap: 8 }}>
          {POT_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)} className="icon-btn" style={{ width: 42, height: 42, borderColor: icon === ic ? color : "var(--border)", background: icon === ic ? color + "22" : "var(--surface)", color: icon === ic ? color : "var(--text-2)" }}><Icon name={ic} size={19} /></button>
          ))}
        </div>
      </Field>
      <Field label="Colour">
        <div className="row wrap" style={{ gap: 9 }}>
          {PALETTE.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 9, background: c, border: color === c ? "2.5px solid var(--text)" : "2.5px solid transparent", cursor: "pointer" }} />)}
        </div>
      </Field>
    </Modal>
  );
}

function DepositModal({ pot, onClose }) {
  const { actions } = useStore();
  const toast = useToast();
  const [mode, setMode] = useStateP("deposit");
  const [amount, setAmount] = useStateP("");
  const [err, setErr] = useStateP("");
  const cur = window.__cur;
  function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr("Enter an amount"); return; }
    if (mode === "withdraw" && amt > pot.current) { setErr(`You only have ${fmtMoney(pot.current, cur)} in this pot`); return; }
    if (mode === "deposit") { actions.depositPot(pot.id, amt); toast(`${fmtMoney(amt, cur)} added to ${pot.name}`); }
    else { actions.withdrawPot(pot.id, amt); toast(`${fmtMoney(amt, cur)} withdrawn`, "warn"); }
    onClose();
  }
  const after = mode === "deposit" ? pot.current + (parseFloat(amount) || 0) : Math.max(0, pot.current - (parseFloat(amount) || 0));
  return (
    <Modal title={pot.name} sub={`Balance ${fmtMoney(pot.current, cur)} of ${fmtMoney(pot.target, cur)}`} onClose={onClose} icon={pot.icon} iconColor={pot.color}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className={"btn " + (mode === "deposit" ? "btn-primary" : "btn-outline")} onClick={save}><Icon name={mode === "deposit" ? "download" : "upload"} size={17} /> {mode === "deposit" ? "Add money" : "Withdraw"}</button></>}>
      <Segmented value={mode} accent onChange={(v) => { setMode(v); setErr(""); }} options={[{ value: "deposit", label: "Deposit" }, { value: "withdraw", label: "Withdraw" }]} />
      <Field label="Amount" error={err}><TextInput affix={window.CURRENCIES[cur||"USD"].symbol} type="number" inputMode="decimal" placeholder="0.00" value={amount} error={err} onChange={e => { setAmount(e.target.value); setErr(""); }} autoFocus /></Field>
      <div className="row wrap" style={{ gap: 8 }}>
        {[25, 50, 100, 250].map(v => <button key={v} className="chip" onClick={() => setAmount(String(v))}>{fmtMoney(v, cur)}</button>)}
      </div>
      <div className="between" style={{ padding: 13, background: "var(--surface-2)", borderRadius: "var(--r)" }}>
        <span className="t-sm muted">Balance after</span>
        <span className="fw8 tnum">{fmtMoney(after, cur)}</span>
      </div>
    </Modal>
  );
}

function PotsPage() {
  const { pots, actions } = useStore();
  const toast = useToast();
  const [add, setAdd] = useStateP(false);
  const [tx, setTx] = useStateP(null);
  const [del, setDel] = useStateP(null);
  const cur = window.__cur;
  const totalSaved = pots.reduce((a, p) => a + p.current, 0);
  const totalTarget = pots.reduce((a, p) => a + p.target, 0);

  return (
    <div>
      <PageHead><button className="btn btn-primary" onClick={() => setAdd(true)}><Icon name="plus" size={18} /> <span className="hide-mobile">New pot</span></button></PageHead>

      <div className="card pad mb16" style={{ background: "linear-gradient(135deg, var(--accent-soft), transparent)" }}>
        <div className="row wrap between" style={{ alignItems: "center", gap: 20 }}>
          <div className="center gap16">
            <div className="cat-ic lg" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Icon name="piggy" size={26} /></div>
            <div><div className="t-sm muted">Total saved across {pots.length} pots</div><div className="fw8 tnum" style={{ fontSize: 28 }}>{fmtMoney(totalSaved, cur)}</div></div>
          </div>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
            <Progress value={totalSaved} max={totalTarget} thick />
            <div className="between t-xs muted mt8"><span>{Math.round((totalSaved / totalTarget) * 100)}% of all goals</span><span>{fmtMoney(totalTarget, cur)} target</span></div>
          </div>
        </div>
      </div>

      {pots.length === 0 ? (
        <div className="card"><EmptyState icon="target" title="No saving pots yet" body="Create a pot for each goal — a holiday, an emergency fund, a new gadget — and watch it grow." action={<button className="btn btn-primary" onClick={() => setAdd(true)}><Icon name="plus" size={17} /> New pot</button>} /></div>
      ) : (
        <div className="pot-grid">
          {pots.map(p => {
            const pct = Math.min(100, Math.round((p.current / p.target) * 100));
            const done = p.current >= p.target;
            return (
              <div className="card pad pot-card" key={p.id}>
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <div className="cat-ic lg" style={{ background: p.color + "22", color: p.color }}><Icon name={p.icon} size={24} /></div>
                  <div className="center gap8 card-acts">
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setDel(p)} title="Delete"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
                <div className="between mt12" style={{ alignItems: "flex-start" }}>
                  <div className="fw8" style={{ fontSize: 16 }}>{p.name}</div>
                  {done && <span className="badge badge-pos"><Icon name="trophy" size={13} /> Reached</span>}
                </div>
                <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 14 }}>
                  <span className="fw8 tnum" style={{ fontSize: 24, color: done ? "var(--pos)" : "var(--text)" }}>{fmtMoney(p.current, cur)}</span>
                  <span className="muted tnum t-sm">/ {fmtMoney(p.target, cur)}</span>
                </div>
                <div className="mt12"><Progress value={p.current} max={p.target} color={p.color} thick /></div>
                <div className="between mt8 mb16"><span className="t-xs fw7" style={{ color: p.color }}>{pct}% funded</span><span className="t-xs muted">{done ? "Goal complete 🎉" : fmtMoney(p.target - p.current, cur) + " to go"}</span></div>
                <div className="row gap8">
                  <button className="btn btn-primary btn-sm flex1" onClick={() => setTx(p)}><Icon name="download" size={15} /> Add</button>
                  <button className="btn btn-outline btn-sm flex1" onClick={() => setTx(p)}><Icon name="upload" size={15} /> Withdraw</button>
                </div>
              </div>
            );
          })}
          <button className="card add-tile" onClick={() => setAdd(true)}>
            <div className="cat-ic lg" style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}><Icon name="plus" size={24} /></div>
            <span className="fw7 mt12">New saving pot</span>
          </button>
        </div>
      )}

      {add && <AddPotModal onClose={() => setAdd(false)} />}
      {tx && <DepositModal pot={tx} onClose={() => setTx(null)} />}
      {del && <ConfirmDialog title="Delete saving pot?" danger confirmLabel="Delete" body={`“${del.name}” and its ${fmtMoney(del.current, cur)} balance record will be removed.`} onConfirm={() => { actions.deletePot(del.id); toast("Pot deleted", "neg"); }} onClose={() => setDel(null)} />}
    </div>
  );
}

window.PotsPage = PotsPage;
