import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons/Icon';
import { Modal, Field, TextInput, Segmented, Progress, EmptyState, Spinner, ConfirmDialog, CatIcon, IconPicker, PageHead, useToast } from '../components/UI';
import { fmtMoney, currencySymbol } from '../utils/format';

const POT_COLORS = ['#10b981', '#60a5fa', '#fbbf24', '#fb7185', '#a78bfa', '#f97316', '#06b6d4', '#34d399'];
const POT_ICONS  = ['target', 'plane', 'card', 'gift', 'shield', 'book', 'heart', 'car', 'coffee', 'bag'];

const NAME_ICON_MAP = {
  vacation: 'plane', travel: 'plane', holiday: 'plane', trip: 'plane',
  car: 'car', vehicle: 'car',
  gift: 'gift', present: 'gift',
  health: 'heart', medical: 'heart',
  book: 'book', education: 'book', school: 'book', course: 'book',
  emergency: 'shield', fund: 'shield',
  coffee: 'coffee',
  bag: 'bag', shopping: 'bag',
  card: 'card', payment: 'card',
};

function getPotStyle(name = '', index = 0) {
  const lower = name.toLowerCase();
  const matchedKey = Object.keys(NAME_ICON_MAP).find(k => lower.includes(k));
  return {
    color: POT_COLORS[index % POT_COLORS.length],
    icon:  matchedKey ? NAME_ICON_MAP[matchedKey] : POT_ICONS[index % POT_ICONS.length],
  };
}

