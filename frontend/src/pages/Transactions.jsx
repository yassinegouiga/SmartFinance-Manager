import { useEffect, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import './Transactions.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    try {
      const [t, c] = await Promise.all([
        api.get('/api/v1/transactions/', { params: { limit: 100 } }),
        api.get('/api/v1/categories/'),
      ]);
      setTransactions(t.data);
      setCategories(c.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const categoryMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filterType === 'ALL' || t.type === filterType)
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (t.description || '').toLowerCase().includes(s) ||
               (categoryMap[t.category_id] || '').toLowerCase().includes(s);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterType, search, categoryMap]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdded = (txn) => {
    setTransactions(prev => [txn, ...prev]);
    setDrawerOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(108, 99, 255);
    doc.text('Transactions Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 150);
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: filtered.map(t => [
        new Date(t.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }),
        t.description || '—',
        categoryMap[t.category_id] || 'Unknown',
        t.type,
        (t.type === 'INCOME' ? '+' : '-') + '$' + Number(t.amount).toFixed(2),
      ]),
      headStyles: { fillColor: [108, 99, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 252] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 4: { halign: 'right' } },
    });
    doc.save(`transactions-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Category', 'Type', 'Amount'],
      ...filtered.map(t => [
        new Date(t.date).toLocaleDateString('en-US'),
        t.description || '',
        categoryMap[t.category_id] || 'Unknown',
        t.type,
        t.amount,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{transactions.length} total transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={exportCSV} disabled={filtered.length === 0}>
            <DownloadIcon /> CSV
          </button>
          <button className="btn btn-ghost" onClick={exportPDF} disabled={filtered.length === 0}>
            <DownloadIcon /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => setDrawerOpen(true)}>
            <PlusIcon /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass txn-filters">
        <div className="txn-search-wrap">
          <SearchIcon />
          <input
            className="txn-search"
            placeholder="Search by description or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="txn-type-filter">
          {['ALL', 'INCOME', 'EXPENSE'].map(t => (
            <button
              key={t}
              className={`txn-filter-btn${filterType === t ? ' active' : ''}`}
              onClick={() => setFilterType(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass txn-table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon />
            <h4>No transactions found</h4>
            <p>{search || filterType !== 'ALL' ? 'Try adjusting your filters' : 'Add your first transaction to get started'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td className="txn-date">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="txn-desc">{t.description || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                    <td>
                      <span className="badge" style={{ background:'rgba(108,99,255,0.1)', color:'var(--accent)' }}>
                        {categoryMap[t.category_id] || 'Unknown'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${t.type.toLowerCase()}`}>{t.type}</span></td>
                    <td style={{ textAlign:'right', fontWeight:700, color: t.type==='INCOME' ? 'var(--green)' : 'var(--red)' }}>
                      {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <button
                        className="btn btn-danger txn-delete"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <AddTransactionDrawer
            categories={categories}
            onAdded={handleAdded}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      )}
    </div>
  );
}

function AddTransactionDrawer({ categories, onAdded, onClose }) {
  const [form, setForm] = useState({
    amount: '',
    type: 'EXPENSE',
    category_id: categories[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/transactions/', {
        amount: parseFloat(form.amount),
        type: form.type,
        category_id: form.category_id,
        date: new Date(form.date).toISOString(),
        description: form.description,
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer">
      <div className="drawer-header">
        <h3>Add Transaction</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="type-toggle">
            <button type="button" className={form.type === 'INCOME' ? 'active-income' : ''} onClick={() => set('type','INCOME')}>Income</button>
            <button type="button" className={form.type === 'EXPENSE' ? 'active-expense' : ''} onClick={() => set('type','EXPENSE')}>Expense</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)} required>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="input" type="text" placeholder="e.g. Walmart, Salary..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }} type="submit" disabled={loading}>
          {loading ? <span className="spinner" style={{width:15,height:15,borderWidth:2}} /> : <PlusIcon />}
          Save Transaction
        </button>
      </form>
    </div>
  );
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const EmptyIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const DownloadIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
