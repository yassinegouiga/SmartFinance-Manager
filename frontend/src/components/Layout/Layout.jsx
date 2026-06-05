import { useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeaderProvider, useHeader } from '../../context/HeaderContext';
import { CategoriesProvider } from '../../context/CategoriesContext';
import { NotificationsProvider, useNotifications } from '../../context/NotificationsContext';
import Sidebar from './Sidebar';
import Icon from '../Icons/Icon';

const PAGE_META = {
  '/':              ['Dashboard',     'Your money at a glance'],
  '/transactions':  ['Transactions',  'Every income & expense'],
  '/analytics':     ['Analytics',     'Trends and insights'],
  '/budgets':       ['Budgets',       'Spending limits by category'],
  '/saving-pots':   ['Saving Pots',   "Goals you're building toward"],
  '/bills':         ['Bills',         'Recurring payments'],
  '/categories':    ['Categories',    'Organise your spending'],
  '/notifications': ['Notifications', 'Alerts & activity'],
  '/settings':      ['Settings',      'Profile & preferences'],
};

const MOBILE_NAV = [
  { path: '/',             icon: 'dashboard', label: 'Home', end: true },
  { path: '/transactions', icon: 'exchange',  label: 'Transactions' },
  { path: '/budgets',      icon: 'wallet',    label: 'Budgets' },
  { path: '/settings',     icon: 'settings',  label: 'Settings' },
];

function TopBar() {
  const { header } = useHeader();
  const { theme, toggleTheme } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const meta = PAGE_META[location.pathname] || ['SmartFinance', ''];
  const title = header?.title || meta[0];
  const sub = header?.sub || meta[1];

  return (
    <header className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        <div className="page-sub hide-mobile">{sub}</div>
      </div>
      <div className="topbar-spacer" />
      <div className="center gap8">
        {header?.actions}
        <button
          className="icon-btn"
          title="Notifications"
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative' }}
        >
          <Icon name="bell" size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 5px',
              borderRadius: 99, background: 'var(--neg)', color: '#fff', fontSize: 10.5, fontWeight: 800,
              display: 'grid', placeItems: 'center', border: '2px solid var(--bg-elev)',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const navigate = useNavigate();
  return (
    <nav className="bottomnav">
      {MOBILE_NAV.slice(0, 2).map(({ path, icon, label, end }) => (
        <NavLink key={path} to={path} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={icon} size={21} />{label}
        </NavLink>
      ))}
      <button className="fab" onClick={() => navigate('/transactions')} title="Add transaction">
        <div className="fab-btn"><Icon name="plus" size={24} /></div>
      </button>
      {MOBILE_NAV.slice(2).map(({ path, icon, label, end }) => (
        <NavLink key={path} to={path} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={icon} size={21} />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { theme } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
    document.documentElement.classList.add('theming');
    const t = setTimeout(() => document.documentElement.classList.remove('theming'), 400);
    return () => clearTimeout(t);
  }, [theme]);

  return (
    <CategoriesProvider>
      <NotificationsProvider>
        <HeaderProvider>
          <div className="app">
            <Sidebar />
            <div className="main">
              <TopBar />
              <div className="content">
                <div className="content-inner">
                  <Outlet />
                </div>
              </div>
            </div>
            <BottomNav />
          </div>
        </HeaderProvider>
      </NotificationsProvider>
    </CategoriesProvider>
  );
}
