import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AppShell } from './AppShell';
import { OWNER_ADMIN_EMAIL, signOutUser } from '../services/auth';

export function AuthGate() {
  const { user, profile, loading, profileError } = useAuth();
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
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 12, padding: 24 }}>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Iniciaste sesión pero no pudimos leer tu perfil.
        </p>
        <p className="muted" style={{ margin: 0, textAlign: 'center', maxWidth: 420 }}>
          {profileError
            ? `Firestore respondió: ${profileError}`
            : 'Tu usuario todavía no tiene perfil cargado. Pedile al administrador que lo cree.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => void signOutUser()}>
          Cerrar sesión
        </button>
      </div>
    );
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
