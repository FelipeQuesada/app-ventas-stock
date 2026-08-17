import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import {
  bootstrapOwnerAdmin,
  completeOwnerAdminProfile,
  getAuthErrorMessage,
  resetPassword,
  signOutUser,
  OWNER_ADMIN_EMAIL,
} from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

export function AdminSetupPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, profileError } = useAuth();
  const sessionEmail = user?.email?.trim().toLowerCase() ?? '';
  const needsProfileOnly = !!user && !profile && sessionEmail === OWNER_ADMIN_EMAIL;
  const [name, setName] = useState('Felipe Quesada');
  const [email, setEmail] = useState(OWNER_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setInfo('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setSaving(false);
      return;
    }
    try {
      await bootstrapOwnerAdmin(email, password, name);
      await refreshProfile?.();
      setDone(true);
      setTimeout(() => navigate('/admin', { replace: true }), 800);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setShowReset(
        code === 'auth/owner-password-mismatch' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password'
      );
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteProfile() {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await completeOwnerAdminProfile(name);
      await refreshProfile?.();
      setDone(true);
      setTimeout(() => navigate('/admin', { replace: true }), 800);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setError('');
    setInfo('');
    try {
      await resetPassword(email);
      setInfo(`Te mandamos un mail a ${email} para elegir una contraseña nueva. Después volvé acá y completá el setup con esa contraseña.`);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  if (needsProfileOnly) {
    return (
      <div className="admin-setup-page">
        <div className="admin-setup-card">
          <div className="admin-setup-header">
            <div className="admin-brand-icon">
              <Shield size={22} />
            </div>
            <div>
              <h1>Falta tu perfil de admin</h1>
              <p>
                Ya iniciaste sesión como {sessionEmail}, pero todavía no existe tu perfil en la base
                de datos. No hace falta la contraseña de nuevo.
              </p>
            </div>
          </div>

          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {profileError && (
            <p className="muted" style={{ marginTop: 0 }}>
              Firestore respondió: {profileError}
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
          {done && <p className="success-text">Perfil creado. Entrando al panel…</p>}

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={saving || done}
            onClick={() => void handleCompleteProfile()}
          >
            {saving ? 'Creando…' : 'Crear mi perfil de admin'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => void signOutUser()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-setup-page">
      <form className="admin-setup-card" onSubmit={handleSubmit}>
        <div className="admin-setup-header">
          <div className="admin-brand-icon">
            <Shield size={22} />
          </div>
          <div>
            <h1>Setup administrador</h1>
            <p>Creá el acceso dueño del panel web. Solo funciona con el email autorizado.</p>
          </div>
        </div>

        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Tu contraseña segura"
              autoComplete="new-password"
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
        <div className="field">
          <label>Confirmar contraseña</label>
          <div className="password-field">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Repetí la contraseña"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {info && <p className="success-text">{info}</p>}
        {done && <p className="success-text">Admin listo. Entrando al panel…</p>}

        <button type="submit" className="btn btn-primary" disabled={saving || done} style={{ width: '100%' }}>
          {saving ? 'Creando…' : 'Crear / activar admin'}
        </button>

        {showReset && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleReset()}
            style={{ width: '100%', marginTop: 10 }}
          >
            Restablecer contraseña por email
          </button>
        )}

        <p className="muted" style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link> y después andá a{' '}
          <Link to="/admin">/admin</Link>
        </p>
      </form>
    </div>
  );
}
