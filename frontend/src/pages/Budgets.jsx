import { useEffect, useState } from 'react';
import api from '../services/api';
import './Budgets.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

function getProgressColor(pct) {
  if (pct >= 1) return 'var(--red)';
  if (pct >= 0.8) return 'var(--yellow)';
  return 'var(--green)';
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    try {
      const [b, c] = await Promise.all([
        api.get('/api/v1/budgets/'),
        api.get('/api/v1/categories/'),
      ]);
      setBudgets(b.data);
      setCategories(c.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/budgets/${id}`);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdded = (budget) => {
    setBudgets(prev => [budget, ...prev]);
    setModalOpen(false);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="budgets-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">Track your monthly spending limits</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <PlusIcon /> Create Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="glass empty-state" style={{ padding: '60px 20px' }}>
          <EmptyIcon />
          <h4>No budgets yet</h4>
          <p>Create a budget to start tracking your spending</p>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map(b => {
            const pct = b.monthly_limit > 0 ? Math.min(b.spent_amount / b.monthly_limit, 1) : 0;
            const over = b.spent_amount > b.monthly_limit;
            const color = getProgressColor(pct);
            return (
              <div key={b.id} className={`glass budget-card${over ? ' over' : ''}`}>
                <div className="budget-card-header">
                  <div>
                    <h3 className="budget-card-name">{categoryMap[b.category_id] || 'Unknown'}</h3>
                    <span className="budget-card-period">
                      {new Date(b.year, b.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {over && <span className="badge badge-expense">Over Budget</span>}
                    <button className="btn btn-danger" style={{padding:'5px 8px'}} onClick={() => handleDelete(b.id)} disabled={deletingId===b.id}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div className="budget-card-amounts">
                  <span className="budget-spent" style={{ color }}>{fmt(b.spent_amount)}</span>
                  <span className="budget-limit">/ {fmt(b.monthly_limit)}</span>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct * 100}%`, background: color }} />
                </div>

                <div className="budget-card-footer">
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {over
                      ? `${fmt(b.spent_amount - b.monthly_limit)} over limit`
                      : `${fmt(b.monthly_limit - b.spent_amount)} remaining`}
                  </span>
                  <span style={{ fontSize:12, color }}>{Math.round(pct * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <CreateBudgetModal
          categories={categories}
          onAdded={handleAdded}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function CreateBudgetModal({ categories, onAdded, onClose }) {
  const now = new Date();
  const [form, setForm] = useState({
    category_id: categories[0]?.id || '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    monthly_limit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.monthly_limit || Number(form.monthly_limit) <= 0) {
      setError('Please enter a valid limit.'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/budgets/', {
        category_id: form.category_id,
        month: parseInt(form.month),
        year: parseInt(form.year),
        monthly_limit: parseFloat(form.monthly_limit),
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Budget</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)} required>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="input" value={form.month} onChange={e => set('month', e.target.value)}>
                {Array.from({length:12},(_,i)=>(
                  <option key={i+1} value={i+1}>
                    {new Date(2000,i).toLocaleDateString('en-US',{month:'long'})}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="input" type="number" value={form.year} onChange={e => set('year', e.target.value)} min="2000" max="2099" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Limit ($)</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="500.00" value={form.monthly_limit} onChange={e => set('monthly_limit', e.target.value)} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const EmptyIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l6.5 3.5"/></svg>;
