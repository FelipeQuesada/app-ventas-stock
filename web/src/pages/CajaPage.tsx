import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { List, Save } from 'lucide-react';
import {
  formatCurrency,
  calculateCajaGanancia,
  calculateCambioCierre,
} from '@advance-coat/shared';
import {
  getCajaByDate,
  getCajaCambioFromPreviousDay,
  getTodayCashTotal,
  saveCaja,
} from '../services/caja';
import { getSales } from '../services/sales';
import { useAuth } from '../context/AuthContext';

export function CajaPage() {
  const { user, profile } = useAuth();
  const today = new Date();
  const [cajaCambio, setCajaCambio] = useState('');
  const [cajaTotal, setCajaTotal] = useState('');
  const [totalGuardado, setTotalGuardado] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState('');

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
        if (existing) {
          setCajaCambio(String(existing.cajaCambio));
          setCajaTotal(String(existing.cajaTotal));
          setTotalGuardado(String(existing.totalGuardado));
        } else {
          setCajaCambio(String(prevCambio || ''));
        }
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
  const totalNum = Number(cajaTotal) || 0;
  const guardadoNum = Number(totalGuardado) || 0;
  const ganancia = calculateCajaGanancia(totalNum, cambioNum);
  const cambioCierre = calculateCambioCierre(totalNum, guardadoNum);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setInfo('');
    try {
      await saveCaja({
        date: today,
        cajaCambio: cambioNum,
        cajaTotal: totalNum,
        totalGuardado: guardadoNum,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      setInfo('Caja guardada correctamente');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando caja…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Caja del día</h3>
          <p>{format(today, 'dd/MM/yyyy')}</p>
        </div>
        <Link to="/caja/list" className="btn btn-ghost">
          <List size={16} /> Historial
        </Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Efectivo ventas hoy</div>
          <div className="kpi-value">{formatCurrency(cashSales)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancia</div>
          <div className="kpi-value">{formatCurrency(ganancia)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cambio cierre</div>
          <div className="kpi-value">{formatCurrency(cambioCierre)}</div>
        </div>
      </div>

      <form className="card" onSubmit={handleSave}>
        <div className="field">
          <label>Caja cambio (apertura)</label>
          <input
            type="number"
            min="0"
            value={cajaCambio}
            onChange={(e) => setCajaCambio(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Caja total (cierre)</label>
          <input
            type="number"
            min="0"
            value={cajaTotal}
            onChange={(e) => setCajaTotal(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Total guardado</label>
          <input
            type="number"
            min="0"
            value={totalGuardado}
            onChange={(e) => setTotalGuardado(e.target.value)}
            required
          />
        </div>

        {info && <p className="success-text">{info}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Guardando…' : 'Guardar caja'}
        </button>
      </form>
    </div>
  );
}
