import { useCatalog } from '../data/CatalogContext';
import {
  CatalogTotalIcon,
  AvailableCheckIcon,
  SuspendedIcon,
  PlusIcon
} from './Icons';

const Dashboard = ({ onAddProduct }) => {
  const { products, productsLoading: loading, productsError, refreshProducts } = useCatalog();
  const stats = { total: products.length, available: 0, unavailable: 0, byCategory: {} };
  products.forEach(product => {
    if (product.available) stats.available++;
    const category = product.category || 'uncategorized';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
  });
  stats.unavailable = stats.total - stats.available;

  if (loading) {
    return (
      <div className="page-container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Operational Ledger</h2>
            <p className="section-subtitle">Catalog availability and service status</p>
          </div>
        </div>
        <p style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>Loading ledger summary...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Operational Ledger</h2>
          <p className="section-subtitle">Real-time product availability and kiosk inventory metrics</p>
        </div>
        {onAddProduct && (
          <button className="btn btn-primary" onClick={onAddProduct}>
            <PlusIcon />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {productsError && <div role="alert" className="data-error">
        Could not refresh products. <button className="btn btn-ghost btn-sm" onClick={() => refreshProducts().catch(() => {})}>Retry</button>
      </div>}
      <div className="stats-grid">
        {/* Total Products KPI */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Catalog</span>
            <div className="stat-icon">
              <CatalogTotalIcon />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-detail">
            Curated artisan items in database
          </div>
        </div>

        {/* Available Products KPI */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Ready for Service</span>
            <div className="stat-icon success">
              <AvailableCheckIcon />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.available}</div>
          <div className="stat-detail">
            Active on tablet kiosk slideshow & menu
          </div>
        </div>

        {/* Unavailable Products KPI */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Suspended / Out of Stock</span>
            <div className="stat-icon alert">
              <SuspendedIcon />
            </div>
          </div>
          <div className="stat-value" style={{ color: stats.unavailable > 0 ? 'var(--alert)' : 'var(--ink-muted)' }}>
            {stats.unavailable}
          </div>
          <div className="stat-detail">
            Hidden from customer ordering
          </div>
        </div>
      </div>

      {/* Operational Categories Breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div style={{ marginTop: '36px' }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--primary-ink)',
            marginBottom: '16px'
          }}>
            Inventory by Category
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <div
                key={cat}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}
              >
                <span style={{
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  color: 'var(--primary-ink)',
                  fontSize: '0.92rem'
                }}>
                  {cat}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--accent)'
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
