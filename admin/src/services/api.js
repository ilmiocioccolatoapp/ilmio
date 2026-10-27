import axios from 'axios';
import { supabase } from '../supabase';

const isProduction = process.env.NODE_ENV === 'production';
let API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  if (isProduction) {
    throw new Error('REACT_APP_API_URL environment variable is required in production.');
  }
  const defaultHost = 'localhost';
  const defaultPort = 5001;
  API_URL = `http://${defaultHost}:${defaultPort}/api`;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  if (!supabase || config.publicRequest) return config;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  return config;
});

export const authService = {
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

async function uploadImage(file) {
  const signed = await api.post('/uploads/sign');
  const creds = signed.data && signed.data.data;
  if (!creds || !creds.cloudName || !creds.signature) {
    throw new Error('Could not prepare the image upload.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', creds.apiKey);
  body.append('timestamp', String(creds.timestamp));
  body.append('signature', creds.signature);
  body.append('folder', creds.folder);

  const uploaded = await axios.post(
    `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
    body,
    { timeout: 120000 }
  );

  return {
    image: uploaded.data.secure_url,
    imagePublicId: uploaded.data.public_id,
  };
}

async function withImage(fields, file) {
  const payload = { ...fields };
  if (file) {
    Object.assign(payload, await uploadImage(file));
  }
  return payload;
}

export const productService = {
  getAllProducts: async () => {
    try {
      const response = await api.get('/products');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAvailableProducts: async () => {
    try {
      const response = await api.get('/products/available', { publicRequest: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createProduct: async ({ fields, file }) => {
    try {
      const payload = await withImage(fields, file);
      const response = await api.post('/products', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateProduct: async (id, { fields, file }) => {
    try {
      const payload = await withImage(fields, file);
      const response = await api.put(`/products/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  toggleAvailability: async (id) => {
    try {
      const response = await api.patch(`/products/${id}/toggle`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const categoryService = {
  getAllCategories: async () => {
    try {
      const response = await api.get('/categories', { publicRequest: true });
      return response.data.data || [];
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/categories', categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

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
