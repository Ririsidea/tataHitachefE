import { useEffect, useState } from 'react';
import Products from './pages/Products';
import Orders from './pages/Orders';
import EmployeeOrders from './pages/EmployeeOrders';
import SapExport from './pages/SapExport';
import EmployeeManagement from './pages/EmployeeManagement';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Avatar from './components/Avatar';
import Spinner from './components/Spinner';
import { CartIcon, CloseIcon, MenuIcon, PackageIcon } from './components/Icons';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MAP_API_KEY_MISSING, MAP_API_KEY_MISSING_MESSAGE } from './services/api';
import { clearStockCache, prefetchStock } from './hooks/useStock';
import './App.css';

const TABS = [
  { key: 'products', label: 'Products / Stock' },
  { key: 'shop', label: 'Shop' },
  { key: 'orders', label: 'Orders' },
  { key: 'employee-orders', label: 'Employee Orders' },
  // { key: 'sap', label: 'SAP Export' },
];

const ADMIN_TAB = { key: 'employees', label: 'Employee Management' };

function ShopFlow({ shopView, setShopView, lastOrder, setLastOrder }) {
  switch (shopView) {
    case 'cart':
      return <Cart onContinueShopping={() => setShopView('shop')} onCheckout={() => setShopView('checkout')} />;
    case 'checkout':
      return (
        <Checkout
          onBack={() => setShopView('cart')}
          onOrderPlaced={(order) => {
            setLastOrder(order);
            setShopView('confirmation');
          }}
        />
      );
    case 'confirmation':
      return (
        <OrderConfirmation
          order={lastOrder}
          onBackToShop={() => {
            setLastOrder(null);
            setShopView('shop');
          }}
        />
      );
    case 'shop':
    default:
      return <Shop onViewCart={() => setShopView('cart')} />;
  }
}

function AppShell() {
  const [activeTab, setActiveTab] = useState('products');
  const [shopView, setShopView] = useState('shop');
  const [lastOrder, setLastOrder] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  // Start loading the stock list as soon as the user is in, so Shop / Products open instantly.
  useEffect(() => {
    prefetchStock();
    return clearStockCache;
  }, []);

  // Phone navigation drawer: Escape closes it and the page behind it does not scroll.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    if (key === 'shop') setShopView('shop');
    setNavOpen(false);
  };

  const handleCartClick = () => {
    setActiveTab('shop');
    setShopView('cart');
    setNavOpen(false);
  };

  const tabs = user?.isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  let body;
  if (activeTab === 'products') body = <Products />;
  else if (activeTab === 'orders') body = <Orders />;
  else if (activeTab === 'employee-orders') body = <EmployeeOrders />;
  else if (activeTab === 'sap') body = <SapExport />;
  else if (activeTab === 'employees') body = user?.isAdmin ? <EmployeeManagement /> : null;
  else
    body = (
      <ShopFlow
        shopView={shopView}
        setShopView={setShopView}
        lastOrder={lastOrder}
        setLastOrder={setLastOrder}
      />
    );

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <header className="app-header">
          <div className="app-header-top">
            <button
              type="button"
              className="nav-toggle"
              aria-label="Open menu"
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              onClick={() => setNavOpen(true)}
            >
              <MenuIcon size={22} />
            </button>
            <div className="app-brand">
              <span className="app-brand-mark" aria-hidden="true">
                <PackageIcon size={20} />
              </span>
              <div className="app-brand-text">
                <span className="eyebrow">Tata Hitachi</span>
                <h1 title="MAP Ordering Portal">MAP Ordering Portal</h1>
              </div>
            </div>
            <div className="app-header-actions">
              <button type="button" className="cart-icon-btn" onClick={handleCartClick} aria-label="View cart">
                <CartIcon size={20} />
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </button>
              <div className="user-menu">
                <Avatar name={user?.name} />
                <span className="user-email" title={user?.email}>
                  {user?.name || user?.email}
                </span>
                <button type="button" className="link-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
        <nav className="tabs" aria-label="Main">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'tab active' : 'tab'}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      {navOpen && (
        <div className="drawer-backdrop" onClick={() => setNavOpen(false)}>
          <aside
            id="mobile-nav"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <span className="drawer-title">Menu</span>
              <button type="button" className="modal-close-btn drawer-close" onClick={() => setNavOpen(false)} aria-label="Close menu" autoFocus>
                <CloseIcon />
              </button>
            </div>
            <nav className="drawer-nav" aria-label="Main">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? 'drawer-link active' : 'drawer-link'}
                  aria-current={activeTab === tab.key ? 'page' : undefined}
                  onClick={() => handleTabClick(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
              <button type="button" className="drawer-link" onClick={handleCartClick}>
                Cart
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </button>
            </nav>
            <div className="drawer-foot">
              <div className="drawer-user">
                <Avatar name={user?.name} />
                <span className="drawer-user-text">
                  <strong>{user?.name || user?.email}</strong>
                  {user?.name && user?.email && <span>{user.email}</span>}
                </span>
              </div>
              <button type="button" className="btn-ghost btn-block" onClick={logout}>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
      <main className="app-main">
        {MAP_API_KEY_MISSING && (
          <div className="error" role="alert" style={{ marginBottom: 16 }}>
            {MAP_API_KEY_MISSING_MESSAGE}
          </div>
        )}
        {body}
      </main>
    </div>
  );
}

function AuthGate() {
  const { user, checking } = useAuth();
  const [view, setView] = useState('login');
  const [resetEmailHint, setResetEmailHint] = useState('');
  const [infoMessage, setInfoMessage] = useState(null);

  if (checking) {
    return (
      <div className="app-loading">
        <Spinner />
      </div>
    );
  }

  // Reset Password is only ever reached via the explicit link on the Login page -
  // a successful login always goes straight to the dashboard, never through here.
  if (!user && view === 'reset') {
    return (
      <ResetPassword
        initialEmail={resetEmailHint}
        onBackToLogin={() => {
          setInfoMessage(null);
          setView('login');
        }}
        onDone={() => {
          setInfoMessage('Password updated — please log in.');
          setView('login');
        }}
      />
    );
  }

  if (!user) {
    return (
      <Login
        infoMessage={infoMessage}
        onForgotPassword={(typedEmail) => {
          setResetEmailHint(typedEmail || '');
          setInfoMessage(null);
          setView('reset');
        }}
      />
    );
  }

  return (
    <CartProvider>
      <AppShell />
    </CartProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
