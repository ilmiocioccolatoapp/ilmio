import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CloseIcon
} from './Icons';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '✨',
    order: 0
  });

  const loadCategories = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      id: '',
      name: '',
      icon: '✨',
      order: categories.length + 1
    });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon || '✨',
      order: category.order || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await categoryService.deleteCategory(category.id);
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
      } else {
        await categoryService.createCategory(formData);
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
          <div>
            <h2 className="section-title">Category Registry</h2>
            <p className="section-subtitle">Loading bakehouse departments...</p>
          </div>
        </div>
        <p style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>Reading category configuration...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Category Registry ({categories.length})</h2>
          <p className="section-subtitle">Department hierarchy, tablet gallery sequence, and kiosk order</p>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          <PlusIcon />
          <span>Add Category</span>
        </button>
      </div>

      <div className="stats-grid">
        {categories.map(cat => (
          <div key={cat.id} className="category-card">
            <div className="category-card-top">
              <span className="category-order">Position #{cat.order || '—'}</span>
              {cat.icon && (
                <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
              )}
            </div>

            <h3 className="category-name">{cat.name}</h3>

            <div className="category-count">
              {cat.count !== undefined ? `${cat.count} ${cat.count === 1 ? 'product' : 'products'}` : 'Active category'}
            </div>

            <div className="category-actions">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleEdit(cat)}
                title="Edit category name or order"
              >
                <PencilIcon />
                <span>Edit</span>
              </button>
              <button
                className="btn btn-sm btn-ghost-danger"
                onClick={() => handleDelete(cat)}
                title="Delete category"
              >
                <TrashIcon />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="product-form-container">
          <div className="product-form" style={{ maxWidth: '520px' }}>
            <div className="form-header">
              <h2>{editingCategory ? 'Edit Category' : 'New Department Category'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)} type="button">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Identifier (Slug) *</label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingCategory}
                  placeholder="e.g. pastries, specialty-chocolates"
                />
              </div>

              <div className="form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Viennoiserie & Pastries"
                />
              </div>

              <div className="form-group">
                <label>Icon Symbol (Kiosk Header)</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  placeholder="e.g. 🥐 or ✨"
                />
              </div>

              <div className="form-group">
                <label>Display Order Sequence (Ascending)</label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
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
