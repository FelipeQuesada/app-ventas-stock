import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSuperAdminRole } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { PlatformShell } from './PlatformShell';

export function PlatformGate() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Cargando plataforma…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isSuperAdminRole(profile?.role)) {
    return <Navigate to="/app" replace />;
  }

  return (
    <PlatformShell>
      <Outlet />
    </PlatformShell>
  );
}
