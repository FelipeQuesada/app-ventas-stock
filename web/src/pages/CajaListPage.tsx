import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import type { DailyCaja, PeriodSelection } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDate,
  createDefaultPeriod,
  isDateInRange,
  formatPeriodLabel,
} from '@advance-coat/shared';
import { getCajaHistory, deleteCaja } from '../services/caja';
import { exportCajaRecordsToExcel, exportCajaRecordsToPdf } from '../services/export';
import { PeriodFilter } from '../components/PeriodFilter';

export function CajaListPage() {
  const [records, setRecords] = useState<DailyCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodSelection>(() => createDefaultPeriod());

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

  const filtered = useMemo(
    () => records.filter((r) => isDateInRange(r.date, period.range)),
    [records, period]
  );

  const periodLabel = formatPeriodLabel(period);

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
          <p>
            {periodLabel} · {filtered.length} cierres
          </p>
        </div>
        <div className="actions">
          <Link to="/caja" className="btn btn-ghost btn-sm">
            Caja de hoy
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportCajaRecordsToExcel(filtered, periodLabel).catch((e) =>
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
              void exportCajaRecordsToPdf(filtered, periodLabel).catch((e) =>
                window.alert(e.message)
              )
            }
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin cierres</h3>
          <p>No hay cierres de caja en este período.</p>
        </div>
      ) : (
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
                <th>Cerró</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    {formatShortDate(r.date)}
                    {r.sinMovimiento ? (
                      <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                        Sin movimiento
                      </span>
                    ) : null}
                  </td>
                  <td>{formatCurrency(r.cajaCambio)}</td>
                  <td>{formatCurrency(r.cajaTotal)}</td>
                  <td>{formatCurrency(r.ganancia)}</td>
                  <td>{formatCurrency(r.totalGuardado)}</td>
                  <td>{formatCurrency(r.cambioCierre)}</td>
                  <td>{r.closedByName || '—'}</td>
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
      )}
    </div>
  );
}
