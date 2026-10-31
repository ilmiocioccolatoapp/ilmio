import { useEffect, useState } from 'react';
import { platformService } from '../services/api';
import { PlusIcon, StoreIcon, TrashIcon } from './Icons';

const emptyBrand = { name: '', slug: '', currency: 'AED', timezone: 'Asia/Dubai' };

export default function BrandProvisioning({ brands, onChanged, onManageBranches }) {
  const [brandList, setBrandList] = useState(brands);
  const [createOpen, setCreateOpen] = useState(false);
  const [values, setValues] = useState(emptyBrand);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setBrandList(brands), [brands]);
  const run = async action => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
      await onChanged();
    } catch (error) {
      setMessage(error.error || error.message || 'Could not complete this action.');
    } finally {
      setBusy(false);
    }
  };

  const createBrand = event => {
    event.preventDefault();
    run(async () => {
      const created = await platformService.post('/brands', values);
      setBrandList(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setValues(emptyBrand);
      setCreateOpen(false);
      setMessage('Brand created.');
    });
  };

  const openEdit = brand => {
    setEditingBrand(brand);
    setEditValues({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      primaryColor: brand.primaryColor || '#8B4513',
      currency: brand.currency,
      timezone: brand.timezone
    });
  };

  const saveBrand = event => {
    event.preventDefault();
    run(async () => {
      const updated = await platformService.put(`/brands/${editingBrand.id}/settings`, {
        ...editValues,
        logoUrl: editValues.logoUrl || null
      });
      setBrandList(current => current.map(brand => brand.id === updated.id ? updated : brand));
      setEditingBrand(null);
      setMessage('Brand updated.');
    });
  };

  const deleteBrand = brand => {
    if (!window.confirm(`Delete "${brand.name}"? This is only allowed when the brand has no stores or menu data.`)) return;
    run(async () => {
      await platformService.remove(`/brands/${brand.id}`);
      setBrandList(current => current.filter(item => item.id !== brand.id));
      setMessage('Brand deleted.');
    });
  };

  return (
    <div className="page-container brand-dashboard">
      <div className="section-header">
        <div>
          <h1 className="section-title">Brand management</h1>
          <p className="section-subtitle">Manage the brands available to your stores.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          <span>Add brand</span>
        </button>
      </div>
      {message && <p role="status">{message}</p>}

      {brandList.length ? (
        <div className="brand-card-grid" aria-label="Brands">
          {brandList.map(brand => (
            <article className="brand-card" key={brand.id}>
              <div className="brand-card-heading">
                <BrandLogo brand={brand} />
                <div className="brand-card-title-group">
                  <h2>{brand.name}</h2>
                  <span className="brand-card-slug">{brand.slug}</span>
                </div>
                <span className={`store-card-status ${brand.status === 'active' ? 'is-active' : ''}`}>{brand.status}</span>
              </div>
              <p>{brand.currency} · {brand.timezone}</p>
              <div className="brand-card-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(brand)}>Edit</button>
                <button type="button" className="btn btn-ghost btn-sm" aria-label={`Manage branches for ${brand.name}`} onClick={() => onManageBranches?.(brand)}>
                  <StoreIcon size={15} />
                  <span>Manage branches</span>
                </button>
                <button type="button" className="icon-danger-button" aria-label={`Delete ${brand.name}`} title={`Delete ${brand.name}`} onClick={() => deleteBrand(brand)} disabled={busy}>
                  <TrashIcon />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="ledger-card brand-empty">
          <h2>No brands yet</h2>
          <p>Add a brand before assigning a menu to a store.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}><PlusIcon />Add your first brand</button>
        </section>
      )}

      {createOpen && (
        <Modal title="Add brand" onClose={() => setCreateOpen(false)}>
          <form onSubmit={createBrand}>
            <label>Brand name
              <input required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} />
            </label>
            <label>Brand code
              <input required value={values.slug} onChange={event => setValues({ ...values, slug: event.target.value })} />
            </label>
            <label>Currency
              <select value={values.currency} onChange={event => setValues({ ...values, currency: event.target.value })}>
                {['AED', 'EUR', 'USD', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label>Timezone
              <input required value={values.timezone} onChange={event => setValues({ ...values, timezone: event.target.value })} />
            </label>
            <div className="store-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}><PlusIcon />Add brand</button>
            </div>
          </form>
        </Modal>
      )}

      {editingBrand && editValues && (
        <Modal title={`Edit ${editingBrand.name}`} onClose={() => setEditingBrand(null)}>
          <form onSubmit={saveBrand}>
            <label>Brand name
              <input required value={editValues.name} onChange={event => setEditValues({ ...editValues, name: event.target.value })} />
            </label>
            <label>Brand code
              <input readOnly value={editValues.slug} />
            </label>
            <label>Logo URL
              <input type="url" value={editValues.logoUrl} onChange={event => setEditValues({ ...editValues, logoUrl: event.target.value })} />
            </label>
            <label>Primary color
              <input type="color" value={editValues.primaryColor} onChange={event => setEditValues({ ...editValues, primaryColor: event.target.value })} />
            </label>
            <label>Currency
              <select value={editValues.currency} onChange={event => setEditValues({ ...editValues, currency: event.target.value })}>
                {['AED', 'EUR', 'USD', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label>Timezone
              <input required value={editValues.timezone} onChange={event => setEditValues({ ...editValues, timezone: event.target.value })} />
            </label>
            <div className="store-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingBrand(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>Save brand</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function BrandLogo({ brand }) {
  const [failed, setFailed] = useState(false);
  const initial = brand.name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="brand-logo" style={{ '--brand-color': brand.primaryColor || '#a16c48' }}>
      {brand.logoUrl && !failed
        ? <img src={brand.logoUrl} alt={`${brand.name} logo`} onError={() => setFailed(true)} />
        : <span aria-label={`${brand.name} logo placeholder`}>{initial}</span>}
    </span>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" role="presentation">
      <section className="ledger-card store-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}
