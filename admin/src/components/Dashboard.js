import { useCatalog } from '../data/CatalogContext';
import { CatalogTotalIcon, AvailableCheckIcon, SuspendedIcon, PlusIcon, ArrowRightIcon, CategoriesIcon, CheckIcon } from './Icons';

const Dashboard = ({ onAddProduct, onNavigate }) => {
  const { products, categories, productsLoading, categoriesLoading, productsError, categoriesError,
    refreshProducts, refreshCategories } = useCatalog();
  const unavailable = products.filter(product => !product.available).length;
  const total = products.length;
  const available = total - unavailable;
  const categoryCounts = products.reduce((counts, product) => {
    const id = product.category || 'uncategorized';
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
  const rows = categories.map(category => ({ ...category, count: categoryCounts[category.id] || 0 }));
  // Keep products with an unregistered category visible in the overview too.
  Object.entries(categoryCounts).forEach(([id, count]) => {
    if (!rows.some(category => category.id === id)) rows.push({ id, name: id, count });
  });
  const maxCount = Math.max(1, ...rows.map(category => category.count));
  const loading = productsLoading || categoriesLoading;
  const loadFailed = productsError || categoriesError;
  const cards = [
    { label: 'Total products', count: total, detail: 'Products in your catalog', Icon: CatalogTotalIcon, tone: '' },
    { label: 'Ready for service', count: available, detail: 'Available on the kiosk and menu', Icon: AvailableCheckIcon, tone: 'success' },
    { label: 'Unavailable', count: unavailable, detail: 'Hidden from customer ordering', Icon: SuspendedIcon, tone: unavailable ? 'alert' : '' }
  ];

  return (
    <div className="page-container overview">
      <div className="section-header overview-heading">
        <div>
          <div className="eyebrow">Your workspace</div>
          <h1 className="section-title">Good to see you.</h1>
          <p className="section-subtitle">Here’s an overview of your product catalog.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddProduct}><PlusIcon /><span>Add product</span></button>
      </div>

      {loadFailed && <div role="alert" className="data-error">
        Some catalog data could not be refreshed.
        <button className="btn btn-ghost btn-sm" onClick={() => Promise.allSettled([refreshProducts(), refreshCategories()])}>Retry</button>
      </div>}
      <div className="stats-grid" aria-busy={productsLoading}>
        {cards.map(({ label, count, detail, Icon, tone }) => (
          <section className="stat-card" key={label} aria-label={label}>
            <div className="stat-header"><h2 className="stat-label">{label}</h2><span className={`stat-icon ${tone}`}><Icon size={20} /></span></div>
            <div className={`stat-value ${tone}`}>{productsLoading || (productsError && total === 0) ? '—' : count}</div>
            <p className="stat-detail">{detail}</p>
          </section>
        ))}
      </div>

      <div className="overview-layout">
        <section className="dashboard-panel">
          <div className="panel-header">
            <div><h2>Products by category</h2><p>A quick look at your catalog</p></div>
            <button className="text-link" onClick={() => onNavigate('categories')}>Manage categories <ArrowRightIcon /></button>
          </div>
          {loading ? <p role="status" className="panel-placeholder">Loading your categories…</p> : rows.length === 0 ? (
            <div className="panel-placeholder"><p>No categories to show yet.</p><button className="text-link" onClick={() => onNavigate('categories')}>Add your first category <ArrowRightIcon /></button></div>
          ) : (
            <div className="category-summary">
              {rows.map(category => (
                <div className="category-row" key={category.id}>
                  <span className="category-symbol" aria-hidden="true">{category.icon || <CategoriesIcon size={18} />}</span>
                  <div className="category-summary-name">{category.name}<small>{category.count} {category.count === 1 ? 'product' : 'products'}</small></div>
                  <span className="category-bar" aria-hidden="true"><i style={{ width: `${category.count / maxCount * 100}%` }} /></span>
                  <span className="category-summary-count">{category.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel availability-panel">
          <div className="panel-header">
            <div><h2>Availability</h2><p>Keep your customer menu up to date</p></div>
            {!productsLoading && !productsError && total > 0 && <span className={`availability-badge ${unavailable ? 'attention' : ''}`}><i />{unavailable ? `${unavailable} unavailable` : 'All available'}</span>}
          </div>
          {productsLoading ? <p role="status" className="panel-placeholder">Checking product availability…</p> : productsError && total === 0 ? (
            <p className="panel-placeholder">Availability is temporarily unavailable.</p>
          ) : (
            <div className={`availability-summary ${unavailable ? 'attention' : ''}`}>
              <span className="availability-icon" aria-hidden="true">{unavailable ? <SuspendedIcon size={18} /> : total ? <CheckIcon size={18} /> : <CatalogTotalIcon size={18} />}</span>
              <div>
                <h3>{unavailable ? 'Some products are unavailable' : total ? 'Everything is ready for service' : 'Your catalog is ready to begin'}</h3>
                <p>{unavailable ? `${unavailable} ${unavailable === 1 ? 'product is' : 'products are'} hidden from the customer menu. Manage products to update availability.` : total ? 'There are no unavailable products in your catalog.' : 'Add your first product to start building your customer menu.'}</p>
              </div>
            </div>
          )}
          <div className="quick-actions">
            <h3 className="eyebrow">Quick actions</h3>
            <button onClick={() => onNavigate('products')}>Manage products <ArrowRightIcon /></button>
            <button onClick={() => onNavigate('categories')}>Organize categories <ArrowRightIcon /></button>
            <button onClick={() => onNavigate('settings')}>View settings <ArrowRightIcon /></button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
