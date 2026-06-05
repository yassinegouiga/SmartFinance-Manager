import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Icon from '../Icons/Icon';

const NAV = [
  { path: '/',             icon: 'dashboard', label: 'Dashboard',     group: 'Overview', end: true },
  { path: '/transactions', icon: 'exchange',  label: 'Transactions',  group: 'Overview' },
  { path: '/analytics',    icon: 'bars',      label: 'Analytics',     group: 'Overview' },
  { path: '/budgets',      icon: 'wallet',    label: 'Budgets',       group: 'Manage' },
  { path: '/saving-pots',  icon: 'target',    label: 'Saving Pots',   group: 'Manage' },
  { path: '/bills',        icon: 'receipt',   label: 'Bills',         group: 'Manage' },
  { path: '/categories',   icon: 'grid',      label: 'Categories',    group: 'Manage' },
  { path: '/notifications',icon: 'bell',      label: 'Notifications', group: 'Account' },
  { path: '/settings',     icon: 'settings',  label: 'Settings',      group: 'Account' },
];

const GROUPS = ['Overview', 'Manage', 'Account'];

export default function Sidebar() {
  const { profile, user } = useAuth();
  const { unreadCount } = useNotifications();

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.displayName || user?.email?.split('@')[0] || 'User';

  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">
          <Icon name="wallet" size={21} />
        </div>
        <div>
          <div className="name">Smart<span>Finance</span></div>
          <div className="sub">Manager</div>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, margin: '0 -6px', padding: '0 6px' }}>
        {GROUPS.map(g => (
          <div key={g}>
            <div className="nav-group-label">{g}</div>
            {NAV.filter(n => n.group === g).map(({ path, icon, label, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon name={icon} size={19} />
                {label}
                {path === '/notifications' && unreadCount > 0 && (
                  <span className="badge-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <NavLink to="/settings" className="user-chip">
          <div
            className="avatar"
            style={{
              width: 36, height: 36, fontSize: 14,
              background: profile?.avatar_url ? 'transparent' : 'linear-gradient(150deg, var(--accent-2), var(--accent))',
              color: 'var(--accent-ink)',
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div className="meta" style={{ flex: 1 }}>
            <div className="nm">{displayName}</div>
            <div className="em">{user?.email}</div>
          </div>
          <Icon name="chevronRight" size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </NavLink>
      </div>
    </aside>
  );
}
