import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';

const Dashboard = ({ onAddProduct }) => {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    unavailable: 0,
    byCategory: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      const products = response.data;

      const categoryCount = {};
      let availableCount = 0;

      products.forEach(product => {
        if (product.available) availableCount++;
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
      });

      setStats({
        total: products.length,
        available: availableCount,
        unavailable: products.length - availableCount,
        byCategory: categoryCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2 className="section-title">Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🍽️</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Products</div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.available}</div>
          <div className="stat-label">Available Products</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏸️</div>
          <div className="stat-value">{stats.unavailable}</div>
          <div className="stat-label">Unavailable Products</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
