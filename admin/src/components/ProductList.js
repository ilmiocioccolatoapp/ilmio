import React, { useState, useEffect } from 'react';
import { productService, categoryService } from '../services/api';

const ProductList = ({ onEdit, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [refreshTrigger]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleToggle = async (id) => {
    try {
      await productService.toggleAvailability(id);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to toggle availability');
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    if (filter === 'available') return product.available;
    if (filter === 'unavailable') return !product.available;
    // Compare by category name (products store category as string name)
    return product.category === filter;
  });

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="product-list-container">
      <div className="section-header">
        <h2 className="section-title">Product Management ({filteredProducts.length})</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="filter-controls">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Products</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat.name}>
                  {cat.icon} {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => onEdit(null)}>
            + Add Product
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>No products found</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product => (
            <div key={product._id} className={`product-card ${!product.available ? 'unavailable' : ''}`}>
              <div className="product-image">
                <img src={product.image} alt={product.title} />
                <div className={`availability-badge ${product.available ? 'available' : 'unavailable'}`}>
                  {product.available ? '✓ Available' : '✕ Unavailable'}
                </div>
              </div>

              <div className="product-content">
                <div className="product-header">
                  <h3>{product.title}</h3>
                  <span className="category-badge">{product.category}</span>
                </div>

                <p className="product-description">
                  {product.description.length > 80 
                    ? product.description.substring(0, 80) + '...' 
                    : product.description}
                </p>
                
                <div className="product-details">
                  <p className="ingredients">
                    <strong>Ingredients:</strong> {product.ingredients.substring(0, 50)}...
                  </p>
                  <p className="price">{product.price}</p>
                </div>

                <div className="product-actions">
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => handleToggle(product._id)}
                    title="Toggle availability"
                  >
                    {product.available ? '⏸️' : '▶️'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onEdit(product)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(product._id, product.title)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
