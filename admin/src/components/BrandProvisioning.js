import { useEffect, useState } from 'react';
import { platformService } from '../services/api';

const emptyBrand = { orgId: '', name: '', slug: '', currency: 'AED', timezone: 'Asia/Dubai' };

export default function BrandProvisioning({ organizations, brands, onChanged }) {
  const [brandList, setBrandList] = useState(brands);
  const [createOpen, setCreateOpen] = useState(false);
  const [values, setValues] = useState(emptyBrand);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setBrandList(brands), [brands]);
  useEffect(() => {
    if (!organizations.some(org => org.id === values.orgId)) {
      setValues(current => ({ ...current, orgId: organizations[0]?.id || '' }));
    }
  }, [organizations, values.orgId]);

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
      setValues({ ...emptyBrand, orgId: values.orgId });
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

  const ownerName = orgId => organizations.find(org => org.id === orgId)?.displayName
    || organizations.find(org => org.id === orgId)?.name
    || 'Organization unavailable';

  return (
    <div className="page-container organization-dashboard">
      <div className="section-header">
        <div>
          <h1 className="section-title">Brand management</h1>
          <p className="section-subtitle">Manage the brands available to your stores.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)} disabled={!organizations.length}>
          + Add brand
        </button>
      </div>
      {message && <p role="status">{message}</p>}

      {brandList.length ? (
        <div className="brand-card-grid" aria-label="Brands">
          {brandList.map(brand => (
            <article className="brand-card" key={brand.id}>
              <div className="brand-card-heading">
                <div>
                  <h2>{brand.name}</h2>
                  <span className="brand-card-slug">{brand.slug}</span>
                </div>
                <span className={`store-card-status ${brand.status === 'active' ? 'is-active' : ''}`}>{brand.status}</span>
              </div>
              <p>{ownerName(brand.orgId)} · {brand.currency}</p>
              <div className="brand-card-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(brand)}>Edit</button>
                <button type="button" className="btn btn-ghost-danger btn-sm" onClick={() => deleteBrand(brand)} disabled={busy}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="ledger-card organization-empty">
          <h2>No brands yet</h2>
          <p>Add a brand before assigning a menu to a store.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)} disabled={!organizations.length}>Add your first brand</button>
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
            <label>Organization
              <select required value={values.orgId} onChange={event => setValues({ ...values, orgId: event.target.value })}>
                {organizations.map(org => <option key={org.id} value={org.id}>{org.displayName || org.name}</option>)}
              </select>
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
              <button className="btn btn-primary" disabled={busy || !values.orgId}>Add brand</button>
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
