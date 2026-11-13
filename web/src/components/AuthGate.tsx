import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { isSuperAdminRole } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { AppShell } from './AppShell';
import { signOutUser } from '../services/auth';

export function AuthGate() {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();
  const { brand, loading: brandLoading } = useBrand();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);

  // Un reintento automático si Auth llegó antes que el perfil del registro
  useEffect(() => {
    if (!user || profile || loading) return;
    const t = window.setTimeout(() => {
      void refreshProfile();
    }, 600);
    return () => window.clearTimeout(t);
  }, [user, profile, loading, refreshProfile]);

  if (loading || brandLoading) {
    return <div className="loading-screen">Cargando…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 12, padding: 24 }}>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Estamos preparando tu marca…
        </p>
        <p className="muted" style={{ margin: 0, textAlign: 'center', maxWidth: 420 }}>
          {profileError
            ? `Firestore: ${profileError}`
            : 'Si acabás de registrarte, esperá un segundo o tocá reintentar.'}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            void refreshProfile().finally(() => setRetrying(false));
          }}
        >
          {retrying ? 'Reintentando…' : 'Reintentar'}
        </button>
        <Link to="/register" className="btn btn-secondary">
          Completar registro
        </Link>
        <button type="button" className="btn btn-ghost" onClick={() => void signOutUser()}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (profile.pendingApproval) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 12, padding: 24 }}>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 18, fontWeight: 600 }}>
          Tu acceso está pendiente de aprobación
        </p>
        <p className="muted" style={{ margin: 0, textAlign: 'center', maxWidth: 420 }}>
          Un administrador de tu marca tiene que validar tu cuenta. Cuando lo haga, volvé a entrar
          con el mismo email.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            void refreshProfile().finally(() => setRetrying(false));
          }}
        >
          {retrying ? 'Revisando…' : 'Ya me aprobaron'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void signOutUser()}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (isSuperAdminRole(profile.role) && !brand) {
    return <Navigate to="/platform" replace />;
  }

  // Legacy sin brandId: BrandContext ya opera como Advance; no bloquear la app.

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
