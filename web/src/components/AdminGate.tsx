import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminShell } from './AdminShell';

export function AdminGate() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Cargando panel…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
