import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MessageCircle, Pencil, Trash2, Download } from 'lucide-react';
import type { Sale } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDateTime,
  getSaleDisplayDate,
  getPaymentMethodLabel,
  PERIOD_PRESETS,
  createDefaultPeriod,
  getPresetRange,
  isDateInRange,
  formatPeriodLabel,
  buildSaleTicketText,
  buildSaleTicketHtml,
  buildWhatsAppUrl,
  type PeriodSelection,
  type PeriodPresetId,
} from '@advance-coat/shared';
import { getSales, deleteSale } from '../services/sales';
import { exportSalesInRangeToExcel, exportSalesInRangeToPdf, printHtml } from '../services/export';
import { useAuth } from '../context/AuthContext';

export function SalesListPage() {
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodSelection>(createDefaultPeriod());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  async function load() {
    setLoading(true);
    try {
      setSales(await getSales());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => sales.filter((s) => isDateInRange(s.date, period.range)),
    [sales, period]
  );

  const total = filtered.reduce((sum, s) => sum + s.total, 0);

  function setPreset(id: Exclude<PeriodPresetId, 'custom'>) {
    setPeriod({ preset: id, range: getPresetRange(id) });
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    const start = new Date(customStart + 'T00:00:00');
    const end = new Date(customEnd + 'T23:59:59');
    setPeriod({
      preset: 'custom',
      range: { start: start <= end ? start : end, end: start <= end ? end : start },
    });
  }

  async function handleDelete(sale: Sale) {
    if (!window.confirm(`¿Eliminar la venta de ${formatCurrency(sale.total)}?`)) return;
    await deleteSale(sale.id, {
      userId: user?.uid ?? '',
      userName: profile?.name,
    });
    setSales((prev) => prev.filter((s) => s.id !== sale.id));
  }

  function openWhatsApp(sale: Sale) {
    const text = buildSaleTicketText(sale);
    const url = buildWhatsAppUrl(sale.customer?.phone, text);
    window.open(url, '_blank');
  }

  function openPdf(sale: Sale) {
    printHtml(buildSaleTicketHtml(sale));
  }

  if (loading) return <div className="loading-screen">Cargando ventas…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Historial de ventas</h3>
          <p>
            {formatPeriodLabel(period)} · {filtered.length} ventas · {formatCurrency(total)}
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportSalesInRangeToExcel(
                filtered,
                period.range.start,
                period.range.end,
                formatPeriodLabel(period)
              ).catch((e) => window.alert(e.message))
            }
          >
            <Download size={14} /> Excel
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportSalesInRangeToPdf(filtered, formatPeriodLabel(period)).catch((e) =>
                window.alert(e.message)
              )
            }
          >
            <FileText size={14} /> PDF
          </button>
          <Link to="/sales" className="btn btn-primary btn-sm">
            Nueva venta
          </Link>
        </div>
      </div>

      <div className="chip-group" style={{ marginBottom: 12 }}>
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip ${period.preset === p.id ? 'active' : ''}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={applyCustom}>
          Filtrar fechas
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin ventas</h3>
          <p>No hay ventas en este período.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Vendedor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatShortDateTime(getSaleDisplayDate(sale))}</td>
                  <td>
                    {sale.customer?.name || '—'}
                    {sale.customer?.phone ? (
                      <div className="muted">{sale.customer.phone}</div>
                    ) : null}
                  </td>
                  <td>
                    {getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel)}
                  </td>
                  <td><strong>{formatCurrency(sale.total)}</strong></td>
                  <td>{sale.createdByName || '—'}</td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="WhatsApp"
                        onClick={() => openWhatsApp(sale)}
                      >
                        <MessageCircle size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="PDF / imprimir"
                        onClick={() => openPdf(sale)}
                      >
                        <FileText size={14} />
                      </button>
                      <Link
                        to={`/sales?edit=${sale.id}`}
                        className="btn btn-ghost btn-sm"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Eliminar"
                        onClick={() => void handleDelete(sale)}
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
