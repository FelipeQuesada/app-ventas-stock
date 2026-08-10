import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  formatCurrency,
  formatShortDate,
  calculateCajaGanancia,
  calculateCambioCierre,
} from '@advance-coat/shared';
import { getCajaByDate, parseCajaId, saveCaja } from '../services/caja';
import { useAuth } from '../context/AuthContext';

export function CajaEditPage() {
  const { date: dateParam } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const date = dateParam ? parseCajaId(dateParam) : null;

  const [cajaCambio, setCajaCambio] = useState('');
  const [cajaTotal, setCajaTotal] = useState('');
  const [totalGuardado, setTotalGuardado] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date) {
      setError('Fecha inválida');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const existing = await getCajaByDate(date);
        if (!existing) {
          setError('No hay caja para esa fecha');
          return;
        }
        if (!cancelled) {
          setCajaCambio(String(existing.cajaCambio));
          setCajaTotal(String(existing.cajaTotal));
          setTotalGuardado(String(existing.totalGuardado));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateParam]);

  const cambioNum = Number(cajaCambio) || 0;
  const totalNum = Number(cajaTotal) || 0;
  const guardadoNum = Number(totalGuardado) || 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !user) return;
    setSaving(true);
    try {
      await saveCaja({
        date,
        cajaCambio: cambioNum,
        cajaTotal: totalNum,
        totalGuardado: guardadoNum,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      navigate('/caja/list');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (!date || error) {
    return (
      <div className="empty-state card">
        <h3>{error || 'Error'}</h3>
        <Link to="/caja/list" className="btn btn-ghost">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to="/caja/list" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Volver
      </Link>
      <h3>Editar caja · {formatShortDate(date)}</h3>

      <form className="card" onSubmit={handleSave} style={{ marginTop: 16 }}>
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
            value={cajaTotal}
            onChange={(e) => setCajaTotal(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Total guardado</label>
          <input
            type="number"
            value={totalGuardado}
            onChange={(e) => setTotalGuardado(e.target.value)}
            required
          />
        </div>
        <p className="muted">
          Ganancia: {formatCurrency(calculateCajaGanancia(totalNum, cambioNum))} · Cierre:{' '}
          {formatCurrency(calculateCambioCierre(totalNum, guardadoNum))}
        </p>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
