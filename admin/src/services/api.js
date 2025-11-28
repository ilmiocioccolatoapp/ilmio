import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Products API
export const productService = {
  // Get all products
  getAllProducts: async () => {
    try {
      const response = await api.get('/products');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get available products
  getAvailableProducts: async () => {
    try {
      const response = await api.get('/products/available');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create product
  createProduct: async (productData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      const response = await api.post('/products', productData, config);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update product
  updateProduct: async (id, productData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      const response = await api.put(`/products/${id}`, productData, config);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },


  // Delete product
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Toggle availability
  toggleAvailability: async (id) => {
    try {
      const response = await api.patch(`/products/${id}/toggle`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Categories API
export const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    try {
      const response = await api.get('/categories');
      return response.data.data || [];
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create category
  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/categories', categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update category
  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete category
  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default api;
