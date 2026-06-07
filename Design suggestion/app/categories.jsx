
const { useState: useStateCat, useMemo: useMemoCat } = React;

function AddCategoryModal({ onClose }) {
  const { actions } = useStore();
  const toast = useToast();
  const [name, setName] = useStateCat("");
  const [icon, setIcon] = useStateCat("bag");
  const [color, setColor] = useStateCat(PALETTE[0]);
  const [kind, setKind] = useStateCat("expense");
  const [err, setErr] = useStateCat("");

  function save() {
    if (!name.trim()) { setErr("Give your category a name"); return; }
    actions.addCategory({ name: name.trim(), icon, color, kind });
    toast(`Category “${name.trim()}” created`);
    onClose();
  }
  return (
    <Modal title="New category" sub="Create a custom spending category" onClose={onClose} icon={icon} iconColor={color}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><Icon name="check" size={17} /> Create category</button></>}>
      {}
      <div className="center gap12" style={{ padding: 14, background: "var(--surface-2)", borderRadius: "var(--r)" }}>
        <CatIcon cat={{ icon, color }} size="lg" />
        <div><div className="fw8" style={{ fontSize: 16 }}>{name || "Category name"}</div><div className="t-xs muted" style={{ textTransform: "capitalize" }}>{kind}</div></div>
      </div>
      <Field label="Name" error={err}><TextInput placeholder="e.g. Subscriptions" value={name} error={err} onChange={e => { setName(e.target.value); setErr(""); }} autoFocus /></Field>
      <Field label="Type"><Segmented value={kind} accent onChange={setKind} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "both", label: "Both" }]} /></Field>
      <Field label="Icon">
        <div className="row wrap" style={{ gap: 8 }}>
          {ICON_CHOICES.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)} className="icon-btn" style={{ width: 42, height: 42, borderColor: icon === ic ? color : "var(--border)", background: icon === ic ? color + "22" : "var(--surface)", color: icon === ic ? color : "var(--text-2)" }}>
              <Icon name={ic} size={19} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Colour">
        <div className="row wrap" style={{ gap: 9 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 9, background: c, border: color === c ? "2.5px solid var(--text)" : "2.5px solid transparent", cursor: "pointer", boxShadow: color === c ? "0 0 0 2px var(--bg)" : "none" }} />
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function CategoriesPage() {
  const { categories, transactions, actions } = useStore();
  const toast = useToast();
  const [showAdd, setShowAdd] = useStateCat(false);
  const [del, setDel] = useStateCat(null);
  const spent = useMemoCat(() => spentByCategory(transactions), [transactions]);
  const counts = useMemoCat(() => {
    const m = {}; transactions.forEach(t => { if (window.sameMonth(t.date)) m[t.category] = (m[t.category] || 0) + 1; }); return m;
  }, [transactions]);
  const DEFAULT_IDS = new Set(window.CATEGORIES.map(c => c.id));
  const cur = window.__cur;

  return (
    <div>
      <PageHead><button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={18} /> <span className="hide-mobile">Add category</span></button></PageHead>

      <div className="cat-grid">
        {categories.map(c => {
          const custom = !DEFAULT_IDS.has(c.id);
          return (
            <div className="card pad cat-card" key={c.id} style={{ position: "relative" }}>
              <div className="between" style={{ alignItems: "flex-start" }}>
                <CatIcon cat={c} size="lg" />
                <span className={"badge " + (c.kind === "income" ? "badge-pos" : c.kind === "both" ? "badge-info" : "badge-muted")} style={{ textTransform: "capitalize" }}>{c.kind}</span>
              </div>
              <div className="fw8 mt12" style={{ fontSize: 16 }}>{c.name}</div>
              <div className="t-xs muted mt4">{counts[c.id] || 0} txns this month</div>
              <div className="between mt12" style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
                <span className="t-xs muted">Spent</span>
                <span className="fw7 tnum t-sm">{fmtMoney(spent[c.id] || 0, cur)}</span>
              </div>
              {custom && (
                <button className="icon-btn plain del-cat" onClick={() => setDel(c)} title="Delete" style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30 }}>
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          );
        })}
        {}
        <button className="card add-tile" onClick={() => setShowAdd(true)}>
          <div className="cat-ic lg" style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}><Icon name="plus" size={24} /></div>
          <span className="fw7 mt12">Add category</span>
          <span className="t-xs muted">Create a custom one</span>
        </button>
      </div>

      {showAdd && <AddCategoryModal onClose={() => setShowAdd(false)} />}
      {del && <ConfirmDialog title="Delete category?" danger confirmLabel="Delete" body={`“${del.name}” will be removed. Existing transactions keep their record but the category won't be selectable.`} onConfirm={() => { actions.deleteCategory(del.id); toast("Category deleted", "neg"); }} onClose={() => setDel(null)} />}
    </div>
  );
}

window.CategoriesPage = CategoriesPage;
window.AddCategoryModal = AddCategoryModal;
