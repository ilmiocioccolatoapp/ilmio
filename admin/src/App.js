import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import Categories from './components/Categories';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import Login from './components/Login';
import {
  BakerySealIcon,
  DashboardIcon,
  ProductsIcon,
  CategoriesIcon,
  SettingsIcon,
  AnalyticsIcon
} from './components/Icons';
import { authService } from './services/api';
import { CatalogProvider } from './data/CatalogContext';
import { supabase, supabaseConfigured } from './supabase';
import './styles/App.css';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [authorizationError, setAuthorizationError] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const accessToken = session?.access_token;
  const userId = session?.user?.id;
  const authorized = adminUser && adminUser.id === userId;

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setAuthLoading(false);
        if (!nextSession) setAuthorizationError('');
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setAdminUser(null);
      return undefined;
    }

    let active = true;
    setAdminUser(previous => previous?.id === userId ? previous : null);
    setAuthorizationError('');
    authService.getCurrentUser()
      .then((user) => {
        if (active) {
          setAdminUser(user);
          setAuthorizationError('');
        }
      })
      .catch((error) => {
        if (!active) return;
        const message = typeof error === 'string'
          ? error
          : error?.error || error?.message || 'Could not verify admin access.';
        setAdminUser(null);
        setAuthorizationError(Array.isArray(message) ? message.join(', ') : message);
      });

    return () => {
      active = false;
    };
  }, [accessToken, userId]);

  useEffect(() => {
    setShowForm(false);
    setEditingProduct(null);
    setActiveTab('dashboard');
  }, [userId]);

  const handleSignOut = async () => {
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setSignOutError(error.message);
    } catch (error) {
      setSignOutError(error.message || 'Could not sign out. Please try again.');
    }
  };

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
        return <ProductList onEdit={handleEditProduct} />;
      case 'categories':
        return <Categories />;
      case 'settings':
        return <Settings />;
      case 'analytics':
        return <Analytics onAddProduct={handleAddProduct} onNavigateProducts={() => setActiveTab('products')} />;
      default:
        return <Dashboard onAddProduct={handleAddProduct} />;
    }
  };

  if (!supabaseConfigured) {
    return (
      <Login configError="Supabase is not configured. Set the admin app's Supabase URL and publishable key." />
    );
  }

  if (authLoading || (session && !authorized && !authorizationError)) {
    return (
      <main className="auth-page">
        <div className="auth-loading" role="status">Checking your sign-in...</div>
      </main>
    );
  }

  if (!session) {
    return <Login authError={authorizationError} />;
  }

  if (!authorized) {
    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <h1>Admin access unavailable</h1>
          <p className="auth-description">
            {authorizationError || 'Your account is not authorized to use this admin panel.'}
          </p>
          {signOutError && <div className="auth-error">{signOutError}</div>}
          <button className="btn btn-primary auth-submit" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <CatalogProvider key={adminUser.id}>
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-stamp">
              <BakerySealIcon size={32} />
            </div>
            <div>
              <h1>Il Mio Cioccolato</h1>
            </div>
            <span className="logo-tag">Operational Ledger</span>
          </div>
          <div className="admin-actions">
            <span className="admin-user">{adminUser.email}</span>
            {signOutError && <span className="auth-inline-error">{signOutError}</span>}
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
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
                <DashboardIcon />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'products' ? 'active' : ''}
                onClick={() => setActiveTab('products')}
              >
                <ProductsIcon />
                <span>Products</span>
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'categories' ? 'active' : ''}
                onClick={() => setActiveTab('categories')}
              >
                <CategoriesIcon />
                <span>Categories</span>
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={() => setActiveTab('settings')}
              >
                <SettingsIcon />
                <span>Settings</span>
              </button>
            </li>
            <li>
              <button
                className={activeTab === 'analytics' ? 'active' : ''}
                onClick={() => setActiveTab('analytics')}
              >
                <AnalyticsIcon />
                <span>Analytics</span>
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
    </CatalogProvider>
  );
}

export default App;
