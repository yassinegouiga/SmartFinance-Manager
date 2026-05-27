import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../services/api';
import './NotificationBell.css';

const TYPE_META = {
  bill_due_soon:    { icon: '📅', color: '#f59e0b' },
  bill_overdue:     { icon: '⚠️', color: '#ef4444' },
  budget_warning:   { icon: '📊', color: '#f59e0b' },
  budget_exceeded:  { icon: '🚨', color: '#ef4444' },
  large_transaction:{ icon: '💸', color: '#ef4444' },
  saving_milestone: { icon: '🏆', color: '#3ecfcf' },
  weekly_digest:    { icon: '📈', color: '#6C63FF' },
  monthly_summary:  { icon: '📅', color: '#6C63FF' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [unread, setUnread]       = useState(0);
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]     = useState(false);
  const panelRef                  = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/notifications/unread-count');
      setUnread(data.count);
    } catch { /* silent */ }
  }, []);

  // Poll unread count every 30 s
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = async () => {
    setOpen(o => !o);
    if (!open) {
      setLoading(true);
      try {
        const { data } = await api.get('/api/v1/notifications/?limit=15');
        setNotifications(data);
        setUnread(0);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
  };

  const markAllRead = async () => {
    await api.patch('/api/v1/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const markOne = async (id) => {
    await api.patch(`/api/v1/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const meta = (type) => TYPE_META[type] || { icon: '🔔', color: '#6C63FF' };

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button className={`notif-bell${open ? ' active' : ''}`} onClick={openPanel} title="Notifications">
        <BellIcon />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel glass">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {notifications.some(n => !n.is_read) && (
              <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty"><div className="spinner" style={{ width:24,height:24,borderWidth:2 }} /></div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <span style={{ fontSize: 32 }}>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => !n.is_read && markOne(n.id)}
                >
                  <span className="notif-icon" style={{ background: meta(n.type).color + '22', color: meta(n.type).color }}>
                    {meta(n.type).icon}
                  </span>
                  <div className="notif-body">
                    <p className="notif-title">{n.title}</p>
                    {n.message && <p className="notif-msg">{n.message}</p>}
                    <p className="notif-time">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
