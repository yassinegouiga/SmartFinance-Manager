import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import Icon from '../components/Icons/Icon';
import {
  Modal, Field, TextInput, Select, Segmented, EmptyState, Spinner,
  Money, SearchInput, PageHead, CatIcon, useToast,
} from '../components/UI';
import { fmtMoney, fmtDate, currencySymbol } from '../utils/format';

export default function Transactions() {
  const { currency = 'USD' } = useAuth();
  const { categories, catById } = useCategories();
  const toast = useToast();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [exportOpen, setExportOpen]     = useState(false);
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterCat, setFilterCat]       = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [deletingId, setDeletingId]     = useState(null);

  useEffect(() => {
    api.get('/api/v1/transactions/', { params: { limit: 500 } })
      .then(r => setTransactions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => filterType === 'all' || t.type === filterType.toUpperCase())
      .filter(t => filterCat === 'all' || t.category_id === filterCat)
      .filter(t => {
        const d = new Date(t.date);
        if (filterPeriod === 'thism') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (filterPeriod === 'lastm') {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        }
        return true;
      })
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (t.description || '').toLowerCase().includes(s) || (catById(t.category_id).name || '').toLowerCase().includes(s);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterType, filterCat, filterPeriod, search, catById]);

  const totals = useMemo(
    () => filtered.reduce((a, t) => { if (t.type === 'INCOME') a.income += t.amount; else a.expense += t.amount; return a; }, { income: 0, expense: 0 }),
    [filtered],
  );

  const groups = useMemo(() => {
    const m = new Map();
    filtered.forEach(t => { const k = fmtDate(t.date, 'rel'); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
    return [...m.entries()];
  }, [filtered]);

  const hasFilters = search || filterType !== 'all' || filterCat !== 'all' || filterPeriod !== 'all';
  const clearFilters = () => { setSearch(''); setFilterType('all'); setFilterCat('all'); setFilterPeriod('all'); };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast && toast('Transaction deleted', 'neg');
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  const exportCSV = () => {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency']];
    filtered.forEach(t => {
      const d = new Date(t.date).toISOString().slice(0, 10);
      const amt = (t.type === 'INCOME' ? '' : '-') + t.amount.toFixed(2);
      const esc = (s) => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
      rows.push([d, t.description || '', catById(t.category_id).name, t.type, amt, currency].map(esc));
    });
    const csv = rows.map(r => r.join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `smartfinance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setExportOpen(false);
    toast && toast(`Exported ${filtered.length} transactions to CSV`, 'pos');
  };

  const exportPDF = () => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10b981';
    const body = filtered.map(t => {
      const d = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const c = catById(t.category_id);
      const sign = t.type === 'INCOME' ? '+' : '−';
      const color = t.type === 'INCOME' ? '#059669' : '#e11d48';
      return `<tr><td>${d}</td><td><span class="dot" style="background:${c.color}"></span>${c.name}</td><td>${(t.description || '').replace(/</g, '&lt;')}</td><td style="text-align:right;color:${color};font-weight:700">${sign}${fmtMoney(t.amount, currency)}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SmartFinance — Transactions</title>
    <style>*{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;box-sizing:border-box}body{margin:40px;color:#0e1320}.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:24px}.brand{font-size:22px;font-weight:800;letter-spacing:-.02em}.brand span{color:${accent}}.sub{color:#828c9d;font-size:12px;margin-top:4px}.totals{display:flex;gap:28px;margin-bottom:24px}.totals .t{font-size:12px;color:#828c9d}.totals .v{font-size:18px;font-weight:800;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:12.5px}th{text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:.06em;color:#828c9d;padding:8px 10px;border-bottom:1px solid #e2e7ee}th:last-child{text-align:right}td{padding:9px 10px;border-bottom:1px solid #eef1f6}.dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:7px;vertical-align:middle}.foot{margin-top:24px;color:#aab2c0;font-size:11px;text-align:center}@media print{body{margin:18px}}</style></head><body>
    <div class="head"><div><div class="brand">Smart<span>Finance</span></div><div class="sub">Transaction statement · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div><div class="sub">${filtered.length} transactions</div></div>
    <div class="totals"><div><div class="t">Income</div><div class="v" style="color:#059669">${fmtMoney(totals.income, currency)}</div></div><div><div class="t">Expenses</div><div class="v" style="color:#e11d48">${fmtMoney(totals.expense, currency)}</div></div><div><div class="t">Net</div><div class="v">${fmtMoney(totals.income - totals.expense, currency)}</div></div></div>
    <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table>
    <div class="foot">Generated by SmartFinance Manager · ${new Date().toLocaleString()}</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast && toast('Allow pop-ups to export PDF', 'neg'); setExportOpen(false); return; }
    w.document.write(html); w.document.close();
    setExportOpen(false);
    toast && toast('Opening print dialog — choose "Save as PDF"', 'info');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead deps={[exportOpen, filtered.length]}>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-outline" onClick={() => setExportOpen(o => !o)}>
            <Icon name="download" size={17} /> <span className="hide-mobile">Export</span> <Icon name="chevronDown" size={14} />
          </button>
          {exportOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setExportOpen(false)} />
              <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 230, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
                <div className="t-xs muted" style={{ padding: '6px 10px 4px' }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · current filter</div>
                <button className="menu-item" onClick={exportCSV}>
                  <span className="cat-ic sm" style={{ background: 'var(--pos-soft)', color: 'var(--pos)' }}><Icon name="grid" size={15} /></span>
                  <div><div className="fw7 t-sm">Export as CSV</div><div className="t-xs muted">Spreadsheet file</div></div>
                </button>
                <button className="menu-item" onClick={exportPDF}>
                  <span className="cat-ic sm" style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}><Icon name="receipt" size={15} /></span>
                  <div><div className="fw7 t-sm">Export as PDF</div><div className="t-xs muted">Printable statement</div></div>
                </button>
              </div>
            </>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={18} /> <span className="hide-mobile">Add transaction</span>
        </button>
      </PageHead>

      {/* Summary strip */}
      <div className="cols-3 mb16">
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="arrowDownRight" size={15} style={{ color: 'var(--pos)' }} />Income</div><div className="value pos tnum" style={{ fontSize: 22 }}>{fmtMoney(totals.income, currency)}</div></div></div>
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="arrowUpRight" size={15} style={{ color: 'var(--neg)' }} />Expenses</div><div className="value neg tnum" style={{ fontSize: 22 }}>{fmtMoney(totals.expense, currency)}</div></div></div>
        <div className="card pad"><div className="stat" style={{ padding: 0 }}><div className="label"><Icon name="wallet" size={15} />Net</div><div className="value tnum" style={{ fontSize: 22, color: totals.income - totals.expense >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmtMoney(totals.income - totals.expense, currency)}</div></div></div>
      </div>

      {/* Filters */}
      <div className="card pad mb16">
        <div className="row wrap gap12" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 180 }}><SearchInput value={search} onChange={setSearch} placeholder="Search description or category…" /></div>
          <Segmented value={filterType} accent onChange={setFilterType}
            options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]} />
          <div style={{ minWidth: 150 }}>
            <Select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div style={{ minWidth: 140 }}>
            <Select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="thism">This month</option>
              <option value="lastm">Last month</option>
            </Select>
          </div>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}><Icon name="x" size={15} /> Clear</button>}
        </div>
      </div>

      {/* List grouped by date */}
      <div className="card" style={{ padding: 8 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
            body={hasFilters ? 'Try adjusting or clearing your filters to see more.' : 'Add your first transaction to start tracking your money.'}
            action={hasFilters
              ? <button className="btn btn-outline" onClick={clearFilters}>Clear filters</button>
              : <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={17} /> Add transaction</button>}
          />
        ) : groups.map(([day, items]) => (
          <div key={day} style={{ marginBottom: 6 }}>
            <div className="between" style={{ padding: '12px 12px 6px' }}>
              <span className="t-xs fw7" style={{ color: 'var(--text-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{day}</span>
              <span className="t-xs muted tnum">{items.length} item{items.length > 1 ? 's' : ''}</span>
            </div>
            {items.map(t => {
              const c = catById(t.category_id);
              return (
                <div className="tx-row" key={t.id}>
                  <CatIcon cat={c} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw7" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || c.name}</div>
                    <div className="t-xs muted">{c.name} · {fmtDate(t.date)}</div>
                  </div>
                  <Money amount={t.amount} type={t.type === 'INCOME' ? 'income' : 'expense'} cur={currency} strong />
                  <button
                    className="icon-btn plain del-btn" title="Delete"
                    disabled={deletingId === t.id}
                    onClick={() => handleDelete(t.id)}
                    style={{ width: 32, height: 32 }}
                  >
                    {deletingId === t.id ? <Spinner /> : <Icon name="trash" size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showAdd && (
        <AddTransactionModal
          categories={categories}
          currency={currency}
          onAdded={(txn) => { setTransactions(prev => [txn, ...prev]); setShowAdd(false); toast && toast('Transaction added', 'pos'); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddTransactionModal({ categories, currency, onAdded, onClose }) {
  const [type, setType]       = useState('EXPENSE');
  const [amount, setAmount]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const options = categories.filter(c => c.type === type);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) errs.amount = 'Enter a valid amount greater than 0';
    if (!categoryId) errs.category_id = 'Select a category';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/transactions/', {
        amount: parseFloat(amount),
        type,
        category_id: categoryId,
        date: new Date(date + 'T12:00:00').toISOString(),
        description: description.trim(),
      });
      onAdded(data);
    } catch (err) {
      setErrors({ amount: err.response?.data?.detail || 'Failed to save transaction.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add transaction"
      sub="Record income or an expense"
      onClose={onClose}
      icon="plus"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />} Save transaction
          </button>
        </>
      }
    >
      <Segmented
        value={type === 'EXPENSE' ? 'expense' : 'income'}
        accent
        onChange={v => { setType(v.toUpperCase()); setCategoryId(''); }}
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
      />

      <Field label="Amount" error={errors.amount}>
        <TextInput
          affix={currencySymbol(currency)} type="number" inputMode="decimal" step="0.01" placeholder="0.00"
          value={amount} error={errors.amount} onChange={e => setAmount(e.target.value)} autoFocus
        />
      </Field>

      <Field label="Category" error={errors.category_id}>
        <Select value={categoryId} error={errors.category_id} onChange={e => setCategoryId(e.target.value)}>
          <option value="" disabled>Select a category…</option>
          {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Date">
          <input className="input" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Description (optional)">
          <TextInput placeholder="e.g. Grocery run" value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
