import { PlusIcon, ArrowRightIcon } from './Icons';

const Analytics = ({ onAddProduct, onNavigateProducts }) => {
  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Sales & Revenue Ledger</h2>
          <p className="section-subtitle">Transaction histories, order volumes, and kiosk receipts</p>
        </div>
      </div>

      <div className="editorial-empty-state">
        <div className="empty-state-badge">
          <span>Awaiting Initial Orders</span>
        </div>

        <h3>No sales data yet — start by publishing your first product</h3>

        <p>
          Real-time transaction ledgers, average order value, and visitor analytics activate
          automatically once online ordering or point-of-sale customer receipts are recorded.
          Prepare your bakehouse by finalizing your catalog items below.
        </p>

        <div className="empty-state-steps">
          <div className="empty-step">
            <span className="step-number">01</span>
            <span className="step-text"><strong>Curate Catalog</strong><br />Add artisan chocolates, pastries, and signature drinks.</span>
          </div>
          <div className="empty-step">
            <span className="step-number">02</span>
            <span className="step-text"><strong>Configure Menu</strong><br />Organize category ordering and seasonal item availability.</span>
          </div>
          <div className="empty-step">
            <span className="step-number">03</span>
            <span className="step-text"><strong>Sync Tablet Kiosk</strong><br />Tablets reflect active catalog changes automatically.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {onAddProduct && (
            <button className="btn btn-primary" onClick={onAddProduct}>
              <PlusIcon />
              <span>Publish Product</span>
            </button>
          )}
          {onNavigateProducts && (
            <button className="btn btn-ghost" onClick={onNavigateProducts}>
              <span>View Product Catalog</span>
              <ArrowRightIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
