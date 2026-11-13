import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, RefreshCw } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  DEFAULT_BRAND_ID,
  PLAN_DEFINITIONS,
  STANDARD_PAYMENT_METHODS,
  type PaymentMethod,
} from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import {
  updateBrand,
  ensureBrandInviteCode,
  regenerateBrandInviteCode,
} from '../services/brands';
import { storage } from '../lib/firebase';
import { ImageDropzone } from '../components/ImageDropzone';

const ADVANCE_LOGO_PATH = '/logo-advance.png';
const DEFAULT_PRO_PAYMENTS: PaymentMethod[] = STANDARD_PAYMENT_METHODS.map((pm) => pm.value);

export function BrandSettingsPage() {
  const { user } = useAuth();
  const { brand, isBrandAdmin, limits, refreshBrand } = useBrand();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [paymentMethodIds, setPaymentMethodIds] = useState<PaymentMethod[]>(DEFAULT_PRO_PAYMENTS);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!brand) return;
    setName(brand.name ?? '');
    setPhone(brand.phone ?? '');
    setWhatsapp(brand.whatsapp ?? brand.phone ?? '');
    setInviteCode(brand.inviteCode ?? '');
    const saved = brand.paymentMethodIds?.filter(Boolean) ?? [];
    setPaymentMethodIds(saved.length > 0 ? saved : DEFAULT_PRO_PAYMENTS);
    setTelegramChatId(brand.telegramChatId ?? '');
    setTelegramEnabled(brand.telegramEnabled !== false);
  }, [
    brand?.id,
    brand?.name,
    brand?.phone,
    brand?.whatsapp,
    brand?.inviteCode,
    brand?.paymentMethodIds,
    brand?.telegramChatId,
    brand?.telegramEnabled,
  ]);

  useEffect(() => {
    if (!brand?.id || brand.inviteCode) return;
    let cancelled = false;
    void ensureBrandInviteCode(brand.id)
      .then(async (code) => {
        if (cancelled) return;
        setInviteCode(code);
        await refreshBrand();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [brand?.id, brand?.inviteCode, refreshBrand]);

  if (!isBrandAdmin) return <Navigate to="/app" replace />;
  if (!brand) return <div className="muted">Cargando marca…</div>;

  const isAdvance = brand.id === DEFAULT_BRAND_ID;
  const logoPreview = brand.logoUrl || (isAdvance ? ADVANCE_LOGO_PATH : null);

  async function uploadLogoBlob(blob: Blob, filename: string) {
    if (!brand || !user) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const path = `brands/${brand.id}/logo-${Date.now()}-${filename}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateBrand(brand.id, { logoUrl: url });
      await refreshBrand();
      setMessage('Logo actualizado.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!brand) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateBrand(brand.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
      });
      await refreshBrand();
      setMessage('Marca actualizada.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(file: File) {
    await uploadLogoBlob(file, file.name.replace(/[^\w.-]+/g, '_') || 'logo.jpg');
  }

  async function handleUseAdvanceLogo() {
    try {
      const res = await fetch(ADVANCE_LOGO_PATH);
      if (!res.ok) throw new Error('No se pudo cargar el logo de Advance');
      const blob = await res.blob();
      await uploadLogoBlob(blob, 'logo-advance.png');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCopyInvite() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMessage('Código copiado.');
      setError('');
    } catch {
      setError('No se pudo copiar el código.');
    }
  }

  async function handleRegenerateInvite() {
    if (!brand) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const code = await regenerateBrandInviteCode(brand.id);
      setInviteCode(code);
      await refreshBrand();
      setMessage('Código regenerado. El anterior deja de valer.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const plan = PLAN_DEFINITIONS[brand.planId] ?? PLAN_DEFINITIONS.starter;
  const canConfigurePayments = !isAdvance && limits.multiPayment;
  const canConfigureTelegram = limits.telegram;

  function togglePaymentMethod(method: PaymentMethod) {
    if (method === 'transferencia') return;
    setPaymentMethodIds((current) => {
      if (current.includes(method)) {
        return current.filter((id) => id !== method);
      }
      return [...current, method];
    });
  }

  async function handleSavePayments() {
    if (!brand || !canConfigurePayments) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const next = Array.from(
        new Set<PaymentMethod>(['transferencia', ...paymentMethodIds.filter((id) => id !== 'transferencia')])
      );
      await updateBrand(brand.id, { paymentMethodIds: next });
      setPaymentMethodIds(next);
      await refreshBrand();
      setMessage('Medios de pago actualizados.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTelegram() {
    if (!brand || !canConfigureTelegram) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const chat = telegramChatId.trim();
      await updateBrand(brand.id, {
        telegramChatId: chat || null,
        telegramEnabled,
      });
      await refreshBrand();
      setMessage(
        isAdvance
          ? 'Preferencia de Telegram guardada. Advance usa el bot global de Control+.'
          : chat
            ? 'Telegram conectado. Los cierres de caja avisarán a ese grupo.'
            : 'Telegram guardado sin chat: no se enviarán avisos hasta cargar el ID.'
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tu marca</h3>
        <p className="muted">
          Plan: <strong>{plan.name}</strong> · Estado: {brand.status}
        </p>

        <form onSubmit={handleSaveBrand} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="brandName">Nombre</label>
            <input id="brandName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="brandWhatsapp">WhatsApp de la marca</label>
            <input
              id="brandWhatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="11 5771 5316"
              inputMode="tel"
            />
            <p className="caja-hint">
              Se usa al compartir cierres de caja y en el pie de presupuestos / tickets.
            </p>
          </div>
          <div className="field">
            <label htmlFor="brandPhone">Teléfono (opcional)</label>
            <input
              id="brandPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Si es distinto al WhatsApp"
              inputMode="tel"
            />
          </div>

          <ImageDropzone
            label="Logo de la marca"
            previewUrl={logoPreview}
            previewAlt={brand.name}
            disabled={saving}
            onFile={(file) => void handleLogoFile(file)}
          />

          {isAdvance && !brand.logoUrl ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 12 }}
              disabled={saving}
              onClick={() => void handleUseAdvanceLogo()}
            >
              Usar logo Advance guardado
            </button>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 16 }}>
            {saving ? 'Guardando…' : 'Guardar marca'}
          </button>
        </form>
      </div>

      {canConfigurePayments ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Medios de pago</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            En el plan gratis solo aparece Transferencia. Acá elegís qué otros medios mostrás al
            cobrar.
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {STANDARD_PAYMENT_METHODS.map((pm) => {
              const checked = paymentMethodIds.includes(pm.value);
              const locked = pm.value === 'transferencia';
              return (
                <label
                  key={pm.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: locked ? 0.85 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked || locked}
                    disabled={locked || saving}
                    onChange={() => togglePaymentMethod(pm.value)}
                  />
                  <span>
                    {pm.label}
                    {locked ? ' (siempre activo)' : ''}
                  </span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            disabled={saving}
            onClick={() => void handleSavePayments()}
          >
            {saving ? 'Guardando…' : 'Guardar medios de pago'}
          </button>
        </div>
      ) : !isAdvance ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Medios de pago</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            En el plan Inicio solo está disponible <strong>Transferencia</strong>. Pasá a Pro para
            habilitar efectivo, débito, crédito, QR y Mercado Pago.
          </p>
        </div>
      ) : null}

      {canConfigureTelegram ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Telegram</h3>
          {isAdvance ? (
            <p className="muted" style={{ marginTop: 0 }}>
              Advance usa el bot y el grupo global que configuramos nosotros (secretos de Cloud
              Functions). Acá solo podés pausar o reactivar los avisos de esta marca.
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 0 }}>
              Creá un grupo, sumá al bot de Control+, y pegá el <strong>chat ID</strong> del grupo.
              Si preferís, lo configuramos nosotros en el plan Empresa.
            </p>
          )}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
            }}
          >
            <input
              type="checkbox"
              checked={telegramEnabled}
              disabled={saving}
              onChange={(e) => setTelegramEnabled(e.target.checked)}
            />
            <span>Enviar avisos de cierre / ventas</span>
          </label>
          {!isAdvance ? (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="telegramChatId">Chat ID del grupo</label>
              <input
                id="telegramChatId"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100…"
                disabled={saving}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            disabled={saving}
            onClick={() => void handleSaveTelegram()}
          >
            {saving ? 'Guardando…' : 'Guardar Telegram'}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Telegram</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Los avisos al grupo están en Pro y Empresa. En Inicio no se conecta el bot.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Código para empleados</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Compartí este código para que un empleado se registre solo en{' '}
          <strong>/join</strong>. Después lo validás en Usuarios.
        </p>
        <div
          className="row"
          style={{
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <code
            style={{
              fontSize: 22,
              letterSpacing: '0.18em',
              fontWeight: 700,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-muted, #eef2f7)',
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {inviteCode || '······'}
          </code>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!inviteCode || saving}
            onClick={() => void handleCopyInvite()}
          >
            <Copy size={14} /> Copiar
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={saving}
            onClick={() => void handleRegenerateInvite()}
          >
            <RefreshCw size={14} /> Regenerar
          </button>
        </div>
      </div>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
