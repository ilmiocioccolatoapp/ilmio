import React, { useState, useEffect } from 'react';
import { productService, categoryService } from '../services/api';

const ProductForm = ({ product, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'pastries',
    description: '',
    ingredients: '',
    price: 'AED 0.00',
    available: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
    if (product) {
      setFormData({
        title: product.title,
        category: product.category,
        description: product.description,
        ingredients: product.ingredients,
        price: product.price,
        available: product.available
      });
      setImagePreview(product.image);
    }
  }, [product]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data);
      if (data.length > 0 && !product) {
        setFormData(prev => ({ ...prev, category: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!imageFile && !imagePreview) newErrors.image = 'Image is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.ingredients.trim()) newErrors.ingredients = 'Ingredients are required';
    if (!formData.price.match(/^(AED|€)\s?\d+\.\d{2}$/)) newErrors.price = 'Price must be in format AED X.XX or €X.XX';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (errors.image) setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (imageFile) data.append('image', imageFile);

      if (product) {
        await productService.updateProduct(product._id, data);
      } else {
        await productService.createProduct(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <div className="form-header">
        <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
        <button className="btn-close" onClick={onCancel}>✕</button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={errors.title ? 'error' : ''}
            maxLength="100"
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            {categories.length > 0 ? (
              categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))
            ) : (
              <>
                <option value="pastries">🥐 Pastries</option>
                <option value="drinks">☕ Drinks</option>
                <option value="desserts">🍰 Desserts</option>
                <option value="specialties">✨ Specialties</option>
              </>
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="image">Product Image *</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className={errors.image ? 'error' : ''}
          />
          {imagePreview && (
            <div className="image-preview" style={{ marginTop: '10px' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '5px' }} 
              />
            </div>
          )}
          {errors.image && <span className="error-message">{errors.image}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={errors.description ? 'error' : ''}
            rows="3"
            maxLength="500"
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="ingredients">Ingredients *</label>
          <textarea
            id="ingredients"
            name="ingredients"
            value={formData.ingredients}
            onChange={handleChange}
            className={errors.ingredients ? 'error' : ''}
            rows="2"
          />
          {errors.ingredients && <span className="error-message">{errors.ingredients}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="price">Price *</label>
          <input
            type="text"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className={errors.price ? 'error' : ''}
            placeholder="AED 0.00"
          />
          {errors.price && <span className="error-message">{errors.price}</span>}
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="available"
              checked={formData.available}
              onChange={handleChange}
            />
            <span>Available for sale</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;

