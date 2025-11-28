import React from 'react';

const Analytics = () => {
  return (
    <div className="page-container">
      <h2 className="section-title">Analytics Overview</h2>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-value">AED 12,450</div>
          <div className="stat-label">Total Revenue (This Month)</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">🛒</div>
          <div className="stat-value">342</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">👥</div>
          <div className="stat-value">1,890</div>
          <div className="stat-label">Unique Visitors</div>
        </div>
      </div>

      <div className="form-container" style={{ marginTop: '30px', textAlign: 'center', padding: '50px' }}>
        <p style={{ color: '#666', fontSize: '1.2rem' }}>
          Detailed charts and reports are generating...
        </p>
        <div style={{ marginTop: '20px', fontSize: '3rem' }}>📊 📉 🥧</div>
      </div>
    </div>
  );
};

export default Analytics;
