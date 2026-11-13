import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { normalizeInviteCode } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, registerEmployeeWithInviteCode } from '../services/auth';

export function JoinPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneBrandName, setDoneBrandName] = useState<string | null>(null);

  if (loading) return <div className="loading-screen">Cargando…</div>;

  if (user && profile?.brandId && !profile.pendingApproval && !doneBrandName) {
    return <Navigate to="/app" replace />;
  }

  if (user && profile?.pendingApproval && !doneBrandName) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = normalizeInviteCode(inviteCode);
    if (code.length < 4) {
      setError('Ingresá el código de marca que te pasó tu administrador.');
      return;
    }
    if (!name.trim()) {
      setError('Ingresá tu nombre.');
      return;
    }
    if (!email.trim()) {
      setError('Ingresá un email válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!acceptedTerms) {
      setError('Tenés que aceptar los términos para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerEmployeeWithInviteCode({
        email,
        password,
        name,
        inviteCode: code,
      });
      await refreshProfile();
      setDoneBrandName(result.brandName);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      await refreshProfile().catch(() => undefined);
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
          <h1>Unite al equipo de tu marca</h1>
          <p>
            Pedile el código a tu administrador, registrate y esperá la validación. Después vas a
            poder vender y controlar stock con tu propia cuenta.
          </p>
          <ul className="register-aside-points">
            <li>Sin que el admin te cree el usuario</li>
            <li>Tu acceso queda pendiente de aprobación</li>
            <li>Misma app, roles claros</li>
          </ul>
        </div>
      </aside>

      <main className="register-main">
        <div className="register-card">
          <Link to="/" className="register-mobile-logo">
            Control<span>+</span>
          </Link>

          <AnimatePresence mode="wait">
            {doneBrandName ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <h2>Solicitud enviada</h2>
                <p className="subtitle">
                  Te sumaste a <strong>{doneBrandName}</strong>. Un administrador tiene que validar
                  tu cuenta antes de que puedas usar Control+.
                </p>
                <p className="muted" style={{ marginBottom: 16 }}>
                  Cuando te aprueben, iniciá sesión con el mismo email y contraseña.
                </p>
                <Link to="/app" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                  Ver estado
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={(e) => void handleSubmit(e)}
              >
                <h2>Registro de empleado</h2>
                <p className="subtitle">
                  Usá el código de invitación de tu marca. El dueño o un admin te va a validar.
                </p>

                <div className="field">
                  <label htmlFor="inviteCode">Código de marca</label>
                  <input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(normalizeInviteCode(e.target.value))}
                    placeholder="Ej. K7M2QX"
                    autoFocus
                    required
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </div>

                <div className="field">
                  <label htmlFor="name">Tu nombre</label>
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre y apellido"
                    required
                  />
                </div>

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

                <div className="field">
                  <label htmlFor="password">Contraseña</label>
                  <div className="password-field">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Definí tu contraseña"
                      required
                      minLength={6}
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

                <label className="register-check">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <span>Al continuar, aceptás los términos de uso de Control+.</span>
                </label>

                {error && <p className="error-text">{error}</p>}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'Enviando solicitud…' : 'Solicitar acceso'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {!doneBrandName && (
            <p className="muted register-footer-link">
              ¿Sos dueño? <Link to="/register">Registrá tu marca</Link>
              {' · '}
              ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
