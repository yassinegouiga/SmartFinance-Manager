import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../NotificationBell/NotificationBell';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <div className="orb orb-purple" />
      <div className="orb orb-teal" />
      <Sidebar />
      <main className="layout-main">
        <header className="layout-header">
          <NotificationBell />
        </header>
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
