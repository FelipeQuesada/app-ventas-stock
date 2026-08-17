import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import {
  bootstrapOwnerAdmin,
  getAuthErrorMessage,
  resetPassword,
  OWNER_ADMIN_EMAIL,
} from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

export function AdminSetupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
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