export default function SavingPots() {
  const { currency = 'USD' } = useAuth();
  const toast = useToast();
  const [pots, setPots]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [fundModal, setFundModal]   = useState(null); // { pot, mode }
  const [delTarget, setDelTarget]   = useState(null);

  useEffect(() => {
    api.get('/api/v1/saving-pots/')
      .then(r => setPots(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Prefer the pot's own stored icon/color; fall back to name-based inference.
  const rows = useMemo(() => pots.map((p, i) => {
    const style = getPotStyle(p.name, i);
    return { ...p, icon: p.icon || style.icon, color: p.color || style.color };
  }), [pots]);

  const totalSaved  = rows.reduce((a, p) => a + (p.current_amount || 0), 0);
  const totalTarget = rows.reduce((a, p) => a + (p.target_amount || 0), 0);

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/api/v1/saving-pots/${delTarget.id}`);
      setPots(prev => prev.filter(p => p.id !== delTarget.id));
      toast && toast('Pot deleted', 'neg');
    } catch { /* silent */ }
    finally { setDelTarget(null); }
  };

  const handleFundDone = (updatedPot) => {
    setPots(prev => prev.map(p => p.id === updatedPot.id ? { ...p, current_amount: updatedPot.current_amount } : p));
    setFundModal(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> <span className="hide-mobile">New pot</span>
        </button>
      </PageHead>

      {/* Overview banner */}
      {rows.length > 0 && (
        <div className="card pad mb16" style={{ background: 'linear-gradient(135deg, var(--accent-soft), transparent)' }}>
          <div className="row wrap between" style={{ alignItems: 'center', gap: 20 }}>
            <div className="center gap16">
              <div className="cat-ic lg" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                <Icon name="target" size={26} />
              </div>
              <div>
                <div className="t-sm muted">Total saved across {rows.length} pot{rows.length !== 1 ? 's' : ''}</div>
                <div className="fw8 tnum" style={{ fontSize: 28 }}>{fmtMoney(totalSaved, currency)}</div>
              </div>
            </div>
            {totalTarget > 0 && (
              <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
                <Progress value={totalSaved} max={totalTarget} thick />
                <div className="between t-xs muted mt8">
                  <span>{Math.round((totalSaved / totalTarget) * 100)}% of all goals</span>
                  <span>{fmtMoney(totalTarget, currency)} target</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pot grid */}
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="target"
            title="No saving pots yet"
            body="Create a pot for each goal — a holiday, an emergency fund, a new gadget — and watch it grow."
            action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={17} /> New pot</button>}
          />
        </div>
      ) : (
        <div className="pot-grid">
          {rows.map(p => {
            const pct  = p.target_amount > 0 ? Math.min(100, Math.round((p.current_amount / p.target_amount) * 100)) : 0;
            const done = p.current_amount >= p.target_amount && p.target_amount > 0;
            return (
              <div className="card pad pot-card" key={p.id}>
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <CatIcon cat={p} size="lg" />
                  <div className="center gap8 card-acts">
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setDelTarget(p)} title="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="between mt12" style={{ alignItems: 'flex-start' }}>
                  <div className="fw8" style={{ fontSize: 16 }}>{p.name}</div>
                  {done && <span className="badge badge-pos"><Icon name="check" size={13} /> Reached</span>}
                </div>

                {p.deadline && (
                  <div className="t-xs muted" style={{ marginTop: 3 }}>
                    Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}

                <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                  <span className="fw8 tnum" style={{ fontSize: 24, color: done ? 'var(--pos)' : 'var(--text)' }}>
                    {fmtMoney(p.current_amount, currency)}
                  </span>
                  <span className="muted tnum t-sm">/ {fmtMoney(p.target_amount, currency)}</span>
                </div>

                <div className="mt12">
                  <Progress value={p.current_amount} max={p.target_amount} color={p.color} thick />
                </div>

                <div className="between mt8 mb16">
                  <span className="t-xs fw7" style={{ color: p.color }}>{pct}% funded</span>
                  <span className="t-xs muted">{done ? 'Goal complete!' : `${fmtMoney(p.target_amount - p.current_amount, currency)} to go`}</span>
                </div>

                <div className="row gap8">
                  <button className="btn btn-primary btn-sm flex1" style={{ justifyContent: 'center' }} onClick={() => setFundModal({ pot: p, mode: 'deposit' })}>
                    <Icon name="download" size={15} /> Add
                  </button>
                  <button
                    className="btn btn-outline btn-sm flex1" style={{ justifyContent: 'center' }}
                    onClick={() => setFundModal({ pot: p, mode: 'withdraw' })}
                    disabled={!p.current_amount || p.current_amount <= 0}
                  >
                    <Icon name="upload" size={15} /> Withdraw
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add-new tile */}
          <button className="add-tile" onClick={() => setCreateOpen(true)}>
            <div className="cat-ic lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
              <Icon name="plus" size={24} />
            </div>
            <span className="fw7" style={{ marginTop: 12 }}>New saving pot</span>
          </button>
        </div>
      )}

      {createOpen && (
        <CreatePotModal
          currency={currency}
          onAdded={p => { setPots(prev => [p, ...prev]); setCreateOpen(false); toast && toast('Pot created', 'pos'); }}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {fundModal && (
        <FundModal
          pot={fundModal.pot}
          initialMode={fundModal.mode}
          currency={currency}
          onDone={handleFundDone}
          onClose={() => setFundModal(null)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete saving pot?"
          body={`"${delTarget.name}" and its ${fmtMoney(delTarget.current_amount, currency)} balance record will be permanently removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

function CreatePotModal({ currency, onAdded, onClose }) {
  const [form, setForm]       = useState({ name: '', target_amount: '', deadline: '', icon: '', color: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Empty = auto-infer from the name; explicit picks override.
  const fallback = getPotStyle(form.name, 0);
  const effectiveIcon  = form.icon  || fallback.icon;
  const effectiveColor = form.color || fallback.color;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name your goal';
    if (!form.target_amount || Number(form.target_amount) <= 0) errs.target_amount = 'Set a target amount greater than 0';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        target_amount: parseFloat(form.target_amount),
        icon: effectiveIcon,
        color: effectiveColor,
      };
      if (form.deadline) payload.deadline = new Date(form.deadline).toISOString();
      const { data } = await api.post('/api/v1/saving-pots/', payload);
      onAdded(data);
    } catch (err) {
      setErrors({ target_amount: err.response?.data?.detail || 'Failed to create pot.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="New saving pot"
      sub="Set a goal and start saving"
      onClose={onClose}
      icon={effectiveIcon}
      iconColor={effectiveColor}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />} Create pot
          </button>
        </>
      }
    >
      <Field label="Goal name" error={errors.name}>
        <TextInput icon="target" placeholder="e.g. Vacation Fund" value={form.name} error={errors.name} onChange={e => set('name', e.target.value)} autoFocus />
      </Field>

      <Field label="Target amount" error={errors.target_amount}>
        <TextInput
          affix={currencySymbol(currency)} type="number" inputMode="decimal" step="0.01" placeholder="1000.00"
          value={form.target_amount} error={errors.target_amount} onChange={e => set('target_amount', e.target.value)}
        />
      </Field>

      <Field label="Deadline" hint="Optional">
        <TextInput type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
      </Field>

      <Field label="Icon">
        <IconPicker value={effectiveIcon} onChange={v => set('icon', v)} />
      </Field>

      <Field label="Colour">
        <div className="row wrap" style={{ gap: 9 }}>
          {POT_COLORS.map(c => (
            <button
              key={c} type="button" onClick={() => set('color', c)}
              style={{
                width: 30, height: 30, borderRadius: 9, background: c, cursor: 'pointer',
                border: effectiveColor === c ? '2.5px solid var(--text)' : '2.5px solid transparent',
                boxShadow: effectiveColor === c ? '0 0 0 2px var(--bg)' : 'none', transition: '.12s',
              }}
            />
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function FundModal({ pot, initialMode, currency, onDone, onClose }) {
  const toast = useToast();
  const [mode, setMode]       = useState(initialMode || 'deposit');
  const [amount, setAmount]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const isDeposit = mode === 'deposit';
  const after = isDeposit
    ? (pot.current_amount || 0) + (parseFloat(amount) || 0)
    : Math.max(0, (pot.current_amount || 0) - (parseFloat(amount) || 0));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!isDeposit && amt > pot.current_amount) {
      setError(`You only have ${fmtMoney(pot.current_amount, currency)} in this pot`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/api/v1/saving-pots/${pot.id}/${mode}`, { amount: amt });
      const updated = {
        ...pot,
        current_amount: data.current_amount ?? (isDeposit ? pot.current_amount + amt : pot.current_amount - amt),
      };
      onDone(updated);
      toast && toast(
        isDeposit ? `${fmtMoney(amt, currency)} added to ${pot.name}` : `${fmtMoney(amt, currency)} withdrawn`,
        isDeposit ? 'pos' : 'warn',
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={pot.name}
      sub={`Balance ${fmtMoney(pot.current_amount, currency)} of ${fmtMoney(pot.target_amount, currency)}`}
      onClose={onClose}
      icon={pot.icon || 'target'}
      iconColor={pot.color}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={'btn ' + (isDeposit ? 'btn-primary' : 'btn-outline')} onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name={isDeposit ? 'download' : 'upload'} size={17} />}
            {isDeposit ? 'Add money' : 'Withdraw'}
          </button>
        </>
      }
    >
      <Segmented
        value={mode} accent
        onChange={v => { setMode(v); setError(''); setAmount(''); }}
        options={[{ value: 'deposit', label: 'Deposit' }, { value: 'withdraw', label: 'Withdraw' }]}
      />

      <Field label="Amount" error={error}>
        <TextInput
          affix={currencySymbol(currency)} type="number" inputMode="decimal" step="0.01" placeholder="0.00"
          value={amount} error={error} onChange={e => { setAmount(e.target.value); setError(''); }} autoFocus
        />
      </Field>

      <div className="row wrap" style={{ gap: 8 }}>
        {[25, 50, 100, 250].map(v => (
          <button key={v} className="chip" onClick={() => setAmount(String(v))}>{fmtMoney(v, currency)}</button>
        ))}
      </div>

      <div className="between" style={{ padding: 13, background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
        <span className="t-sm muted">Balance after</span>
        <span className="fw8 tnum">{fmtMoney(after, currency)}</span>
      </div>
    </Modal>
  );
}
