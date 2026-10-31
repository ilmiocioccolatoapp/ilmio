import { useEffect, useState } from 'react';
import { platformService } from '../services/api';
import ProductList from './ProductList';
import Categories from './Categories';
import StoreMenu from './StoreMenu';

const sections = [
  ['menu', 'Menu'],
  ['categories', 'Categories'],
  ['devices', 'Device management'],
  ['tablet', 'Tablet login']
];
const onlineWindowMs = 10 * 60 * 1000;

export default function SuperAdminStoreWorkspace({
  store,
  brands,
  assignments,
  onStoreUpdated,
  onBack,
  onEditProduct
}) {
  const [section, setSection] = useState('menu');
  const [menuView, setMenuView] = useState('items');
  const [brandId, setBrandId] = useState(
    store.assignments.find(assignment => assignment.status === 'active')?.brand.id || ''
  );
  const [password, setPassword] = useState('');
  const [storeId, setStoreId] = useState(store.loginCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState('');
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [devicesRefreshKey, setDevicesRefreshKey] = useState(0);

  useEffect(() => () => {
    if (qr) URL.revokeObjectURL(qr);
  }, [qr]);

  useEffect(() => {
    if (section !== 'devices') return undefined;
    let active = true;
    setDevicesLoading(true);
    setDevicesError('');
    platformService.get(`/orgs/${store.orgId}/stores/${store.id}/sessions`)
      .then(result => { if (active) setDevices(result); })
      .catch(error => { if (active) setDevicesError(error.error || error.message || 'Could not load devices.'); })
      .finally(() => { if (active) setDevicesLoading(false); });
    return () => { active = false; };
  }, [section, store.orgId, store.id, devicesRefreshKey]);

  const availableAssignments = store.assignments.filter(assignment => assignment.status === 'active');
  const selectedBrand = brands.find(brand => brand.id === brandId);
  const hasActiveAssignment = availableAssignments.some(assignment => assignment.brand.id === brandId);
  const run = async action => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error.error || error.message || 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };
  const refreshStore = async () => {
    const stores = await platformService.get(`/orgs/${store.orgId}/stores`);
    const updated = stores.find(item => item.id === store.id);
    if (updated) onStoreUpdated({ ...updated, ownerName: store.ownerName });
  };
  const assignBrand = event => {
    event.preventDefault();
    if (!brandId) return;
    run(async () => {
      await platformService.post(`/orgs/${store.orgId}/brand-assignments`, {
        storeId: store.id,
        brandId
      });
      await refreshStore();
      setMessage('Brand menu assigned to this store.');
    });
  };
  const saveStoreId = event => {
    event.preventDefault();
    run(async () => {
      const updated = await platformService.put(`/orgs/${store.orgId}/stores/${store.id}`, { loginCode: storeId });
      const loginCode = updated?.loginCode || storeId;
      setStoreId(loginCode);
      onStoreUpdated({ ...store, ...updated, loginCode, ownerName: store.ownerName });
      setMessage('Tablet Store ID updated.');
    });
  };
  const resetPassword = event => {
    event.preventDefault();
    run(async () => {
      await platformService.post(`/orgs/${store.orgId}/stores/${store.id}/password`, {
        newPassword: password
      });
      setPassword('');
      onStoreUpdated({ ...store, passwordConfigured: true });
      setMessage('Tablet password saved. Existing tablet sessions were signed out.');
    });
  };
  const deviceIsOnline = device => !device.revokedAt
    && new Date(device.expiresAt).getTime() > Date.now()
    && Date.now() - new Date(device.lastSeenAt).getTime() < onlineWindowMs;
  const revokeDevice = device => run(async () => {
    await platformService.post(`/orgs/${store.orgId}/stores/${store.id}/sessions/${device.id}/revoke`, {});
    setDevicesRefreshKey(key => key + 1);
    setMessage('Device signed out.');
  });
  const revokeAllDevices = () => {
    if (!window.confirm(`Sign out every tablet at ${store.name}?`)) return;
    run(async () => {
      await platformService.post(`/orgs/${store.orgId}/stores/${store.id}/revoke-devices`, {});
      setDevicesRefreshKey(key => key + 1);
      setMessage('All tablets signed out.');
    });
  };

  return (
    <div className="page-container super-admin-store">
      <button className="btn btn-ghost branch-back" onClick={onBack}>← All stores</button>
      <div className="store-detail-heading">
        <div>
          <h1 className="section-title">{store.name}</h1>
          <p>Store ID: <strong>{store.loginCode}</strong></p>
        </div>
        <span className="branch-card-status">{store.status}</span>
      </div>

      <nav className="store-workspace-tabs" aria-label="Store management">
        {sections.map(([id, label]) => (
          <button
            type="button"
            className={section === id ? 'active' : ''}
            key={id}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && <p role="status">{message}</p>}

      {section === 'menu' && (
        <section>
          {availableAssignments.length > 1 && (
            <label className="store-brand-select">Brand menu
              <select value={brandId} onChange={event => {
                setBrandId(event.target.value);
                setMenuView('items');
              }}>
                {availableAssignments.map(assignment => (
                  <option key={assignment.id} value={assignment.brand.id}>{assignment.brand.name}</option>
                ))}
              </select>
            </label>
          )}
          {!selectedBrand || !hasActiveAssignment ? (
            <div className="ledger-card">
              <h2>Assign a brand menu</h2>
              <p>Choose which brand catalog this store should use.</p>
              {brands.length ? (
                <form className="store-assignment-form" onSubmit={assignBrand}>
                  <label>Brand
                    <select required value={brandId} onChange={event => setBrandId(event.target.value)}>
                      <option value="">Select a brand</option>
                      {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-primary" disabled={busy || !brandId}>Assign menu</button>
                </form>
              ) : <p>Create a brand in Brand management before assigning a menu.</p>}
            </div>
          ) : (
            <>
              <p className="management-help">
                Menu items and categories are shared by this brand’s stores. Prices, availability, and publishing below are specific to {store.name}.
              </p>
              <div className="store-workspace-tabs store-menu-tabs" aria-label="Menu tools">
                <button type="button" className={menuView === 'items' ? 'active' : ''} onClick={() => setMenuView('items')}>Menu items</button>
                <button type="button" className={menuView === 'branch' ? 'active' : ''} onClick={() => setMenuView('branch')}>Store availability & publishing</button>
              </div>
              {menuView === 'items'
                ? <ProductList onEdit={onEditProduct} />
                : <StoreMenu
                    key={`${store.id}:${brandId}`}
                    brand={selectedBrand}
                    storeId={store.id}
                    assignments={assignments}
                    onSelectStore={() => {}}
                    branchScoped
                    onBack={() => setMenuView('items')}
                  />}
            </>
          )}
        </section>
      )}

      {section === 'categories' && (
        <section>
          {selectedBrand ? (
            <>
              <p className="management-help">Categories belong to the selected brand and are shared by its stores.</p>
              <Categories />
            </>
          ) : (
            <div className="ledger-card"><p>Assign a brand menu to manage its categories.</p></div>
          )}
        </section>
      )}

      {section === 'devices' && (
        <section className="device-management-panel">
          <div className="dashboard-section-heading">
            <div>
              <h2>Devices for {store.name}</h2>
              <p>Online means the tablet checked in within the last 10 minutes.</p>
            </div>
            <div className="store-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={devicesLoading} onClick={() => setDevicesRefreshKey(key => key + 1)}>Refresh</button>
              <button type="button" className="btn btn-ghost-danger btn-sm" disabled={busy || !devices.some(deviceIsOnline)} onClick={revokeAllDevices}>Sign out all devices</button>
            </div>
          </div>
          {devicesLoading ? <p role="status">Loading devices…</p>
            : devicesError ? <p role="alert">{devicesError}</p>
              : devices.length ? (
                <div className="dashboard-device-list">
                  {devices.map(device => {
                    const online = deviceIsOnline(device);
                    return (
                      <article className="dashboard-device-card" key={device.id}>
                        <span className={`dashboard-device-indicator ${online ? 'is-online' : 'is-offline'}`} aria-label={online ? 'Online' : 'Offline'} />
                        <div className="dashboard-device-details">
                          <strong>{device.deviceLabel || 'Store tablet'}</strong>
                          <span>{device.revokedAt ? 'Signed out' : online ? 'Online' : 'Offline'}</span>
                          <small>Last check-in {new Date(device.lastSeenAt).toLocaleString()}</small>
                        </div>
                        <button type="button" className="btn btn-ghost-danger btn-sm" disabled={busy || Boolean(device.revokedAt)} onClick={() => revokeDevice(device)}>
                          Sign out device
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : <div className="ledger-card dashboard-empty"><p>No tablet devices have signed in to this store.</p></div>}
        </section>
      )}

      {section === 'tablet' && (
        <section className="tablet-login-panel">
          <div className="ledger-card">
            <h2>Tablet login details</h2>
            <p>Share these details with the store. Passwords are hidden after they are set.</p>
            <p>Store name: <strong>{store.name}</strong></p>
            <p>Password: <strong>{store.passwordConfigured ? 'Set — hidden for security' : 'Not set'}</strong></p>
            <form className="store-id-form" onSubmit={saveStoreId}>
              <label>Tablet Store ID
                <input required value={storeId} onChange={event => setStoreId(event.target.value)} />
              </label>
              <button className="btn btn-ghost" disabled={busy || !storeId.trim() || storeId === store.loginCode}>Save Store ID</button>
            </form>
            <form className="store-password-form" onSubmit={resetPassword}>
              <label>{store.passwordConfigured ? 'Reset tablet password' : 'Set tablet password'}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>
              <button className="btn btn-primary" disabled={busy || password.length < 6}>
                {store.passwordConfigured ? 'Save new password' : 'Set password'}
              </button>
            </form>
            <div className="store-actions">
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => run(async () => setQr(await platformService.qr(`/orgs/${store.orgId}/stores/${store.id}`)))}
              >
                Show tablet login QR
              </button>
            </div>
            {qr && <div className="store-login-qr">
              <img src={qr} alt={`${store.name} tablet login QR`} width="240" />
              <a href={qr} download={`${store.loginCode}-login.png`}>Download QR</a>
              <button className="btn btn-ghost" onClick={() => { URL.revokeObjectURL(qr); setQr(''); }}>Close</button>
            </div>}
          </div>
        </section>
      )}
    </div>
  );
}
