import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, List, MessageCircle, X } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  capitalize,
  calculateCajaTotal,
  buildSinMovimientoCaja,
  buildCajaCierreMessage,
  buildCajaRetiroMessage,
  buildWhatsAppUrl,
  CAJA_WHATSAPP_PHONE,
} from '@advance-coat/shared';
import {
  getCajaByDate,
  getCajaCambioFromPreviousDay,
  getTodayCashTotal,
  saveCaja,
  updateTotalGuardado,
} from '../services/caja';
import { getSales } from '../services/sales';
import { useAuth } from '../context/AuthContext';

function CajaRow({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`caja-row ${highlight ? 'caja-row-highlight' : ''}`}>
      <span className="caja-row-label">{label}</span>
      <span className={`caja-row-value ${accent ? 'caja-row-value-accent' : ''}`}>{value}</span>
    </div>
  );
}

export function CajaPage() {
  const { user, profile } = useAuth();
  const today = new Date();
  const [cajaCambio, setCajaCambio] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [montoGuardo, setMontoGuardo] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [retiroVisible, setRetiroVisible] = useState(false);
  const [processingRetiro, setProcessingRetiro] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [existing, prevCambio, sales] = await Promise.all([
          getCajaByDate(today),
          getCajaCambioFromPreviousDay(today),
          getSales(),
        ]);
        if (cancelled) return;
        setCashSales(getTodayCashTotal(sales));
        setCajaCambio(String(existing?.cajaCambio ?? prevCambio ?? 0));
        setTotalGuardado(existing?.totalGuardado ?? 0);
        setSinMovimiento(existing?.sinMovimiento === true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambioNum = Number(cajaCambio) || 0;
  const cajaTotal = calculateCajaTotal(cashSales, cambioNum);
  const guardoPendiente = Number(montoGuardo) || 0;
  const totalGuardadoPreview = totalGuardado + Math.max(0, guardoPendiente);
  const ganancia = cajaTotal - cambioNum;
  const cambioCierre = cajaTotal - totalGuardadoPreview;
  const canMarkNoMovement = cashSales === 0;

  function offerShare(title: string, message: string) {
    setShareTitle(title);
    setShareMessage(message);
    setCopied(false);
  }

  async function copyShareMessage() {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
    } catch {
      window.alert('No se pudo copiar el mensaje');
    }
  }

  function openWhatsAppShare() {
    if (!shareMessage) return;
    window.open(buildWhatsAppUrl(CAJA_WHATSAPP_PHONE, shareMessage), '_blank');
  }

  async function handleRetiro() {
    if (!user) return;
    const amount = Number(montoRetiro);
    if (!amount || amount <= 0) {
      window.alert('Ingresá un monto válido para el retiro');
      return;
    }
    if (amount > totalGuardado) {
      window.alert('El retiro no puede ser mayor al total guardado');
      return;
    }

    setProcessingRetiro(true);
    try {
      const newTotal = totalGuardado - amount;
      await updateTotalGuardado(today, newTotal, cambioNum, cajaTotal, user.uid, profile?.name);
      setTotalGuardado(newTotal);
      setMontoRetiro('');
      setRetiroVisible(false);
      setInfo(`Retiro registrado: ${formatCurrency(amount)}`);
      offerShare(
        'Retiro registrado',
        buildCajaRetiroMessage({ date: today, amount, totalGuardado: newTotal })
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo registrar el retiro');
    } finally {
      setProcessingRetiro(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (guardoPendiente < 0) {
      window.alert('Ingresá un monto válido para guardar');
      return;
    }

    const finalTotalGuardado = totalGuardado + guardoPendiente;
    if (finalTotalGuardado > cajaTotal) {
      window.alert('El total guardado no puede superar la caja total');
      return;
    }

    setSaving(true);
    setInfo('');
    try {
      await saveCaja({
        date: today,
        cajaCambio: cambioNum,
        cajaTotal,
        totalGuardado: finalTotalGuardado,
        sinMovimiento: false,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      const leftInCaja = cajaTotal - finalTotalGuardado;
      setTotalGuardado(finalTotalGuardado);
      setMontoGuardo('');
      setSinMovimiento(false);
      setInfo(`Caja guardada — cambio para mañana: ${formatCurrency(leftInCaja)}`);
      offerShare(
        'Caja guardada',
        buildCajaCierreMessage({
          date: today,
          cajaCambio: cambioNum,
          cajaTotal,
          ganancia,
          totalGuardado: finalTotalGuardado,
          cambioCierre: leftInCaja,
        })
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleNoMovement() {
    if (!user) return;
    if (!canMarkNoMovement) {
      window.alert('Hay ventas en efectivo hoy. No se puede marcar sin movimiento.');
      return;
    }
    if (
      !window.confirm(
        '¿Confirmás que hoy no hubo movimiento de caja? El cambio de apertura queda igual para mañana.'
      )
    ) {
      return;
    }

    setSaving(true);
    setInfo('');
    try {
      const payload = buildSinMovimientoCaja(cambioNum);
      await saveCaja({
        date: today,
        ...payload,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      setTotalGuardado(0);
      setMontoGuardo('');
      setSinMovimiento(true);
      setInfo('Registrado: sin movimiento de caja');
      offerShare(
        'Sin movimiento registrado',
        buildCajaCierreMessage({
          date: today,
          ...payload,
          sinMovimiento: true,
        })
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando caja…</div>;

  return (
    <form className="caja-page" onSubmit={handleSave}>
      <div className="caja-header">
        <div>
          <h3 className="caja-date">{capitalize(formatDate(today))}</h3>
          <p className="caja-subtitle">Resumen de caja en efectivo del día</p>
          {sinMovimiento && <p className="caja-badge">Registrado: sin movimiento</p>}
        </div>
        <Link to="/caja/list" className="btn btn-ghost btn-sm">
          <List size={14} /> Historial
        </Link>
      </div>

      <button
        type="button"
        className="btn btn-ghost caja-withdraw-btn"
        onClick={() => setRetiroVisible(true)}
      >
        Retirar dinero
      </button>

      <div className="card caja-card">
        <div className="field">
          <label>Caja cambio</label>
          <input
            type="number"
            min="0"
            value={cajaCambio}
            onChange={(e) => setCajaCambio(e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <p className="caja-hint">Lo que quedó en caja del día anterior (podés modificarlo)</p>

        <div className="caja-divider" />

        <CajaRow label="Ventas efectivo hoy" value={formatCurrency(cashSales)} />
        <p className="caja-hint">Solo ventas del día en efectivo</p>

        <div className="caja-divider" />

        <CajaRow label="Caja total" value={formatCurrency(cajaTotal)} />
        <p className="caja-hint">Ventas en efectivo + caja cambio</p>

        <div className="caja-divider" />

        <CajaRow label="Ganancia" value={formatCurrency(ganancia)} highlight accent />
        <p className="caja-hint">Caja total − Caja cambio (= ventas efectivo)</p>
      </div>

      <div className="card caja-card">
        <CajaRow label="Total guardado" value={formatCurrency(totalGuardadoPreview)} highlight />
        <p className="caja-hint">Acumulado en caja central (guardados − retiros)</p>

        <div className="caja-divider" />

        <div className="field">
          <label>Guardo (caja central)</label>
          <input
            type="number"
            min="0"
            value={montoGuardo}
            onChange={(e) => setMontoGuardo(e.target.value)}
            placeholder="0"
          />
        </div>
        <p className="caja-hint">Se suma al total guardado al tocar “Guardar cierre de caja”</p>

        <div className="caja-divider" />

        <CajaRow label="Cambio para mañana" value={formatCurrency(cambioCierre)} highlight />
        <p className="caja-hint">Caja total − Total guardado</p>
      </div>

      {info && <p className="success-text">{info}</p>}

      <button type="submit" className="btn btn-secondary caja-save-btn" disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar cierre de caja'}
      </button>

      {canMarkNoMovement && (
        <button
          type="button"
          className="btn btn-ghost caja-nomovement-btn"
          disabled={saving}
          onClick={() => void handleNoMovement()}
        >
          No hubo movimiento de caja
        </button>
      )}

      {retiroVisible && (
        <div className="modal-overlay" onClick={() => setRetiroVisible(false)}>
          <div className="modal-card caja-modal" onClick={(e) => e.stopPropagation()}>
            <div className="caja-modal-header">
              <h3 style={{ margin: 0 }}>Retirar dinero</h3>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setRetiroVisible(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p className="caja-modal-label">Disponible en caja central</p>
            <p className="caja-modal-amount">{formatCurrency(totalGuardado)}</p>

            <div className="field">
              <label>Monto a retirar</label>
              <input
                type="number"
                min="0"
                value={montoRetiro}
                onChange={(e) => setMontoRetiro(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <p className="caja-hint">El monto se descontará del total guardado.</p>

            <div className="caja-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMontoRetiro('');
                  setRetiroVisible(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={processingRetiro}
                onClick={() => void handleRetiro()}
              >
                {processingRetiro ? 'Procesando…' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareMessage && (
        <div className="modal-overlay" onClick={() => setShareMessage(null)}>
          <div className="modal-card caja-modal" onClick={(e) => e.stopPropagation()}>
            <div className="caja-modal-header">
              <h3 style={{ margin: 0 }}>{shareTitle}</h3>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => setShareMessage(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <pre className="caja-share-preview">{shareMessage}</pre>

            <div className="caja-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => void copyShareMessage()}>
                <Copy size={16} /> {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button type="button" className="btn btn-primary" onClick={openWhatsAppShare}>
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
