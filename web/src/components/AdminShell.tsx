import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/auth';

const ADMIN_NAV = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOutUser();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <Shield size={20} />
          </div>
          <div>
            <strong>Admin</strong>
            <span>Advance Coat</span>
          </div>
        </div>

        <nav className="admin-nav">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-user-name">{profile?.name ?? 'Admin'}</p>
          <p className="admin-user-email">{profile?.email}</p>
          <button type="button" className="admin-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Volver a la app
          </button>
          <button type="button" className="admin-logout" onClick={() => void handleLogout()}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1>Panel de administración</h1>
          <span className="admin-badge">Solo web · Acceso restringido</span>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
