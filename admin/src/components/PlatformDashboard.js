import { useCallback, useEffect, useState } from 'react';
import { platformService } from '../services/api';

export default function PlatformDashboard({ initialDashboard, onOpenStore }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialDashboard);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setDashboard(await platformService.get('/dashboard'));
      setError('');
    } catch (loadError) {
      setError(loadError.error || loadError.message || 'Could not load device status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDashboard) {
      setDashboard(initialDashboard);
      setLoading(false);
    } else {
      load(true);
    }
    const timer = window.setInterval(() => load(), 60_000);
    return () => window.clearInterval(timer);
  }, [initialDashboard, load]);

  const stores = dashboard?.stores || [];
  const onlineDevices = stores.flatMap(store => store.devices.map(device => ({ ...device, store })));
  const offlineStores = stores.filter(store => store.status === 'active' && store.devices.length === 0);

  return (
    <div className="page-container platform-dashboard">
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Live store and tablet status. Devices check in through the menu app.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => load(true)} disabled={loading}>Refresh</button>
      </div>

      {error && <div className="ledger-card" role="alert"><p>{error}</p></div>}
      {loading && !dashboard ? <p role="status">Loading dashboard…</p> : dashboard && (
        <>
          <div className="dashboard-stat-grid">
            <article className="ledger-card dashboard-stat">
              <span>Stores</span>
              <strong>{stores.length}</strong>
            </article>
            <article className="ledger-card dashboard-stat">
              <span>Devices online</span>
              <strong>{onlineDevices.length}</strong>
            </article>
            <article className="ledger-card dashboard-stat">
              <span>Stores offline</span>
              <strong>{offlineStores.length}</strong>
            </article>
          </div>

          <section className="dashboard-device-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Online devices</h2>
                <p>Checked in during the last {dashboard.onlineWindowMinutes} minutes.</p>
              </div>
              <span className="dashboard-count">{onlineDevices.length}</span>
            </div>
            {onlineDevices.length ? (
              <div className="dashboard-device-list">
                {onlineDevices.map(({ id, deviceLabel, lastSeenAt, store }) => (
                  <article className="dashboard-device-card" key={id}>
                    <span className="dashboard-device-indicator is-online" aria-label="Online" />
                    <div className="dashboard-device-details">
                      <strong>{deviceLabel || 'Store tablet'}</strong>
                      <span>{store.name}</span>
                      <small>Last check-in {new Date(lastSeenAt).toLocaleString()}</small>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenStore(store)}>
                      Open store
                    </button>
                  </article>
                ))}
              </div>
            ) : <div className="ledger-card dashboard-empty"><p>No devices are online right now.</p></div>}
          </section>

          <section className="dashboard-device-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Offline stores</h2>
                <p>Active stores without a recent tablet check-in.</p>
              </div>
              <span className="dashboard-count">{offlineStores.length}</span>
            </div>
            {offlineStores.length ? (
              <div className="dashboard-offline-grid">
                {offlineStores.map(store => (
                  <button type="button" className="dashboard-offline-card" key={store.id} onClick={() => onOpenStore(store)}>
                    <span className="dashboard-device-indicator is-offline" aria-label="Offline" />
                    <span><strong>{store.name}</strong></span>
                    <span className="dashboard-card-action">Manage store →</span>
                  </button>
                ))}
              </div>
            ) : <div className="ledger-card dashboard-empty"><p>All active stores have a recent device check-in.</p></div>}
          </section>
          <p className="dashboard-updated">Updated {new Date(dashboard.asOf).toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
}
