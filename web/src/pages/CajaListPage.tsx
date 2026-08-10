import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import type { DailyCaja } from '@advance-coat/shared';
import { formatCurrency, formatShortDate, formatMonthYear } from '@advance-coat/shared';
import { getCajaHistory, deleteCaja, getMonthCaja } from '../services/caja';
import { exportMonthCajaToExcel, exportMonthCajaToPdf } from '../services/export';

export function CajaListPage() {
  const [records, setRecords] = useState<DailyCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  async function load() {
    setLoading(true);
    try {
      setRecords(await getCajaHistory());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const monthDate = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [month]);

  const filtered = useMemo(() => getMonthCaja(records, monthDate), [records, monthDate]);

  async function handleDelete(record: DailyCaja) {
    if (!window.confirm(`¿Eliminar caja del ${formatShortDate(record.date)}?`)) return;
    await deleteCaja(record.date);
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
  }

  if (loading) return <div className="loading-screen">Cargando historial…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Historial de caja</h3>
          <p>{formatMonthYear(monthDate)}</p>
        </div>
        <div className="actions">
          <Link to="/caja" className="btn btn-ghost btn-sm">
            Caja de hoy
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportMonthCajaToExcel(records, monthDate).catch((e) =>
                window.alert(e.message)
              )
            }
          >
            <Download size={14} /> Excel
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportMonthCajaToPdf(records, monthDate).catch((e) => window.alert(e.message))
            }
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cambio</th>
              <th>Total</th>
              <th>Ganancia</th>
              <th>Guardado</th>
              <th>Cierre</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{formatShortDate(r.date)}</td>
                <td>{formatCurrency(r.cajaCambio)}</td>
                <td>{formatCurrency(r.cajaTotal)}</td>
                <td>{formatCurrency(r.ganancia)}</td>
                <td>{formatCurrency(r.totalGuardado)}</td>
                <td>{formatCurrency(r.cambioCierre)}</td>
                <td>
                  <div className="actions">
                    <Link to={`/caja/edit/${r.id}`} className="btn btn-ghost btn-sm">
                      <Pencil size={14} />
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void handleDelete(r)}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
