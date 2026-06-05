import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotifications } from '../context/NotificationsContext';
import Icon from '../components/Icons/Icon';
import { EmptyState, Spinner, PageHead } from '../components/UI';

// Map the notification service's types to a visual style + a target route.
const TYPE_META = {
  bill_due_soon:     { bg: 'var(--info-soft)', fg: 'var(--info)', ic: 'calendar',    route: '/bills' },
  bill_overdue:      { bg: 'var(--neg-soft)',  fg: 'var(--neg)',  ic: 'alert',       route: '/bills' },
  budget_warning:    { bg: 'var(--warn-soft)', fg: 'var(--warn)', ic: 'alert',       route: '/budgets' },
  budget_exceeded:   { bg: 'var(--neg-soft)',  fg: 'var(--neg)',  ic: 'alert',       route: '/budgets' },
  large_transaction: { bg: 'var(--warn-soft)', fg: 'var(--warn)', ic: 'arrowUpRight', route: '/transactions' },
  saving_milestone:  { bg: 'var(--pos-soft)',  fg: 'var(--pos)',  ic: 'trophy',      route: '/saving-pots' },
  weekly_digest:     { bg: 'var(--info-soft)', fg: 'var(--info)', ic: 'bars',        route: '/analytics' },
  monthly_summary:   { bg: 'var(--info-soft)', fg: 'var(--info)', ic: 'calendar',    route: '/analytics' },
};
const metaFor = (type) => TYPE_META[type] || { bg: 'var(--info-soft)', fg: 'var(--info)', ic: 'bell', route: null };

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { setUnreadCount, refreshUnread } = useNotifications();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    api.get('/api/v1/notifications/', { params: { limit: 50 } })
      .then(r => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unread = items.filter(n => !n.is_read).length;
  const shown = items.filter(n => filter === 'all' || !n.is_read);

  const markAllRead = async () => {
    try {
      await api.patch('/api/v1/notifications/read-all');
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const openItem = async (n) => {
    const meta = metaFor(n.type);
    if (!n.is_read) {
      try {
        await api.patch(`/api/v1/notifications/${n.id}/read`);
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        refreshUnread();
      } catch { /* silent */ }
    }
    if (meta.route) navigate(meta.route);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner lg />
    </div>
  );

  return (
    <div>
      <PageHead deps={[unread]}>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            <Icon name="check" size={16} /> <span className="hide-mobile">Mark all read</span>
          </button>
        )}
      </PageHead>

      {items.length > 0 && (
        <div className="segmented accent mb16" style={{ width: 'fit-content' }}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
            Unread {unread > 0 && `(${unread})`}
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 8 }}>
        {shown.length === 0 ? (
          <EmptyState
            icon="bell"
            title={filter === 'unread' ? "You're all caught up" : 'No notifications'}
            body={filter === 'unread' ? 'No unread alerts right now.' : 'Budget alerts, bill reminders and goal updates will appear here.'}
          />
        ) : shown.map(n => {
          const meta = metaFor(n.type);
          return (
            <button
              key={n.id}
              className="tx-row"
              style={{ width: '100%', textAlign: 'left', background: n.is_read ? 'transparent' : 'var(--accent-soft-2)', alignItems: 'flex-start', padding: '14px 12px' }}
              onClick={() => openItem(n)}
            >
              <div className="cat-ic" style={{ background: meta.bg, color: meta.fg }}><Icon name={meta.ic} size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="between">
                  <span className="fw7">{n.title}</span>
                  <span className="t-xs faint nowrap" style={{ marginLeft: 10 }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.message && <div className="t-sm muted mt4" style={{ lineHeight: 1.45 }}>{n.message}</div>}
              </div>
              {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 6 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
