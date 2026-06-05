import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import Icon from '../components/Icons/Icon';
import { Modal, Field, TextInput, Select, Segmented, EmptyState, Spinner, ConfirmDialog, CatIcon, PageHead, useToast } from '../components/UI';
import { fmtMoney, currencySymbol } from '../utils/format';

const FREQ_LABELS  = { MONTHLY: 'Monthly', WEEKLY: 'Weekly', YEARLY: 'Yearly', ONE_TIME: 'One-time' };
const STATUS_ORDER = { OVERDUE: 0, UNPAID: 1, PAID: 2 };
const BILL_COLORS  = ['#10b981', '#60a5fa', '#fbbf24', '#fb7185', '#a78bfa', '#f97316', '#06b6d4', '#34d399'];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function daysUntil(dueDay) {
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  return Math.round((due - today) / 86400000);
}

export default function Bills() {
  const { currency = 'USD' } = useAuth();
  const { categories, catById } = useCategories();
  const toast = useToast();
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter]         = useState('all');
  const [delTarget, setDelTarget]   = useState(null);

  const sortByStatus = (arr) => [...arr].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  useEffect(() => {
    api.get('/api/v1/bills/')
      .then(r => setBills(sortByStatus(r.data)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateBill = (updated) => setBills(prev => sortByStatus(prev.map(b => b.id === updated.id ? updated : b)));

  const handlePay = async (bill) => {
    setActionLoading(bill.id + '_pay');
    try {
      const { data } = await api.post(`/api/v1/bills/${bill.id}/pay`);
      updateBill(data);
      toast && toast(`${bill.name} marked as paid`, 'pos');
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleReset = async (bill) => {
    setActionLoading(bill.id + '_reset');
    try {
      const { data } = await api.post(`/api/v1/bills/${bill.id}/reset`);
      updateBill(data);
      toast && toast(`${bill.name} reset to unpaid`, 'warn');
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setActionLoading(delTarget.id + '_del');
    try {
      await api.delete(`/api/v1/bills/${delTarget.id}`);
      setBills(prev => prev.filter(b => b.id !== delTarget.id));
      toast && toast('Bill deleted', 'neg');
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); setDelTarget(null); }
  };

  const dueTotal  = bills.filter(b => b.status !== 'PAID').reduce((a, b) => a + (b.amount || 0), 0);
  const paidTotal = bills.filter(b => b.status === 'PAID').reduce((a, b) => a + (b.amount || 0), 0);

  const shown = useMemo(() => {
    if (filter === 'unpaid') return bills.filter(b => b.status !== 'PAID');
    if (filter === 'paid')   return bills.filter(b => b.status === 'PAID');
    return bills;
  }, [bills, filter]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> <span className="hide-mobile">Add bill</span>
        </button>
      </PageHead>

      {/* Summary cards */}
      {bills.length > 0 && (
        <div className="cols-2 keep2 mb16">
          <div className="card pad">
            <div className="t-sm muted center gap8"><Icon name="clock" size={16} style={{ color: 'var(--warn)' }} /> Still due this month</div>
            <div className="fw8 tnum mt8" style={{ fontSize: 24, color: 'var(--warn)' }}>{fmtMoney(dueTotal, currency)}</div>
          </div>
          <div className="card pad">
            <div className="t-sm muted center gap8"><Icon name="checkCircle" size={16} style={{ color: 'var(--pos)' }} /> Paid this month</div>
            <div className="fw8 tnum mt8" style={{ fontSize: 24, color: 'var(--pos)' }}>{fmtMoney(paidTotal, currency)}</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {bills.length > 0 && (
        <div className="between mb16">
          <Segmented value={filter} accent onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }]} />
          <span className="t-sm muted hide-mobile">{shown.length} bill{shown.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Bills list */}
      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="receipt"
            title={filter === 'paid' ? 'No paid bills yet' : filter === 'unpaid' ? "Nothing due — you're all caught up!" : 'No bills yet'}
            body={filter === 'all' ? 'Add your recurring payments so you never miss a due date.' : undefined}
            action={filter === 'all' ? <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={17} /> Add bill</button> : undefined}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          {shown.map((bill, i) => {
            const cat = bill.category_id ? catById(bill.category_id) : { icon: 'receipt', color: BILL_COLORS[i % BILL_COLORS.length] };
            const du = daysUntil(bill.due_day);
            const isPaid = bill.status === 'PAID';
            const isOver = bill.status === 'OVERDUE';
            const isSoon = !isPaid && !isOver && du >= 0 && du <= 3;
            const actPay = actionLoading === bill.id + '_pay';
            const actReset = actionLoading === bill.id + '_reset';

            return (
              <div className="tx-row" key={bill.id} style={{ padding: '12px 10px', opacity: isPaid ? 0.65 : 1 }}>
                <CatIcon cat={cat} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw7" style={{ textDecoration: isPaid ? 'line-through' : 'none', color: isPaid ? 'var(--text-3)' : 'var(--text)' }}>
                    {bill.name}
                  </div>
                  <div className="t-xs muted center gap8" style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    {bill.category_id && <><span>{catById(bill.category_id).name}</span><span>·</span></>}
                    <span className="center" style={{ gap: 4 }}><Icon name="repeat" size={12} />{FREQ_LABELS[bill.frequency] || bill.frequency}</span>
                    <span>·</span>
                    <span className="center" style={{ gap: 4 }}><Icon name="calendar" size={12} />Due {bill.due_day}{ordinal(bill.due_day)}</span>
                  </div>
                </div>

                {isOver && <span className="badge badge-neg nowrap">Overdue</span>}
                {isSoon && <span className="badge badge-warn nowrap hide-mobile">{du === 0 ? 'Due today' : `In ${du}d`}</span>}

                <span className="fw7 tnum nowrap" style={{ color: isPaid ? 'var(--text-3)' : 'var(--text)' }}>{fmtMoney(bill.amount, currency)}</span>

                {isPaid ? (
                  <button className="btn btn-ghost btn-sm nowrap" onClick={() => handleReset(bill)} disabled={actReset}>
                    {actReset ? <Spinner /> : <Icon name="checkCircle" size={15} style={{ color: 'var(--pos)' }} />}
                    <span className="hide-mobile">Paid</span>
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm nowrap" onClick={() => handlePay(bill)} disabled={actPay}>
                    {actPay ? <Spinner /> : <Icon name="check" size={15} />}
                    <span className="hide-mobile">Mark paid</span>
                  </button>
                )}

                <button
                  className="icon-btn plain del-btn" style={{ width: 30, height: 30, flexShrink: 0 }}
                  onClick={() => setDelTarget(bill)} title="Delete"
                  disabled={actionLoading === bill.id + '_del'}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateBillModal
          categories={categories}
          currency={currency}
          onAdded={b => { setBills(prev => sortByStatus([...prev, b])); setCreateOpen(false); toast && toast('Bill added', 'pos'); }}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete bill?"
          body={`"${delTarget.name}" will no longer be tracked.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

function CreateBillModal({ categories, currency, onAdded, onClose }) {
  const [form, setForm] = useState({
    name: '', amount: '', due_day: '1', category_id: '', is_recurring: true, frequency: 'MONTHLY',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const expenseCats = categories.filter(c => c.type === 'EXPENSE');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name the bill';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    const due = parseInt(form.due_day);
    if (isNaN(due) || due < 1 || due > 31) errs.due_day = 'Due day must be 1–31';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/bills/', {
        name:         form.name.trim(),
        amount:       parseFloat(form.amount),
        due_day:      due,
        category_id:  form.category_id || null,
        is_recurring: form.is_recurring,
        frequency:    form.frequency,
      });
      onAdded(data);
    } catch (err) {
      setErrors({ amount: err.response?.data?.detail || 'Failed to add bill.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add bill"
      sub="Track a recurring payment"
      onClose={onClose}
      icon="receipt"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />} Add bill
          </button>
        </>
      }
    >
      <Field label="Bill name" error={errors.name}>
        <TextInput icon="receipt" placeholder="e.g. Netflix" value={form.name} error={errors.name} onChange={e => set('name', e.target.value)} autoFocus />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Amount" error={errors.amount}>
          <TextInput affix={currencySymbol(currency)} type="number" inputMode="decimal" step="0.01" placeholder="15.99"
            value={form.amount} error={errors.amount} onChange={e => set('amount', e.target.value)} />
        </Field>
        <Field label="Due day (1–31)" error={errors.due_day}>
          <TextInput type="number" min="1" max="31" placeholder="1" value={form.due_day} error={errors.due_day} onChange={e => set('due_day', e.target.value)} />
        </Field>
      </div>

      <Field label="Category" hint="Optional — gives the bill its icon & colour">
        <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">No category</option>
          {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <Field label="Frequency">
        <Select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
          <option value="MONTHLY">Monthly</option>
          <option value="WEEKLY">Weekly</option>
          <option value="YEARLY">Yearly</option>
          <option value="ONE_TIME">One-time</option>
        </Select>
      </Field>

      <label className="center gap10 t-sm" style={{ color: 'var(--text-2)', cursor: 'pointer', marginTop: 4 }}>
        <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
        Recurring bill
      </label>
    </Modal>
  );
}
