import { Link } from 'react-router-dom';
import { Shield, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminDashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="admin-dashboard">
      <div className="admin-hero card">
        <div className="admin-hero-icon">
          <Shield size={28} />
        </div>
        <div>
          <h2>Hola, {profile?.name?.split(' ')[0] ?? 'Admin'}</h2>
          <p>
            Este panel es solo web y solo para administradores. Acá gestionás accesos y
            configuración sensible, separado de la app de ventas.
          </p>
        </div>
      </div>

      <div className="admin-cards">
        <Link to="/admin/users" className="admin-card-link card">
          <Users size={22} />
          <div>
            <strong>Usuarios</strong>
            <span>Crear, editar y activar empleados</span>
          </div>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
