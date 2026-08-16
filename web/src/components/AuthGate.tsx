import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AppShell } from './AppShell';
import { OWNER_ADMIN_EMAIL } from '../services/auth';

export function AuthGate() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Cargando…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    const email = user.email?.toLowerCase() ?? '';
    if (email === OWNER_ADMIN_EMAIL) {
      return <Navigate to="/admin/setup" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
