import { useEffect, useState } from 'react';
import api from '../services/api';
import './Categories.css';

const PRESET_COLORS = [
  '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6',
  '#6C63FF', '#3ECFCF', '#EC4899', '#F97316', '#14B8A6',
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/api/v1/categories/');
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const defaultCats = categories.filter(c => !c.user_id);
  const customCats  = categories.filter(c =>  c.user_id);

  const handleSaved = (cat, isNew) => {
    setCategories(prev =>
      isNew ? [...prev, cat] : prev.map(c => c.id === cat.id ? cat : c)
    );
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleEdit = (cat) => {
    setEditTarget(cat);
    setModalOpen(true);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    setDeleteError('');
    try {
      await api.delete(`/api/v1/categories/${cat.id}`);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete category.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="categories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Manage how your transactions are organised</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <PlusIcon /> Add Category
        </button>
      </div>

      {deleteError && <div className="error-msg" style={{ marginBottom: 20 }}>{deleteError}</div>}

      <section className="cat-section">
        <div className="cat-section-header">
          <h3 className="cat-section-title">Default Categories</h3>
          <span className="cat-section-sub">Built-in — cannot be edited or deleted</span>
        </div>
        <div className="cat-grid">
          {defaultCats.map(cat => (
            <CategoryCard key={cat.id} cat={cat} readOnly />
          ))}
        </div>
      </section>

      <section className="cat-section">
        <div className="cat-section-header">
          <h3 className="cat-section-title">My Categories</h3>
          <span className="cat-section-sub">{customCats.length} custom {customCats.length === 1 ? 'category' : 'categories'}</span>
        </div>
        {customCats.length === 0 ? (
          <div className="empty-state glass">
            <EmptyIcon />
            <h4>No custom categories yet</h4>
            <p>Click "Add Category" to create your own</p>
          </div>
        ) : (
          <div className="cat-grid">
            {customCats.map(cat => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                onEdit={() => handleEdit(cat)}
                onDelete={() => handleDelete(cat)}
                deleting={deletingId === cat.id}
              />
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <CategoryModal
          category={editTarget}
          onSaved={handleSaved}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

function CategoryCard({ cat, readOnly, onEdit, onDelete, deleting }) {
  return (
    <div className="cat-card glass">
      <div className="cat-card-top">
        <div className="cat-color-dot" style={{ background: cat.color || '#6C63FF' }} />
        <div className="cat-info">
          <span className="cat-name">{cat.name}</span>
          <span className={`badge badge-${cat.type.toLowerCase()}`}>{cat.type}</span>
        </div>
      </div>
      {!readOnly && (
        <div className="cat-card-actions">
          <button className="btn btn-ghost cat-action-btn" onClick={onEdit} title="Edit">
            <EditIcon />
          </button>
          <button className="btn btn-danger cat-action-btn" onClick={onDelete} disabled={deleting} title="Delete">
            {deleting ? <span className="spinner" style={{ width:12, height:12, borderWidth:2 }} /> : <TrashIcon />}
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryModal({ category, onSaved, onClose }) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name:  category?.name  || '',
    type:  category?.type  || 'EXPENSE',
    color: category?.color || PRESET_COLORS[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        const { data } = await api.put(`/api/v1/categories/${category.id}`, form);
        onSaved(data, false);
      } else {
        const { data } = await api.post('/api/v1/categories/', form);
        onSaved(data, true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Category' : 'New Category'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Side Income, Healthcare…"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="type-toggle">
              <button type="button" className={form.type === 'INCOME'  ? 'active-income'  : ''} onClick={() => set('type', 'INCOME')}>Income</button>
              <button type="button" className={form.type === 'EXPENSE' ? 'active-expense' : ''} onClick={() => set('type', 'EXPENSE')}>Expense</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-swatches">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${form.color === c ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => set('color', c)}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : null}
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PlusIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const EditIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const EmptyIcon = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>;
