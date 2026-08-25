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
  SALE_SELLERS,
} from '@advance-coat/shared';
import {
  getCajaByDate,
  getCajaCambioFromPreviousDay,
  getOrCreateCajaCentral,
  getTodayCashTotal,
  saveCaja,
  withdrawFromCajaCentral,
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
  const isAdmin = profile?.role === 'admin';
  const today = new Date();
  const [cajaCambio, setCajaCambio] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [centralBalance, setCentralBalance] = useState(0);
  const [montoGuardo, setMontoGuardo] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [closedByName, setClosedByName] = useState('');
  const [retiroByName, setRetiroByName] = useState('');
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
        if (existing?.closedByName) setClosedByName(existing.closedByName);

        if (profile?.role === 'admin' && user) {
          const central = await getOrCreateCajaCentral({
            userId: user.uid,
            userName: profile.name,
          });
          if (!cancelled) setCentralBalance(central.balance);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, user?.uid]);

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
    if (!user || !isAdmin) return;
    const amount = Number(montoRetiro);
    if (!amount || amount <= 0) {
      window.alert('Ingresá un monto válido para el retiro');
      return;
    }
    if (!retiroByName) {
      window.alert('Seleccioná quién retira el dinero');
      return;
    }
    if (amount > centralBalance) {
      window.alert('El retiro no puede ser mayor al saldo de caja central');
      return;
    }

    setProcessingRetiro(true);
    try {
      const central = await withdrawFromCajaCentral({
        amount,
        actorName: retiroByName,
        userId: user.uid,
        userName: profile?.name,
      });
      setCentralBalance(central.balance);
      setMontoRetiro('');
      setRetiroVisible(false);
      setInfo(`Retiro registrado: ${formatCurrency(amount)}`);
      offerShare(
        'Retiro registrado',
        buildCajaRetiroMessage({
          date: today,
          amount,
          totalGuardado: central.balance,
          actorName: retiroByName,
        })
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
    if (!closedByName) {
      window.alert('Seleccioná quién cierra la caja');
      return;
    }
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
        depositoCentral: Math.max(0, guardoPendiente),
        sinMovimiento: false,
        closedByName,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      const leftInCaja = cajaTotal - finalTotalGuardado;
      setTotalGuardado(finalTotalGuardado);
      setMontoGuardo('');
      setSinMovimiento(false);
      if (isAdmin) {
        const central = await getOrCreateCajaCentral({
          userId: user.uid,
          userName: profile?.name,
        });
        setCentralBalance(central.balance);
      }
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
          closedByName,
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
    if (!closedByName) {
      window.alert('Seleccioná quién cierra la caja');
      return;
    }
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
        closedByName,
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
          closedByName,
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

      {isAdmin && (
        <div className="card caja-card caja-central-card">
          <CajaRow label="Caja central" value={formatCurrency(centralBalance)} highlight accent />
          <p className="caja-hint">Pozo acumulado. Los retiros salen de acá y no cambian el día.</p>
          <button
            type="button"
            className="btn btn-ghost caja-withdraw-btn"
            onClick={() => setRetiroVisible(true)}
          >
            Retirar dinero
          </button>
        </div>
      )}

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
        <CajaRow label="Transferido hoy" value={formatCurrency(totalGuardadoPreview)} highlight />
        <p className="caja-hint">Lo enviado a caja central en este cierre (no baja por retiros)</p>

        <div className="caja-divider" />

        <div className="field">
          <label>Guardo (a caja central)</label>
          <input
            type="number"
            min="0"
            value={montoGuardo}
            onChange={(e) => setMontoGuardo(e.target.value)}
            placeholder="0"
          />
        </div>
        <p className="caja-hint">Se suma al pozo central al tocar “Guardar cierre de caja”</p>

        <div className="caja-divider" />

        <CajaRow label="Cambio para mañana" value={formatCurrency(cambioCierre)} highlight />
        <p className="caja-hint">Caja total − Transferido hoy</p>

        <div className="caja-divider" />

        <div className="field">
          <label>Quién cierra la caja</label>
          <select
            className="select-input"
            value={closedByName}
            onChange={(e) => setClosedByName(e.target.value)}
            required
          >
            <option value="">Seleccioná…</option>
            {SALE_SELLERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
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

      {retiroVisible && isAdmin && (
        <div className="modal-overlay" onClick={() => setRetiroVisible(false)}>
          <div className="modal-card caja-modal" onClick={(e) => e.stopPropagation()}>
            <div className="caja-modal-header">
              <h3 style={{ margin: 0 }}>Retirar de caja central</h3>
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
            <p className="caja-modal-amount">{formatCurrency(centralBalance)}</p>

            <div className="field">
              <label>Quién retira</label>
              <select
                className="select-input"
                value={retiroByName}
                onChange={(e) => setRetiroByName(e.target.value)}
                required
              >
                <option value="">Seleccioná…</option>
                {SALE_SELLERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

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
            <p className="caja-hint">Se descuenta solo del pozo central. El cierre del día no cambia.</p>

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
