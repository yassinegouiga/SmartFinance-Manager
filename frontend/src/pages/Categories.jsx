import { useState } from 'react';
import api from '../services/api';
import { useCategories, iconForCategory } from '../context/CategoriesContext';
import Icon from '../components/Icons/Icon';
import { Modal, Field, TextInput, Segmented, EmptyState, Spinner, ConfirmDialog, CatIcon, IconPicker, PageHead, useToast } from '../components/UI';

const PALETTE = [
  '#10b981', '#34d399', '#60a5fa', '#fbbf24', '#fb7185',
  '#a78bfa', '#f97316', '#06b6d4', '#ec4899', '#14b8a6',
];

export default function Categories() {
  const { categories, loading, refresh } = useCategories();
  const toast = useToast();
  const [modal, setModal]             = useState(null); // null | {} | { edit: cat }
  const [delTarget, setDelTarget]     = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const defaultCats = categories.filter(c => !c.user_id);
  const customCats  = categories.filter(c =>  c.user_id);

  const handleSaved = (isNew) => {
    refresh();
    setModal(null);
    toast && toast(isNew ? 'Category created' : 'Category updated', 'pos');
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleteError('');
    try {
      await api.delete(`/api/v1/categories/${delTarget.id}`);
      await refresh();
      toast && toast('Category deleted', 'neg');
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete category.');
    } finally {
      setDelTarget(null);
    }
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
          <Icon name="plus" size={18} /> <span className="hide-mobile">Add category</span>
        </button>
      </PageHead>

      {deleteError && (
        <div className="banner banner-neg mb16">
          <Icon name="alert" size={16} />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Default categories */}
      <section style={{ marginBottom: 32 }}>
        <div className="between mb12">
          <span className="fw7" style={{ fontSize: 14 }}>Default categories</span>
          <span className="t-sm muted">Built-in · read-only</span>
        </div>
        <div className="cat-grid">
          {defaultCats.map(cat => <CatCard key={cat.id} cat={cat} readOnly />)}
        </div>
      </section>

      {/* Custom categories */}
      <section>
        <div className="between mb12">
          <span className="fw7" style={{ fontSize: 14 }}>My categories</span>
          <span className="t-sm muted">{customCats.length} custom {customCats.length === 1 ? 'category' : 'categories'}</span>
        </div>

        {customCats.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="grid"
              title="No custom categories yet"
              body="Add your own categories to organise transactions your way."
              action={<button className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Add category</button>}
            />
          </div>
        ) : (
          <div className="cat-grid">
            {customCats.map(cat => (
              <CatCard key={cat.id} cat={cat} onEdit={() => setModal({ edit: cat })} onDelete={() => setDelTarget(cat)} />
            ))}
            <button className="add-tile" onClick={() => setModal({})}>
              <div className="cat-ic lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
                <Icon name="plus" size={22} />
              </div>
              <span className="fw7" style={{ marginTop: 10 }}>Add category</span>
              <span className="t-xs muted">Create a custom one</span>
            </button>
          </div>
        )}
      </section>

      {modal !== null && (
        <CategoryModal editing={modal.edit || null} onSaved={handleSaved} onClose={() => setModal(null)} />
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete category?"
          body={`"${delTarget.name}" will be removed. Existing transactions keep their record but the category won't be selectable.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

function CatCard({ cat, readOnly, onEdit, onDelete }) {
  const typeBadge = cat.type === 'INCOME' ? 'badge-pos' : 'badge-muted';
  const typeLabel = cat.type === 'INCOME' ? 'Income' : 'Expense';

  return (
    <div className="card pad cat-card" style={{ position: 'relative' }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <CatIcon cat={cat} size="lg" />
        <span className={'badge ' + typeBadge}>{typeLabel}</span>
      </div>

      <div className="fw8 mt12" style={{ fontSize: 15 }}>{cat.name}</div>

      {readOnly ? (
        <div className="t-xs muted" style={{ marginTop: 4 }}>Built-in</div>
      ) : (
        <div className="center gap8" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={onEdit} title="Edit"><Icon name="edit" size={15} /></button>
          <button className="icon-btn plain del-cat" style={{ width: 30, height: 30 }} onClick={onDelete} title="Delete"><Icon name="trash" size={15} /></button>
        </div>
      )}
    </div>
  );
}

function CategoryModal({ editing, onSaved, onClose }) {
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name:  editing?.name  || '',
    type:  editing?.type  || 'EXPENSE',
    color: editing?.color || PALETTE[0],
    icon:  editing?.icon  || '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Empty icon = auto-infer from the name; an explicit pick overrides it.
  const effectiveIcon = form.icon || iconForCategory(form.name, 0);
  const previewCat  = { icon: effectiveIcon, color: form.color };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Give your category a name';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const payload = { name: form.name.trim(), type: form.type, color: form.color, icon: effectiveIcon };
      if (isEdit) await api.put(`/api/v1/categories/${editing.id}`, payload);
      else        await api.post('/api/v1/categories/', payload);
      onSaved(!isEdit);
    } catch (err) {
      setErrors({ name: err.response?.data?.detail || 'Failed to save category.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit category' : 'New category'}
      sub={isEdit ? 'Update name, type, or colour' : 'Create a custom spending category'}
      onClose={onClose}
      icon={effectiveIcon}
      iconColor={form.color}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="check" size={17} />}
            {isEdit ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      {/* Live preview */}
      <div className="center gap12" style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r)' }}>
        <CatIcon cat={previewCat} size="lg" />
        <div>
          <div className="fw8" style={{ fontSize: 16 }}>{form.name || 'Category name'}</div>
          <div className="t-xs muted" style={{ marginTop: 2 }}>{form.type === 'INCOME' ? 'Income' : 'Expense'}</div>
        </div>
      </div>

      <Field label="Name" error={errors.name}>
        <TextInput icon="tag" placeholder="e.g. Subscriptions, Healthcare…" value={form.name} error={errors.name} onChange={e => set('name', e.target.value)} autoFocus />
      </Field>

      <Field label="Type">
        <Segmented value={form.type} accent onChange={v => set('type', v)}
          options={[{ value: 'EXPENSE', label: 'Expense' }, { value: 'INCOME', label: 'Income' }]} />
      </Field>

      <Field label="Icon">
        <IconPicker value={effectiveIcon} onChange={v => set('icon', v)} />
      </Field>

      <Field label="Colour">
        <div className="row wrap" style={{ gap: 9 }}>
          {PALETTE.map(c => (
            <button
              key={c} type="button" onClick={() => set('color', c)}
              style={{
                width: 30, height: 30, borderRadius: 9, background: c, cursor: 'pointer',
                border: form.color === c ? '2.5px solid var(--text)' : '2.5px solid transparent',
                boxShadow: form.color === c ? '0 0 0 2px var(--bg)' : 'none', transition: '.12s',
              }}
            />
          ))}
        </div>
      </Field>
    </Modal>
  );
}
