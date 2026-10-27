import { useState, useEffect } from 'react';
import { productService, categoryService } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PauseCircleIcon,
  PlayCircleIcon
} from './Icons';

const ProductList = ({ onEdit, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [productsResponse, categoriesData] = await Promise.all([
          productService.getAllProducts(),
          categoryService.getAllCategories()
        ]);
        if (cancelled) return;
        setProducts(productsResponse.data || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!cancelled) alert('Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the catalog? This action will remove it from the tablet menu.`)) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      const response = await productService.getAllProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleToggle = async (id) => {
    try {
      await productService.toggleAvailability(id);
      const response = await productService.getAllProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to toggle availability');
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    if (filter === 'available') return product.available;
    if (filter === 'unavailable') return !product.available;
    const cat = product.category?.toLowerCase() || '';
    return cat === filter.toLowerCase();
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Product Catalog</h2>
            <p className="section-subtitle">Loading catalog registry...</p>
          </div>
        </div>
        <p style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>Reading product data from database...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Product Catalog ({filteredProducts.length})</h2>
          <p className="section-subtitle">Manage artisan recipes, pricing, and live kiosk availability</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-controls">
            <select
              className="select-ledger"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter products by category or availability"
            >
              <option value="all">All Items ({products.length})</option>
              <option value="available">Available for Service</option>
              <option value="unavailable">Suspended / Out of Stock</option>
              {categories.length === 0 ? (
                <option disabled value="">No categories found</option>
              ) : (
                <optgroup label="Categories">
                  {categories.map(cat => {
                    const value = cat.id || cat.name;
                    const label = (cat.name || cat.id || '').toUpperCase();
                    return (
                      <option key={cat._id || cat.id} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => onEdit(null)}>
            <PlusIcon />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="editorial-empty-state" style={{ margin: '40px auto' }}>
          <h3>No products match this ledger filter</h3>
          <p>
            {filter === 'all'
              ? 'Your bakery ledger is currently empty. Start by cataloging your first artisan creation.'
              : `No items found under "${filter}". Try selecting another category or clear the filter.`}
          </p>
          <button className="btn btn-primary" onClick={() => { setFilter('all'); onEdit(null); }}>
            <PlusIcon />
            <span>Publish New Product</span>
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product => {
            const productId = product._id || product.dbId || product.id;
            return (
              <article key={productId} className={`product-card ${!product.available ? 'unavailable' : ''}`}>
                <div className="product-image">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80'}
                    alt={product.title}
                    loading="lazy"
                  />
                  <div className={`status-indicator ${product.available ? 'available' : 'unavailable'}`}>
                    <span className="status-dot"></span>
                    <span>{product.available ? 'Available' : 'Suspended'}</span>
                  </div>
                </div>

                <div className="product-content">
                  <div className="product-header">
                    <h3>{product.title}</h3>
                    <span className="category-tag">{product.category}</span>
                  </div>

                  <p className="product-description">
                    {product.description}
                  </p>

                  {product.ingredients && (
                    <p className="ingredients-note">
                      {product.ingredients}
                    </p>
                  )}

                  <div className="product-price">
                    {product.price}
                  </div>

                  <div className="product-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleToggle(productId)}
                      title={product.available ? 'Suspend from menu' : 'Make available for service'}
                    >
                      {product.available ? <PauseCircleIcon /> : <PlayCircleIcon />}
                      <span>{product.available ? 'Suspend' : 'Resume'}</span>
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => onEdit(product)}
                      title="Edit product details"
                    >
                      <PencilIcon />
                      <span>Edit</span>
                    </button>
                    <button
                      className="btn btn-sm btn-ghost-danger"
                      onClick={() => handleDelete(productId, product.title)}
                      title="Delete from catalog"
                    >
                      <TrashIcon />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductList;
