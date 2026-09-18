import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  formatCurrency,
  formatShortDate,
  calculateCajaTotal,
  calculateCajaGanancia,
  calculateCambioCierre,
  SALE_SELLERS,
} from '@advance-coat/shared';
import { format, parseISO, isValid } from 'date-fns';
import {
  getCashTotalForDate,
  getOrCreateCajaCentral,
  registerMissingCajaDay,
} from '../services/caja';
import { getSales } from '../services/sales';
import { useAuth } from '../context/AuthContext';

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function CajaRegisterMissingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const initialDate =
    searchParams.get('date') || format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  const isPaulaBackfill = initialDate === '2026-09-17';

  const [dateStr, setDateStr] = useState(initialDate);
  const [cajaCambio, setCajaCambio] = useState(isPaulaBackfill ? '27700' : '0');
  const [cajaTotalStr, setCajaTotalStr] = useState(isPaulaBackfill ? '67700' : '');
  const [totalGuardado, setTotalGuardado] = useState(isPaulaBackfill ? '40000' : '0');
  const [closedByName, setClosedByName] = useState(isPaulaBackfill ? 'Paula' : '');
  const [retiroAmount, setRetiroAmount] = useState(isPaulaBackfill ? '40000' : '');
  const [retiroByName, setRetiroByName] = useState(isPaulaBackfill ? 'Paula' : '');
  const [cashSales, setCashSales] = useState(0);
  const [centralBalance, setCentralBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalManual, setTotalManual] = useState(isPaulaBackfill);

  const date = useMemo(() => parseDateInput(dateStr), [dateStr]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sales = await getSales();
        if (cancelled) return;
        if (date) {
          const cash = getCashTotalForDate(sales, date);
          setCashSales(cash);
          if (!totalManual) {
            const cambio = Number(cajaCambio) || 0;
            setCajaTotalStr(String(calculateCajaTotal(cash, cambio)));
          }
        }
        if (user) {
          const central = await getOrCreateCajaCentral({
            userId: user.uid,
            userName: profile?.name,
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
  }, [dateStr, isAdmin, user?.uid, profile?.name]);

  useEffect(() => {
    if (!date || totalManual) return;
    let cancelled = false;
    (async () => {
      const sales = await getSales();
      if (cancelled) return;
      const cash = getCashTotalForDate(sales, date);
      setCashSales(cash);
      const cambio = Number(cajaCambio) || 0;
      setCajaTotalStr(String(calculateCajaTotal(cash, cambio)));
    })();
    return () => {
      cancelled = true;
    };
  }, [dateStr, cajaCambio, totalManual, date]);

  const cambioNum = Number(cajaCambio) || 0;
  const guardadoNum = Number(totalGuardado) || 0;
  const retiroNum = Number(retiroAmount) || 0;
  const cajaTotal = Number(cajaTotalStr) || 0;
  const suggestedTotal = calculateCajaTotal(cashSales, cambioNum);
  const ganancia = calculateCajaGanancia(cajaTotal, cambioNum);
  const cambioCierre = calculateCambioCierre(cajaTotal, guardadoNum);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !date) return;
    if (!closedByName) {
      window.alert('Seleccioná quién cerró la caja');
      return;
    }
    if (retiroNum > 0 && !retiroByName) {
      window.alert('Seleccioná quién retiró');
      return;
    }

    const centralNote =
      centralBalance != null
        ? `\n\nSaldo actual de caja central: ${formatCurrency(centralBalance)}.\nAl guardar se deposita ${formatCurrency(guardadoNum)} y, si hay retiro, se resta ${formatCurrency(retiroNum)}.`
        : '';

    if (
      !window.confirm(
        `¿Registrar cierre del ${formatShortDate(date)}?${centralNote}\n\nConfirmá que los montos son correctos.`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await registerMissingCajaDay({
        date,
        cajaCambio: cambioNum,
        cajaTotal,
        totalGuardado: guardadoNum,
        closedByName,
        updatedBy: user.uid,
        updatedByName: profile?.name,
        retiroAmount: retiroNum > 0 ? retiroNum : undefined,
        retiroByName: retiroNum > 0 ? retiroByName : undefined,
      });
      navigate('/caja/list');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="empty-state card">
        <h3>Solo administradores</h3>
        <Link to="/caja/list" className="btn btn-ghost">
          Volver
        </Link>
      </div>
    );
  }

  if (loading) return <div className="loading-screen">Cargando…</div>;

  return (
    <div className="caja-page">
      <Link to="/caja/list" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Volver
      </Link>
      <h3 style={{ margin: 0 }}>Registrar día faltante</h3>
      <p className="muted" style={{ marginTop: 6 }}>
        Para cierres o retiros hechos a mano (fuera de la app). Ejemplo: 17/09 Paula.
      </p>

      {centralBalance != null && (
        <div className="alert alert-info" style={{ marginTop: 12 }}>
          Caja central ahora: <strong>{formatCurrency(centralBalance)}</strong>
        </div>
      )}

      <form className="card" onSubmit={(e) => void handleSave(e)} style={{ marginTop: 16 }}>
        <div className="field">
          <label>Fecha</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Caja cambio</label>
          <input
            type="number"
            value={cajaCambio}
            onChange={(e) => setCajaCambio(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Caja total</label>
          <input
            type="number"
            value={cajaTotalStr}
            onChange={(e) => {
              setTotalManual(true);
              setCajaTotalStr(e.target.value);
            }}
            required
          />
          <p className="hint" style={{ marginTop: 6 }}>
            Sugerido por app: ventas efectivo ({formatCurrency(cashSales)}) + cambio (
            {formatCurrency(cambioNum)}) = {formatCurrency(suggestedTotal)}. Podés editarlo si
            cerraron a mano.
          </p>
        </div>
        <div className="field">
          <label>Total guardado (a central)</label>
          <input
            type="number"
            value={totalGuardado}
            onChange={(e) => setTotalGuardado(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Quién cerró</label>
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

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />

        <div className="field">
          <label>Retiro de central (opcional)</label>
          <input
            type="number"
            value={retiroAmount}
            onChange={(e) => setRetiroAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        {retiroNum > 0 && (
          <div className="field">
            <label>Quién retiró</label>
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
        )}

        <p className="muted">
          Ganancia: {formatCurrency(ganancia)} · Dejo en caja:{' '}
          {formatCurrency(cambioCierre)}
          {retiroNum > 0
            ? ` · Retiro: ${formatCurrency(retiroNum)}`
            : ''}
        </p>

        <button type="submit" className="btn btn-primary" disabled={saving || !date}>
          {saving ? 'Guardando…' : 'Registrar cierre'}
        </button>
      </form>
    </div>
  );
}
