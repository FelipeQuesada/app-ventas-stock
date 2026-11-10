import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import type { BusinessType, SalesChannel, SellingStatus } from '@advance-coat/shared';
import { isValidCuitCuil } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, registerBrandOwner } from '../services/auth';
import { updateBrand } from '../services/brands';

type Step = 1 | 2 | 3;

const BUSINESS_TYPES: { id: BusinessType; label: string }[] = [
  { id: 'kiosco', label: 'Kiosco' },
  { id: 'almacen', label: 'Almacén / despensa' },
  { id: 'tienda', label: 'Tienda / local' },
  { id: 'mayorista', label: 'Mayorista' },
  { id: 'otro', label: 'Otro' },
];

const SELLING_OPTIONS: { id: SellingStatus; label: string }[] = [
  { id: 'yes', label: 'Sí, ya vendo' },
  { id: 'starting', label: 'Estoy arrancando' },
  { id: 'no', label: 'Todavía no' },
];

const CHANNELS: { id: SalesChannel; label: string }[] = [
  { id: 'local', label: 'Local físico' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram / redes' },
  { id: 'web', label: 'Tienda online' },
  { id: 'otro', label: 'Otro' },
];

export function RegisterPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // Paso 1
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Paso 2
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');

  // Paso 3
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [sellingStatus, setSellingStatus] = useState<SellingStatus | ''>('');
  const [channels, setChannels] = useState<SalesChannel[]>([]);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stepLabel = useMemo(() => {
    if (step === 1) return 'Creá tu cuenta';
    if (step === 2) return 'Datos de tu marca';
    return 'Personalizá tu experiencia';
  }, [step]);

  if (loading) return <div className="loading-screen">Cargando…</div>;
  // Solo salimos si ya tiene perfil de marca; si Auth quedó a medias, puede completar acá
  if (user && profile?.brandId && step !== 3) return <Navigate to="/app" replace />;

  function toggleChannel(id: SalesChannel) {
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function goNextFromStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (brandName.trim().length < 2) {
      setError('Ingresá el nombre de tu marca.');
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
    setStep(2);
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!ownerName.trim()) {
      setError('Ingresá tu nombre.');
      return;
    }
    const cuitTrim = cuit.replace(/\D/g, '');
    if (cuitTrim && !isValidCuitCuil(cuitTrim)) {
      setError('El CUIT/CUIL no es válido.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerBrandOwner({
        email,
        password,
        ownerName,
        brandName,
        phone,
        cuit: cuitTrim || undefined,
      });
      await refreshProfile();
      setBrandId(result.brandId);
      setStep(3);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      // Si Auth quedó abierto sin perfil, intentamos reparar
      await refreshProfile().catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function finishOnboarding(skip = false) {
    setError('');
    setSubmitting(true);
    try {
      if (!skip && brandId) {
        await updateBrand(brandId, {
          businessType: businessType || null,
          sellingStatus: sellingStatus || null,
          salesChannels: channels.length ? channels : null,
        });
      }
      await refreshProfile();
      navigate('/app', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
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
          <h1>Creá tu marca y multiplicá el control de tu negocio</h1>
          <p>
            Ventas, stock y caja en un solo lugar. Empezá gratis y sumá empleados cuando los
            necesites.
          </p>
          <ul className="register-aside-points">
            <li>Registro en minutos</li>
            <li>Usuarios y roles por marca</li>
            <li>Plan gratis para empezar</li>
          </ul>
        </div>
      </aside>

      <main className="register-main">
        <div className="register-card">
          <Link to="/" className="register-mobile-logo">
            Control<span>+</span>
          </Link>
          <div className="register-progress" aria-hidden>
            <span className={step >= 1 ? 'is-on' : ''} />
            <span className={step >= 2 ? 'is-on' : ''} />
            <span className={step >= 3 ? 'is-on' : ''} />
          </div>
          <p className="register-step-meta">Paso {step} de 3 · {stepLabel}</p>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={goNextFromStep1}
              >
                <h2>¡Creá tu Control+</h2>
                <p className="subtitle">Solo necesitás el nombre de tu marca y tu email.</p>

                <div className="field">
                  <label htmlFor="brandName">Nombre de tu marca (lo podés modificar más tarde)</label>
                  <input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ejemplo: Mi Kiosco"
                    autoFocus
                    required
                    minLength={2}
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
                  <span>
                    Al continuar, aceptás los términos de uso de Control+.
                  </span>
                </label>

                {error && <p className="error-text">{error}</p>}

                <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
                  Crear marca gratis
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={(e) => void createAccount(e)}
              >
                <button
                  type="button"
                  className="register-back"
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <h2>Contanos un poco más</h2>
                <p className="subtitle">
                  Estos datos ayudan a configurar tu marca. El CUIT/CUIL es opcional.
                </p>

                <div className="field">
                  <label htmlFor="ownerName">Tu nombre</label>
                  <input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nombre y apellido"
                    autoFocus
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone">WhatsApp / teléfono</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="11 1234-5678"
                  />
                </div>

                <div className="field">
                  <label htmlFor="cuit">CUIT / CUIL (opcional)</label>
                  <input
                    id="cuit"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="20-12345678-9"
                    inputMode="numeric"
                  />
                </div>

                {error && <p className="error-text">{error}</p>}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting ? 'Creando tu marca…' : 'Continuar'}
                </button>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <h2>Personalizá tu experiencia</h2>
                <p className="subtitle">
                  Respuestas cortas para adaptar Control+ a tu negocio. Podés omitir este paso.
                </p>

                <fieldset className="register-fieldset">
                  <legend>¿Qué tipo de negocio tenés?</legend>
                  <div className="register-chips">
                    {BUSINESS_TYPES.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`register-chip ${businessType === opt.id ? 'is-active' : ''}`}
                        onClick={() => setBusinessType(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="register-fieldset">
                  <legend>¿Ya estás vendiendo?</legend>
                  <div className="register-chips">
                    {SELLING_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`register-chip ${sellingStatus === opt.id ? 'is-active' : ''}`}
                        onClick={() => setSellingStatus(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="register-fieldset">
                  <legend>¿Por dónde vendés? (podés elegir varias)</legend>
                  <div className="register-chips">
                    {CHANNELS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`register-chip ${channels.includes(opt.id) ? 'is-active' : ''}`}
                        onClick={() => toggleChannel(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {error && <p className="error-text">{error}</p>}

                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={submitting}
                  style={{ width: '100%' }}
                  onClick={() => void finishOnboarding(false)}
                >
                  {submitting ? 'Entrando…' : 'Empezar a usar Control+'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={submitting}
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => void finishOnboarding(true)}
                >
                  Omitir por ahora
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 1 && (
            <p className="muted register-footer-link">
              ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
