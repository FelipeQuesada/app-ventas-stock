import { Link } from 'react-router-dom';
import {
  LogOut,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/auth';

export function ProfilePage() {
  const { profile, user } = useAuth();

  async function handleLogout() {
    if (!window.confirm('¿Cerrar sesión?')) return;
    await signOutUser();
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">{profile?.name ?? 'Usuario'}</h3>
        <p className="muted">{user?.email}</p>
        <span className="badge badge-muted" style={{ marginTop: 8 }}>
          {profile?.role === 'admin' ? 'Administrador' : 'Empleado'}
        </span>
      </div>

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
          <Link to="/statistics" className="row" style={{ gap: 12 }}>
            <BarChart3 size={18} /> Estadísticas
          </Link>
        </div>
      </div>

      <button type="button" className="btn btn-danger" onClick={() => void handleLogout()}>
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}
