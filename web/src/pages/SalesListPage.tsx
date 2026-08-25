import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MessageCircle, Pencil, Trash2, Download } from 'lucide-react';
import type { Sale } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDateTime,
  getSaleDisplayDate,
  getPaymentMethodLabel,
  createDefaultPeriod,
  isDateInRange,
  formatPeriodLabel,
  buildSaleTicketText,
  buildSaleTicketHtml,
  buildWhatsAppUrl,
  type PeriodSelection,
} from '@advance-coat/shared';
import { getSales, deleteSale } from '../services/sales';
import { exportSalesInRangeToExcel, exportSalesInRangeToPdf, printHtml } from '../services/export';
import { PeriodFilter } from '../components/PeriodFilter';
import { useAuth } from '../context/AuthContext';

export function SalesListPage() {
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodSelection>(createDefaultPeriod());

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
      <div className="page-header sales-list-header">
        <div>
          <h3 style={{ margin: 0 }}>Historial de ventas</h3>
          <p>
            {formatPeriodLabel(period)} · {filtered.length} ventas · {formatCurrency(total)}
          </p>
        </div>
        <div className="actions sales-list-header-actions">
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

      <PeriodFilter value={period} onChange={setPeriod} />

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin ventas</h3>
          <p>No hay ventas en este período.</p>
        </div>
      ) : (
        <>
          <div className="sales-list-cards">
            {filtered.map((sale) => (
              <article className="sales-list-card" key={sale.id}>
                <div className="sales-list-card-top">
                  <div>
                    <strong>{formatCurrency(sale.total)}</strong>
                    <div className="muted">{formatShortDateTime(getSaleDisplayDate(sale))}</div>
                  </div>
                  <span className="badge badge-muted">
                    {getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel)}
                  </span>
                </div>
                <div className="sales-list-card-meta">
                  <span>{sale.customer?.name || 'Sin cliente'}</span>
                  <span>{sale.createdByName || '—'}</span>
                </div>
                <div className="actions sales-list-card-actions">
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
              </article>
            ))}
          </div>

          <div className="table-wrap sales-list-table">
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
        </>
      )}
    </div>
  );
}
