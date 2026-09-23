import { useState } from 'react';
import LiveEvents from './pages/LiveEvents';
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
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  const [activeTab, setActiveTab] = useState('events');
  const [shopView, setShopView] = useState('shop');
  const [lastOrder, setLastOrder] = useState(null);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  const handleTabClick = (key) => {
    setActiveTab(key);
    if (key === 'shop') setShopView('shop');
  };

  const handleCartClick = () => {
    setActiveTab('shop');
    setShopView('cart');
  };

  const tabs = user?.isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  let body;
  if (activeTab === 'events') body = <LiveEvents />;
  else if (activeTab === 'products') body = <Products />;
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
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-brand">
            <span className="eyebrow">Tata Hitachi</span>
            <h1>MAP Ordering Portal</h1>
          </div>
          <div className="app-header-actions">
            <button type="button" className="cart-icon-btn" onClick={handleCartClick} aria-label="View cart">
              🛒
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </button>
            <div className="user-menu">
              <Avatar name={user?.name} />
              <span className="user-email">{user?.name || user?.email}</span>
              <button type="button" className="link-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="app-main">{body}</main>
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
