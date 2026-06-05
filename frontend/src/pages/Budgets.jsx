import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import Icon from '../components/Icons/Icon';
import { Modal, Field, TextInput, Select, Progress, EmptyState, Spinner, ConfirmDialog, CatIcon, PageHead, useToast } from '../components/UI';
import { fmtMoney, currencySymbol } from '../utils/format';

export default function Budgets() {
  const { currency = 'USD' } = useAuth();
  const { categories, catById } = useCategories();
  const toast = useToast();
  const [budgets, setBudgets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | {} | { edit: budget }
  const [delTarget, setDelTarget] = useState(null);

  useEffect(() => {
    api.get('/api/v1/budgets/')
      .then(r => setBudgets(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => budgets.map(b => ({ ...b, cat: catById(b.category_id) })),
    [budgets, catById],
  );

  const totalLimit = rows.reduce((a, b) => a + (b.monthly_limit || 0), 0);
  const totalSpent = rows.reduce((a, b) => a + (b.spent_amount || 0), 0);
  const overCount  = rows.filter(b => b.spent_amount > b.monthly_limit).length;

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/api/v1/budgets/${delTarget.id}`);
      setBudgets(prev => prev.filter(b => b.id !== delTarget.id));
      toast && toast('Budget deleted', 'neg');
    } catch { /* silent */ }
    finally { setDelTarget(null); }
  };

  const handleSaved = (budget, isEdit) => {
    setBudgets(prev => isEdit ? prev.map(b => b.id === budget.id ? budget : b) : [budget, ...prev]);
    setModal(null);
    toast && toast(isEdit ? 'Budget updated' : 'Budget created', 'pos');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Icon name="plus" size={18} /> <span className="hide-mobile">Add budget</span>
        </button>
      </PageHead>

      {/* Overview bar */}
      {rows.length > 0 && (
        <div className="card pad mb16">
          <div className="row wrap between" style={{ alignItems: 'center', gap: 20 }}>
            <div>
              <div className="t-sm muted">
                Total budgeted · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span className="fw8 tnum" style={{ fontSize: 26 }}>{fmtMoney(totalSpent, currency)}</span>
                <span className="muted tnum">of {fmtMoney(totalLimit, currency)}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
              <Progress value={totalSpent} max={totalLimit} thick />
              <div className="between t-xs muted mt8">
                <span>{totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0}% used</span>
                <span>{fmtMoney(Math.max(0, totalLimit - totalSpent), currency)} remaining</span>
              </div>
            </div>
            {overCount > 0 && (
              <div className="banner banner-warn" style={{ alignItems: 'center' }}>
                <Icon name="alert" size={18} />
                <span><b>{overCount}</b> budget{overCount > 1 ? 's' : ''} over limit</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget cards */}
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="wallet"
            title="No budgets yet"
            body="Set monthly limits per category to keep your spending on track."
            action={<button className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Add budget</button>}
          />
        </div>
      ) : (
        <div className="budget-grid">
          {rows.map(b => {
            const pct = b.monthly_limit > 0 ? Math.round((b.spent_amount / b.monthly_limit) * 100) : 0;
            const over = b.spent_amount > b.monthly_limit;
            const warn = !over && pct >= 80;
            return (
              <div className="card pad budget-card" key={b.id}>
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <span className="center gap8">
                    <CatIcon cat={b.cat} />
                    <div>
                      <div className="fw7">{b.cat.name}</div>
                      <div className="t-xs muted">
                        {new Date(b.year, b.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </span>
                  <div className="center gap8 card-acts">
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setModal({ edit: b })} title="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={() => setDelTarget(b)} title="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 16 }}>
                  <span className="fw8 tnum" style={{ fontSize: 22, color: over ? 'var(--neg)' : 'var(--text)' }}>
                    {fmtMoney(b.spent_amount, currency)}
                  </span>
                  <span className="muted tnum t-sm">/ {fmtMoney(b.monthly_limit, currency)}</span>
                </div>

                <div className="mt12">
                  <Progress value={b.spent_amount} max={b.monthly_limit} color={b.cat.color} />
                </div>

                <div className="between mt8">
                  <span className={'badge ' + (over ? 'badge-neg' : warn ? 'badge-warn' : 'badge-muted')}>{pct}% used</span>
                  <span className="t-xs tnum" style={{ color: over ? 'var(--neg)' : 'var(--text-3)' }}>
                    {over ? `${fmtMoney(b.spent_amount - b.monthly_limit, currency)} over` : `${fmtMoney(b.monthly_limit - b.spent_amount, currency)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <BudgetModal
          categories={categories}
          catById={catById}
          currency={currency}
          editing={modal.edit || null}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete budget?"
          body={`The ${delTarget.cat?.name || ''} budget will be permanently removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

function BudgetModal({ categories, catById, currency, editing, onSaved, onClose }) {
  const now = new Date();
  const [form, setForm] = useState({
    category_id:   editing?.category_id || categories[0]?.id || '',
    month:         editing?.month || now.getMonth() + 1,
    year:          editing?.year || now.getFullYear(),
    monthly_limit: editing?.monthly_limit ? String(editing.monthly_limit) : '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedCat = catById(form.category_id);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.monthly_limit || Number(form.monthly_limit) <= 0) errs.monthly_limit = 'Enter a valid limit greater than 0';
    if (!editing && !form.category_id) errs.category_id = 'Select a category';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      let data;
      if (editing) {
        ({ data } = await api.put(`/api/v1/budgets/${editing.id}`, { monthly_limit: parseFloat(form.monthly_limit) }));
      } else {
        ({ data } = await api.post('/api/v1/budgets/', {
          category_id:   form.category_id,
          month:         parseInt(form.month),
          year:          parseInt(form.year),
          monthly_limit: parseFloat(form.monthly_limit),
        }));
      }
      onSaved(data, !!editing);
    } catch (err) {
      setErrors({ monthly_limit: err.response?.data?.detail || 'Failed to save budget.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit budget' : 'New budget'}
      sub={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' spending limit'}
      onClose={onClose}
      icon={selectedCat?.icon || 'wallet'}
      iconColor={selectedCat?.color}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />}
            {editing ? 'Save changes' : 'Create budget'}
          </button>
        </>
      }
    >
      {editing ? (
        <div className="center gap12" style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
          <CatIcon cat={selectedCat} size="lg" />
          <div className="fw8" style={{ fontSize: 16 }}>{selectedCat?.name || 'Budget'}</div>
        </div>
      ) : (
        <Field label="Category" error={errors.category_id}>
          <Select value={form.category_id} error={errors.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="" disabled>Select a category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}

      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Month">
            <Select value={form.month} onChange={e => set('month', e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}</option>
              ))}
            </Select>
          </Field>
          <Field label="Year">
            <TextInput type="number" value={form.year} min="2000" max="2099" onChange={e => set('year', e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Monthly limit" error={errors.monthly_limit}>
        <TextInput
          affix={currencySymbol(currency)}
          type="number" inputMode="decimal" step="0.01" placeholder="500.00"
          value={form.monthly_limit} error={errors.monthly_limit}
          onChange={e => set('monthly_limit', e.target.value)}
          autoFocus={!!editing}
        />
      </Field>
    </Modal>
  );
}
