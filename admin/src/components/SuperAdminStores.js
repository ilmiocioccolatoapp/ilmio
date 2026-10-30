import { useEffect, useState } from 'react';
import { platformService } from '../services/api';

export default function SuperAdminStores({ organizations, brands, onOpenStore }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadStores = async () => {
    setError('');
    const nextStores = await platformService.get('/stores');
    setStores(nextStores);
    return nextStores;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    platformService.get('/stores')
      .then(nextStores => {
        if (active) {
          setStores(nextStores);
          setError('');
        }
      })
      .catch(loadError => {
        if (active) setError(loadError.error || 'Could not load stores.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizations, reloadKey]);

  return (
    <div className="page-container super-admin-stores">
      <div className="section-header">
        <div>
          <h1 className="section-title">Stores</h1>
          <p className="section-subtitle">Select a store to manage its menu and tablet login.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Create store
        </button>
      </div>

      {loading ? (
        <p role="status">Loading stores…</p>
      ) : error ? (
        <div className="ledger-card" role="alert">
          <h2>Could not load stores</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
        </div>
      ) : stores.length ? (
        <div className="store-card-grid" aria-label="All stores">
          {stores.map(store => (
            <button
              type="button"
              className="store-card"
              key={store.id}
              onClick={() => onOpenStore(store)}
            >
              <span className="store-card-heading">
                <span className="store-card-title">{store.name}</span>
                <span className={`store-card-status ${store.status === 'active' ? 'is-active' : ''}`}>{store.status}</span>
              </span>
              <span className="store-card-owner">{store.ownerName}</span>
              <span className="store-card-id">Tablet Store ID <strong>{store.loginCode}</strong></span>
              <span className="store-card-brands">{store.assignments.length
                ? store.assignments.map(assignment => assignment.brand.name).join(', ')
                : 'No menu assigned'}</span>
              <span className="store-card-open">Manage store <span aria-hidden="true">→</span></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="ledger-card">
          <h2>No stores found</h2>
          <p>Create a store to set up its menu and tablet login.</p>
        </div>
      )}

      {createOpen && (
        <CreateStoreDialog
          organizations={organizations}
          brands={brands}
          onCancel={() => setCreateOpen(false)}
          onCreated={async store => {
            const nextStores = await loadStores();
            setCreateOpen(false);
            const created = nextStores.find(item => item.id === store.id) || store;
            onOpenStore(created);
          }}
        />
      )}
    </div>
  );
}

function CreateStoreDialog({ organizations, brands, onCancel, onCreated }) {
  const [values, setValues] = useState({
    orgId: organizations[0]?.id || '',
    brandId: brands.find(brand => brand.orgId === organizations[0]?.id)?.id || '',
    name: '',
    slug: '',
    loginCode: '',
    password: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdStore, setCreatedStore] = useState(null);

  const submit = async event => {
    event.preventDefault();
    if (busy || createdStore) return;
    setBusy(true);
    setError('');
    let store;
    try {
      store = await platformService.post(`/orgs/${values.orgId}/stores`, {
        name: values.name,
        slug: values.slug,
        loginCode: values.loginCode,
        password: values.password
      });
    } catch (submitError) {
      setError(submitError.error || 'Could not create store.');
      setBusy(false);
      return;
    }

    setCreatedStore(store);
    try {
      if (values.brandId) {
        await platformService.post(`/orgs/${values.orgId}/brand-assignments`, {
          storeId: store.id,
          brandId: values.brandId
        });
      }
      await onCreated({ ...store, assignments: [] });
    } catch (submitError) {
      setError(values.brandId
        ? `Store created, but its menu assignment failed: ${submitError.error || 'Assign a brand from the store page.'}`
        : `Store created, but it could not be opened: ${submitError.error || 'Try again.'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <section className="ledger-card store-dialog" role="dialog" aria-modal="true" aria-labelledby="create-store-title">
        <h2 id="create-store-title">Create store</h2>
        {createdStore && (
          <div className="store-created-notice" role="alert">
            {error && <p>{error}</p>}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => {
              setBusy(true);
              try {
                await onCreated(createdStore);
              } catch (openError) {
                setError(`Store was created, but the list could not be refreshed: ${openError.error || 'Try again.'}`);
              } finally {
                setBusy(false);
              }
            }}>Open created store</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>Close</button>
          </div>
        )}
        {!createdStore && <>
        {organizations.length === 0 ? (
          <>
            <p>Create an owner organization and brand in Brands before adding a store.</p>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Close</button>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="data-error" role="alert">{error}</p>}
            <label>Owner
              <select required value={values.orgId} onChange={event => {
                const orgId = event.target.value;
                setValues({
                  ...values,
                  orgId,
                  brandId: brands.find(brand => brand.orgId === orgId)?.id || ''
                });
              }}>
                {organizations.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
              </select>
            </label>
            <label>Menu brand
              <select value={values.brandId} onChange={event => setValues({ ...values, brandId: event.target.value })}>
                <option value="">Assign later</option>
                {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <label>Store name
              <input required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} />
            </label>
            <label>Store code
              <input required value={values.slug} onChange={event => setValues({ ...values, slug: event.target.value })} />
            </label>
            <label>Tablet Store ID
              <input required value={values.loginCode} onChange={event => setValues({ ...values, loginCode: event.target.value })} />
            </label>
            <label>Tablet password (at least 6 characters)
              <input required type="password" minLength={6} value={values.password} onChange={event => setValues({ ...values, password: event.target.value })} />
            </label>
            <p>Save the password securely. It cannot be viewed again.</p>
            <div className="store-actions">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create store'}</button>
            </div>
          </form>
        )}
        </>}
      </section>
    </div>
  );
}
