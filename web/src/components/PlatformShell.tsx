import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/auth';
import { useBrand } from '../context/BrandContext';

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { exitBrand } = useBrand();
  const navigate = useNavigate();

  async function handleLogout() {
    exitBrand();
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
            <strong>Control+</strong>
            <span>Super admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/platform" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <Building2 size={18} />
            Marcas
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-user-name">{profile?.name ?? 'Super admin'}</p>
          <p className="admin-user-email">{profile?.email}</p>
          <button type="button" className="admin-logout" onClick={() => void handleLogout()}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1>Panel de plataforma</h1>
          <span className="admin-badge">Solo super admin</span>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
