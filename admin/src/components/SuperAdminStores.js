import { useEffect, useState } from 'react';
import { platformService } from '../services/api';
import { MapPinIcon, PlusIcon, TrashIcon } from './Icons';

export default function SuperAdminStores({ brands, brandFilter = '', brandFilterName = '', onClearBrandFilter, onOpenStore }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingStoreId, setDeletingStoreId] = useState('');
  const [storeActionError, setStoreActionError] = useState('');
  const [storeActionMessage, setStoreActionMessage] = useState('');
  const visibleStores = stores.filter(store => !brandFilter || (store.assignments || []).some(assignment => assignment.brand.id === brandFilter));

  const loadStores = async () => {
    setError('');
    const nextStores = await platformService.get('/stores');
    setStores(nextStores);
    return nextStores;
  };

  const deleteStore = async store => {
    if (!window.confirm(`Permanently delete "${store.name}" and sign out its tablets? Stores with published menu history cannot be deleted.`)) return;
    setDeletingStoreId(store.id);
    setStoreActionError('');
    setStoreActionMessage('');
    try {
      await platformService.remove(`/orgs/${store.orgId}/stores/${store.id}`);
      setStores(current => current.filter(item => item.id !== store.id));
      setStoreActionMessage(`${store.name} was deleted.`);
    } catch (deleteError) {
      setStoreActionError(deleteError.error || deleteError.message || `Could not delete ${store.name}.`);
    } finally {
      setDeletingStoreId('');
    }
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
  }, [reloadKey]);

  return (
    <div className="page-container super-admin-stores">
      <div className="section-header">
        <div>
          <h1 className="section-title">Store management</h1>
          <p className="section-subtitle">{brandFilter
            ? `Stores assigned to ${brandFilterName || 'this brand'}.`
            : 'Select a store card to manage its menu, devices, and tablet login.'}</p>
        </div>
        <div className="store-directory-actions">
          {brandFilter && <button type="button" className="btn btn-ghost btn-sm" onClick={onClearBrandFilter}>Clear brand filter</button>}
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><PlusIcon /><span>Create store</span></button>
        </div>
      </div>
      {storeActionError && <p role="alert">{storeActionError}</p>}
      {storeActionMessage && <p role="status">{storeActionMessage}</p>}

      {loading ? (
        <p role="status">Loading stores…</p>
      ) : error ? (
        <div className="ledger-card" role="alert">
          <h2>Could not load stores</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
        </div>
      ) : visibleStores.length ? (
        <div className="store-card-grid" aria-label={brandFilter ? `${brandFilterName || 'Brand'} stores` : 'All stores'}>
          {visibleStores.map(store => {
            const matchingAssignment = (store.assignments || []).find(assignment => assignment.brand.id === brandFilter && assignment.status === 'active')
              || (store.assignments || []).find(assignment => assignment.brand.id === brandFilter);
            return (
            <article className="store-card" key={store.id}>
              <button
                type="button"
                className="store-card-main"
                onClick={() => onOpenStore(store, matchingAssignment)}
                aria-label={`Manage ${store.name}`}
              >
                <span className="store-card-heading">
                  <span className="store-card-title">{store.name}</span>
                  <span className={`store-card-status ${store.status === 'active' ? 'is-active' : ''}`}>{store.status}</span>
                </span>
                <span className="store-card-id">Tablet Store ID <strong>{store.loginCode}</strong></span>
                <span className="store-card-address"><MapPinIcon size={15} /><span>{store.address || 'Address not set'}</span></span>
                <span className="store-card-brands">{store.assignments?.length
                  ? store.assignments.map(assignment => assignment.brand.name).join(', ')
                  : 'No menu assigned'}</span>
                <span className="store-card-open">Manage store <span aria-hidden="true">→</span></span>
              </button>
              <div className="store-card-footer">
                <button
                  type="button"
                  className="icon-danger-button store-card-delete"
                  aria-label={`Delete ${store.name}`}
                  title={`Delete ${store.name}`}
                  onClick={() => deleteStore(store)}
                  disabled={Boolean(deletingStoreId)}
                >
                  {deletingStoreId === store.id ? 'Deleting…' : <TrashIcon />}
                </button>
              </div>
            </article>
          );})}
        </div>
      ) : (
        <div className="ledger-card">
          <h2>{brandFilter ? 'No stores assigned to this brand' : 'No stores found'}</h2>
          <p>{brandFilter ? 'Assign this brand to a store to see it here.' : 'Create a store to set up its menu and tablet login.'}</p>
          {brandFilter && <button type="button" className="btn btn-ghost" onClick={onClearBrandFilter}>Show all stores</button>}
        </div>
      )}

      {createOpen && (
        <CreateStoreDialog
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

function CreateStoreDialog({ brands, onCancel, onCreated }) {
  const [values, setValues] = useState({
    brandId: brands[0]?.id || '',
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
    const selectedBrand = brands.find(brand => brand.id === values.brandId);
    if (!selectedBrand) {
      setError('Add a brand in Brand management before creating a store.');
      setBusy(false);
      return;
    }
    let store;
    try {
      store = await platformService.post(`/orgs/${selectedBrand.orgId}/stores`, {
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
      await platformService.post(`/orgs/${selectedBrand.orgId}/brand-assignments`, {
        storeId: store.id,
        brandId: selectedBrand.id
      });
      await onCreated({ ...store, assignments: [] });
    } catch (submitError) {
      setError(`Store created, but its menu assignment failed: ${submitError.error || 'Assign a brand from the store page.'}`);
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
        {brands.length === 0 ? (
          <>
            <p>Add a brand in Brand management before adding a store.</p>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Close</button>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="data-error" role="alert">{error}</p>}
            <label>Brand
              <select required value={values.brandId} onChange={event => setValues({ ...values, brandId: event.target.value })}>
                {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name} ({brand.slug})</option>)}
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
