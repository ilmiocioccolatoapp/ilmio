import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '📦',
    order: 0
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      id: '',
      name: '',
      icon: '📦',
      order: categories.length + 1
    });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon,
      order: category.order
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await categoryService.deleteCategory(category.id);
      alert('Category deleted successfully!');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.error || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
        alert('Category updated successfully!');
      } else {
        await categoryService.createCategory(formData);
        alert('Category created successfully!');
      }
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.error || 'Failed to save category');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="section-header">
          <h2 className="section-title">Category Management</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <h2 className="section-title">Category Management</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          <span>➕</span> Add Category
        </button>
      </div>

      <div className="stats-grid">
        {categories.map(cat => (
          <div key={cat.id} className="stat-card">
            <div className="stat-icon">{cat.icon}</div>
            <div className="stat-value">{cat.count}</div>
            <div className="stat-label">{cat.name}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              {cat.count} {cat.count === 1 ? 'product' : 'products'}
            </div>
            <div style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => handleEdit(cat)}
                style={{ flex: 1 }}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn btn-sm" 
                onClick={() => handleDelete(cat)}
                style={{ flex: 1, background: '#dc3545', color: 'white' }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px' }}>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Category ID *
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingCategory}
                  placeholder="e.g., beverages"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Lowercase, no spaces (used in product category field)
                </small>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Beverages"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
