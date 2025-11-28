import React from 'react';

const Settings = () => {
  return (
    <div className="page-container">
      <h2 className="section-title">Store Settings</h2>

      <div className="form-container" style={{ maxWidth: '800px' }}>
        <div className="form-group">
          <label>Store Name</label>
          <input type="text" defaultValue="Il Mio Cioccolato" />
        </div>

        <div className="form-group">
          <label>Contact Email</label>
          <input type="email" defaultValue="admin@ilmiocioccolato.com" />
        </div>

        <div className="form-group">
          <label>Currency Symbol</label>
          <select defaultValue="AED">
            <option value="AED">AED (Dirham)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div className="form-group checkbox">
          <label>
            <input type="checkbox" defaultChecked />
            Enable Online Ordering
          </label>
        </div>

        <div className="form-group checkbox">
          <label>
            <input type="checkbox" defaultChecked />
            Show "Out of Stock" Items
          </label>
        </div>

        <div className="form-actions">
          <button className="btn btn-success">Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
