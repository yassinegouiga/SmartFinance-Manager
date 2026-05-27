import { useEffect, useState } from 'react';
import api from '../services/api';
import './SavingPots.css';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const POT_COLORS = ['#6C63FF','#3ECFCF','#f59e0b','#22c55e','#ef4444','#3b82f6','#ec4899','#8b5cf6'];

function CircleProgress({ pct, color, size = 110 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const safePct = isNaN(pct) ? 0 : Math.min(pct, 1);
  const dash = safePct * circ;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition:'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}

export default function SavingPots() {
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [fundModal, setFundModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPots = async () => {
    try {
      const { data } = await api.get('/api/v1/saving-pots/');
      setPots(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPots(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saving pot?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/saving-pots/${id}`);
      setPots(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  const handleFundAction = (pot, action) => setFundModal({ pot, action });

  const handleFundDone = (updatedPot) => {
    setPots(prev => prev.map(p => p.id === updatedPot.id ? { ...p, current_amount: updatedPot.current_amount ?? p.current_amount } : p));
    setFundModal(null);
    fetchPots();
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="pots-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Saving Pots</h1>
          <p className="page-subtitle">Track your savings goals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <PlusIcon /> New Pot
        </button>
      </div>

      {pots.length === 0 ? (
        <div className="glass empty-state" style={{ padding:'60px 20px' }}>
          <PotIcon />
          <h4>No saving pots yet</h4>
          <p>Create a pot to start saving towards your goals</p>
        </div>
      ) : (
        <div className="pots-grid">
          {pots.map((pot, i) => {
            const color = POT_COLORS[i % POT_COLORS.length];
            const pct = pot.target_amount > 0 ? pot.current_amount / pot.target_amount : 0;
            const safePct = isNaN(pct) ? 0 : pct;
            const done = pot.current_amount >= pot.target_amount;
            return (
              <div key={pot.id} className="glass pot-card">
                <div className="pot-card-top">
                  <div>
                    <h3 className="pot-name">{pot.name}</h3>
                    {pot.deadline && (
                      <span className="pot-deadline">
                        Due {new Date(pot.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </span>
                    )}
                  </div>
                  <button className="btn btn-danger" style={{padding:'5px 8px'}} onClick={() => handleDelete(pot.id)} disabled={deletingId===pot.id}>
                    <TrashIcon />
                  </button>
                </div>

                <div className="pot-ring-wrap">
                  <CircleProgress pct={safePct} color={color} />
                  <div className="pot-ring-label">
                    <span className="pot-ring-pct" style={{ color }}>{Math.round(safePct * 100)}%</span>
                    {done && <span className="pot-done-badge">Done!</span>}
                  </div>
                </div>

                <div className="pot-amounts">
                  <span className="pot-current" style={{ color }}>{fmt(pot.current_amount)}</span>
                  <span className="pot-target">/ {fmt(pot.target_amount)}</span>
                </div>

                <div className="progress-bar" style={{ marginBottom:16 }}>
                  <div className="progress-fill" style={{ width:`${Math.min(safePct,1)*100}%`, background:color }} />
                </div>

                <div className="pot-actions">
                  <button className="btn btn-success" style={{ flex:1, justifyContent:'center' }} onClick={() => handleFundAction(pot, 'deposit')}>
                    + Add Funds
                  </button>
                  <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => handleFundAction(pot, 'withdraw')} disabled={pot.current_amount <= 0}>
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && <CreatePotModal onAdded={p => { setPots(prev => [p,...prev]); setCreateOpen(false); }} onClose={() => setCreateOpen(false)} />}
      {fundModal && <FundModal modal={fundModal} onDone={handleFundDone} onClose={() => setFundModal(null)} />}
    </div>
  );
}

function CreatePotModal({ onAdded, onClose }) {
  const [form, setForm] = useState({ name:'', target_amount:'', deadline:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.target_amount || Number(form.target_amount) <= 0) { setError('Enter a valid target.'); return; }
    setLoading(true);
    try {
      const payload = { name: form.name, target_amount: parseFloat(form.target_amount) };
      if (form.deadline) payload.deadline = new Date(form.deadline).toISOString();
      const { data } = await api.post('/api/v1/saving-pots/', payload);
      onAdded(data);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create pot.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>New Saving Pot</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Pot Name</label>
            <input className="input" type="text" placeholder="e.g. Vacation Fund" value={form.name} onChange={e=>set('name',e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Target Amount ($)</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="1000.00" value={form.target_amount} onChange={e=>set('target_amount',e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input className="input" type="date" value={form.deadline} onChange={e=>set('deadline',e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} /> : null} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FundModal({ modal, onDone, onClose }) {
  const { pot, action } = modal;
  const isDeposit = action === 'deposit';
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (!isDeposit && Number(amount) > pot.current_amount) { setError('Insufficient funds.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post(`/api/v1/saving-pots/${pot.id}/${action}`, { amount: parseFloat(amount) });
      onDone({ ...pot, current_amount: data.current_amount ?? (isDeposit ? pot.current_amount + parseFloat(amount) : pot.current_amount - parseFloat(amount)) });
    } catch (err) { setError(err.response?.data?.detail || 'Action failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isDeposit ? 'Add Funds' : 'Withdraw'} — {pot.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>
          Current balance: <strong style={{color:'var(--text-primary)'}}>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(pot.current_amount)}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn ${isDeposit ? 'btn-primary' : 'btn-ghost'}`} disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} /> : null}
              {isDeposit ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const PotIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.8 1.5-1.7 1.5-2.5A2 2 0 0 0 22 14c0-1.1-1.1-2-2-2V5z"/><path d="M2 9.5C2 6 5 4 8 4"/></svg>;
