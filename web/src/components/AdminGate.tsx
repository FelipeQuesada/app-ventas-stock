import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isBrandAdminRole, isSuperAdminRole } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { AdminShell } from './AdminShell';

export function AdminGate() {
  const { user, profile, loading } = useAuth();
  const { brand, loading: brandLoading } = useBrand();
  const location = useLocation();

  if (loading || brandLoading) {
    return <div className="loading-screen">Cargando panel…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isSuperAdminRole(profile?.role) && !brand) {
    return <Navigate to="/platform" replace />;
  }

  if (!isBrandAdminRole(profile?.role) && !isSuperAdminRole(profile?.role)) {
    return <Navigate to="/app" replace />;
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
