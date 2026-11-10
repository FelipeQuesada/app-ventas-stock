import { Link } from 'react-router-dom';
import {
  LogOut,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  BarChart3,
  Shield,
  Building2,
  Settings,
} from 'lucide-react';
import { isBrandAdminRole, isSuperAdminRole } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { signOutUser } from '../services/auth';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const { brand, exitBrand } = useBrand();
  const isAdmin = isBrandAdminRole(profile?.role) || isSuperAdminRole(profile?.role);

  async function handleLogout() {
    if (!window.confirm('¿Cerrar sesión?')) return;
    exitBrand();
    await signOutUser();
  }

  const roleLabel =
    profile?.role === 'super_admin'
      ? 'Super admin'
      : profile?.role === 'owner'
        ? 'Dueño'
        : profile?.role === 'admin'
          ? 'Administrador'
          : 'Empleado';

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          {profile?.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt=""
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : null}
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              {profile?.name ?? 'Usuario'}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {user?.email}
            </p>
          </div>
        </div>
        <span className="badge badge-muted" style={{ marginTop: 8 }}>
          {roleLabel}
        </span>
        {brand && (
          <p className="muted" style={{ marginTop: 8 }}>
            Marca: <strong>{brand.name}</strong>
          </p>
        )}
      </div>

      {isSuperAdminRole(profile?.role) && (
        <Link to="/platform" className="card" style={{ display: 'block', marginBottom: 20 }}>
          <div className="row" style={{ gap: 12 }}>
            <Building2 size={18} color="var(--accent)" />
            <div>
              <strong>Panel de plataforma</strong>
              <div className="muted">Gestionar todas las marcas</div>
            </div>
          </div>
        </Link>
      )}

      {isAdmin && (
        <>
          <Link to="/admin" className="card" style={{ display: 'block', marginBottom: 20 }}>
            <div className="row" style={{ gap: 12 }}>
              <Shield size={18} color="var(--accent)" />
              <div>
                <strong>Panel de administración</strong>
                <div className="muted">Usuarios y facturas de tu marca</div>
              </div>
            </div>
          </Link>
          <Link to="/brand" className="card" style={{ display: 'block', marginBottom: 20 }}>
            <div className="row" style={{ gap: 12 }}>
              <Settings size={18} color="var(--accent)" />
              <div>
                <strong>Configurar marca</strong>
                <div className="muted">Logo, nombre y foto de perfil</div>
              </div>
            </div>
          </Link>
        </>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Accesos rápidos</h3>
        <div className="stack" style={{ marginTop: 12 }}>
          <Link to="/sales" className="row" style={{ gap: 12 }}>
            <ShoppingCart size={18} /> Nueva venta
          </Link>
          <Link to="/products" className="row" style={{ gap: 12 }}>
            <Package size={18} /> Productos
          </Link>
          <Link to="/customers" className="row" style={{ gap: 12 }}>
            <Users size={18} /> Clientes
          </Link>
          <Link to="/caja" className="row" style={{ gap: 12 }}>
            <Wallet size={18} /> Caja
          </Link>
          {isAdmin && (
            <Link to="/statistics" className="row" style={{ gap: 12 }}>
              <BarChart3 size={18} /> Estadísticas
            </Link>
          )}
        </div>
      </div>

      <button type="button" className="btn btn-danger" onClick={() => void handleLogout()}>
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}
