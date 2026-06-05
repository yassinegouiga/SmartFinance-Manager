import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

/**
 * NotificationsContext owns the unread-count for the shell's bell badge and
 * sidebar dot, polling the real notifications service every 30s. The full
 * Notifications page reads the list directly and calls refreshUnread() /
 * setUnreadCount() after marking items read.
 */
const NotificationsCtx = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error('useNotifications must be used within a <NotificationsProvider>');
  return ctx;
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timer = useRef(null);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/notifications/unread-count');
      setUnreadCount(data.count ?? 0);
    } catch { /* silent — badge just stays as-is */ }
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    refreshUnread();
    timer.current = setInterval(refreshUnread, 30_000);
    return () => clearInterval(timer.current);
  }, [user, refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, setUnreadCount, refreshUnread }),
    [unreadCount, refreshUnread],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}
