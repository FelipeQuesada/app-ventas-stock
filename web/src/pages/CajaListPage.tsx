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
import { getCajaHistory, deleteCajaRecord } from '../services/caja';
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
  const cierres = filtered.filter((r) => r.entryType !== 'retiro');
  const retiros = filtered.filter((r) => r.entryType === 'retiro');

  async function handleDelete(record: DailyCaja) {
    const label =
      record.entryType === 'retiro'
        ? `el retiro de ${formatCurrency(record.retiroAmount ?? 0)}`
        : `la caja del ${formatShortDate(record.date)}`;
    if (!window.confirm(`¿Eliminar ${label}?`)) return;
    await deleteCajaRecord(record);
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
  }

  if (loading) return <div className="loading-screen">Cargando historial…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Historial de caja</h3>
          <p>
            {periodLabel} · {cierres.length} cierres
            {retiros.length > 0 ? ` · ${retiros.length} retiros` : ''}
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
              void exportCajaRecordsToExcel(cierres, periodLabel).catch((e) =>
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
              void exportCajaRecordsToPdf(cierres, periodLabel).catch((e) =>
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
          <h3>Sin movimientos</h3>
          <p>No hay cierres ni retiros en este período.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cambio</th>
                <th>Total</th>
                <th>Ganancia</th>
                <th>Guardado / Retiro</th>
                <th>Cierre</th>
                <th>Quién</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isRetiro = r.entryType === 'retiro';
                return (
                  <tr key={r.id} className={isRetiro ? 'caja-row-retiro' : undefined}>
                    <td>
                      {formatShortDate(r.date)}
                      {r.sinMovimiento ? (
                        <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                          Sin movimiento
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {isRetiro ? (
                        <span className="caja-badge-retiro">Retiro</span>
                      ) : (
                        <span className="muted">Cierre</span>
                      )}
                    </td>
                    <td>{isRetiro ? '—' : formatCurrency(r.cajaCambio)}</td>
                    <td>{isRetiro ? '—' : formatCurrency(r.cajaTotal)}</td>
                    <td>{isRetiro ? '—' : formatCurrency(r.ganancia)}</td>
                    <td className={isRetiro ? 'caja-retiro-amount' : undefined}>
                      {isRetiro
                        ? `− ${formatCurrency(r.retiroAmount ?? 0)}`
                        : formatCurrency(r.totalGuardado)}
                    </td>
                    <td>
                      {isRetiro
                        ? r.balanceAfter != null
                          ? `Queda ${formatCurrency(r.balanceAfter)}`
                          : '—'
                        : formatCurrency(r.cambioCierre)}
                    </td>
                    <td>{r.closedByName || '—'}</td>
                    <td>
                      <div className="actions">
                        {!isRetiro ? (
                          <Link to={`/caja/edit/${r.id}`} className="btn btn-ghost btn-sm">
                            <Pencil size={14} />
                          </Link>
                        ) : null}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
