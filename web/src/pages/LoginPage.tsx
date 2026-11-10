import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signIn, resetPassword, getAuthErrorMessage } from '../services/auth';
import { isSuperAdminRole } from '@advance-coat/shared';

export function LoginPage() {
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (user) {
    if (isSuperAdminRole(profile?.role)) {
      return <Navigate to="/platform" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (forgot) {
        await resetPassword(email);
        setInfo('Te enviamos un email para restablecer la contraseña.');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-page">
      <aside className="register-aside">
        <Link to="/" className="register-aside-logo">
          Control<span>+</span>
        </Link>
        <div className="register-aside-copy">
          <h1>Entrá a tu marca y seguí vendiendo sin fricción</h1>
          <p>
            Accedé con el email de tu negocio o el que te asignó tu administrador. Ventas, stock y
            caja en un solo lugar.
          </p>
          <ul className="register-aside-points">
            <li>Una marca, varios usuarios</li>
            <li>Roles claros para el equipo</li>
            <li>Datos separados por negocio</li>
          </ul>
        </div>
      </aside>

      <main className="register-main">
        <motion.div
          className="register-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/" className="register-mobile-logo">
            Control<span>+</span>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={forgot ? 'forgot' : 'login'}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <h2>{forgot ? 'Recuperar contraseña' : 'Iniciar sesión'}</h2>
              <p className="subtitle">
                {forgot
                  ? 'Ingresá tu email y te enviamos el enlace.'
                  : 'Entrá con el email de tu marca o el que te asignó tu administrador.'}
              </p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    required
                  />
                </div>

                {!forgot && (
                  <div className="field">
                    <label htmlFor="password">Contraseña</label>
                    <div className="password-field">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contraseña"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="error-text">{error}</p>}
                {info && <p className="success-text">{info}</p>}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'Esperá…' : forgot ? 'Enviar enlace' : 'Ingresar'}
                </button>
              </form>

              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setForgot((v) => !v);
                    setError('');
                    setInfo('');
                  }}
                >
                  {forgot ? 'Volver al login' : '¿Olvidaste tu contraseña?'}
                </button>
              </div>

              {!forgot && (
                <p className="muted register-footer-link">
                  ¿Sos dueño de un negocio? <Link to="/register">Registrá tu marca</Link>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
