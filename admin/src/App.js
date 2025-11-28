import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import Categories from './components/Categories';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onAddProduct={handleAddProduct} />;
      case 'products':
        return <ProductList onEdit={handleEditProduct} refreshTrigger={refreshTrigger} />;
      case 'categories':
        return <Categories />;
      case 'settings':
        return <Settings />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard onAddProduct={handleAddProduct} />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span style={{ fontSize: '2rem' }}>👑</span>
          <h1>Il Mio Cioccolato - Admin Panel</h1>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar">
          <ul className="sidebar-menu">
            <li>
              <button
                className={activeTab === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveTab('dashboard')}
              >
                <span>📊</span> Dashboard
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'products' ? 'active' : ''}
                onClick={() => setActiveTab('products')}
              >
                <span>🍽️</span> Products
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'categories' ? 'active' : ''}
                onClick={() => setActiveTab('categories')}
              >
                <span>🏷️</span> Categories
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={() => setActiveTab('settings')}
              >
                <span>⚙️</span> Settings
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'analytics' ? 'active' : ''}
                onClick={() => setActiveTab('analytics')}
              >
                <span>📈</span> Analytics
              </button>
            </li>
          </ul>
        </aside>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}

export default App;


