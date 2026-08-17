import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signIn, resetPassword, getAuthErrorMessage } from '../services/auth';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (user) return <Navigate to="/" replace />;

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
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="row" style={{ marginBottom: 20 }}>
          <div className="sidebar-brand-mark">
            <img src="/logo-advance.png" alt="Advance Coat" />
          </div>
          <div>
            <strong>Advance Coat</strong>
            <div className="muted">Ventas & stock</div>
          </div>
        </div>

        <h1>{forgot ? 'Recuperar contraseña' : 'Iniciar sesión'}</h1>
        <p className="subtitle">
          {forgot
            ? 'Ingresá tu email y te enviamos el enlace.'
            : 'Accedé con tu cuenta de la empresa.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          {info && <p className="success-text">{info}</p>}

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Esperá…' : forgot ? 'Enviar enlace' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
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

        <p className="muted" style={{ marginTop: 20, textAlign: 'center' }}>
          ¿Necesitás una cuenta? Pedile al administrador.
        </p>
        <p className="muted" style={{ textAlign: 'center' }}>
          <Link to="/">Advance Coat</Link>
        </p>
      </motion.div>
    </div>
  );
}
