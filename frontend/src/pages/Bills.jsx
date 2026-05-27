import { useEffect, useState } from 'react';
import api from '../services/api';
import './Bills.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const FREQ_LABELS = { MONTHLY:'Monthly', WEEKLY:'Weekly', YEARLY:'Yearly', ONE_TIME:'One-time' };
const STATUS_ORDER = { OVERDUE: 0, UNPAID: 1, PAID: 2 };

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBills = async () => {
    try {
      const { data } = await api.get('/api/v1/bills/');
      setBills(data.sort((a,b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBills(); }, []);

  const updateBill = (updated) => setBills(prev => prev.map(b => b.id === updated.id ? updated : b).sort((a,b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]));

  const handlePay = async (bill) => {
    setActionLoading(bill.id + '_pay');
    try {
      const { data } = await api.post(`/api/v1/bills/${bill.id}/pay`);
      updateBill(data);
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleReset = async (bill) => {
    setActionLoading(bill.id + '_reset');
    try {
      const { data } = await api.post(`/api/v1/bills/${bill.id}/reset`);
      updateBill(data);
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill?')) return;
    setActionLoading(id + '_del');
    try {
      await api.delete(`/api/v1/bills/${id}`);
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const summary = bills.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    if (b.status !== 'PAID') acc.upcoming += b.amount;
    return acc;
  }, { PAID:0, UNPAID:0, OVERDUE:0, upcoming:0 });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="bills-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="page-subtitle">Manage your recurring payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <PlusIcon /> Add Bill
        </button>
      </div>

      {bills.length > 0 && (
        <div className="bills-summary">
          <div className="glass bills-stat">
            <span className="bills-stat-val" style={{color:'var(--red)'}}>{summary.OVERDUE}</span>
            <span className="bills-stat-label">Overdue</span>
          </div>
          <div className="glass bills-stat">
            <span className="bills-stat-val" style={{color:'var(--text-secondary)'}}>{summary.UNPAID}</span>
            <span className="bills-stat-label">Unpaid</span>
          </div>
          <div className="glass bills-stat">
            <span className="bills-stat-val" style={{color:'var(--green)'}}>{summary.PAID}</span>
            <span className="bills-stat-label">Paid</span>
          </div>
          <div className="glass bills-stat">
            <span className="bills-stat-val">{fmt(summary.upcoming)}</span>
            <span className="bills-stat-label">Total Upcoming</span>
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="glass empty-state" style={{ padding:'60px 20px' }}>
          <BillIcon />
          <h4>No bills yet</h4>
          <p>Add a bill to start tracking your recurring payments</p>
        </div>
      ) : (
        <div className="bills-list">
          {bills.map(bill => (
            <div key={bill.id} className={`glass bill-card bill-card-${bill.status.toLowerCase()}`}>
              <div className="bill-card-icon">
                <RecurIcon />
              </div>
              <div className="bill-card-info">
                <div className="bill-card-name-row">
                  <h3 className="bill-name">{bill.name}</h3>
                  <span className={`badge badge-${bill.status.toLowerCase()}`}>
                    {bill.status === 'OVERDUE' && <span className="overdue-dot" />}
                    {bill.status}
                  </span>
                  <span className={`badge badge-${bill.frequency.toLowerCase()}`}>
                    {FREQ_LABELS[bill.frequency] || bill.frequency}
                  </span>
                </div>
                <span className="bill-due">Due on the {bill.due_day}{ordinal(bill.due_day)} of each month</span>
              </div>
              <div className="bill-card-amount">
                {fmt(bill.amount)}
              </div>
              <div className="bill-card-actions">
                {bill.status === 'PAID' ? (
                  <button className="btn btn-ghost" style={{fontSize:12,padding:'6px 12px'}} onClick={() => handleReset(bill)} disabled={actionLoading === bill.id+'_reset'}>
                    Reset
                  </button>
                ) : (
                  <button className="btn btn-success" style={{fontSize:12,padding:'6px 12px'}} onClick={() => handlePay(bill)} disabled={actionLoading === bill.id+'_pay'}>
                    {actionLoading === bill.id+'_pay' ? <span className="spinner" style={{width:12,height:12,borderWidth:2}} /> : <CheckIcon />}
                    Pay
                  </button>
                )}
                <button className="btn btn-danger" style={{padding:'6px 8px'}} onClick={() => handleDelete(bill.id)} disabled={actionLoading === bill.id+'_del'}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateBillModal onAdded={b => { setBills(prev => [b,...prev]); setCreateOpen(false); }} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function CreateBillModal({ onAdded, onClose }) {
  const [form, setForm] = useState({ name:'', amount:'', due_day:'1', is_recurring:true, frequency:'MONTHLY' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    const due = parseInt(form.due_day);
    if (isNaN(due) || due < 1 || due > 31) { setError('Due day must be 1–31.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/bills/', {
        name: form.name,
        amount: parseFloat(form.amount),
        due_day: due,
        is_recurring: form.is_recurring,
        frequency: form.frequency,
      });
      onAdded(data);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to add bill.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Add Bill</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Bill Name</label>
            <input className="input" type="text" placeholder="e.g. Netflix" value={form.name} onChange={e=>set('name',e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount ($)</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="15.99" value={form.amount} onChange={e=>set('amount',e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Due Day (1–31)</label>
              <input className="input" type="number" min="1" max="31" placeholder="1" value={form.due_day} onChange={e=>set('due_day',e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select className="input" value={form.frequency} onChange={e=>set('frequency',e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="YEARLY">Yearly</option>
              <option value="ONE_TIME">One-time</option>
            </select>
          </div>
          <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
            <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e=>set('is_recurring',e.target.checked)} style={{width:16,height:16,accentColor:'var(--accent)'}} />
            <label htmlFor="recurring" style={{fontSize:13,color:'var(--text-secondary)',cursor:'pointer'}}>Recurring bill</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} /> : null} Add Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const RecurIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const BillIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
