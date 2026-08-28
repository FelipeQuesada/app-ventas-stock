import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Check } from 'lucide-react';
import type { Sale } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDateTime,
  getSaleDisplayDate,
  getSalePaymentLabel,
} from '@advance-coat/shared';
import { getSalesNeedingInvoice, markSaleInvoiceIssued } from '../../services/sales';
import { useAuth } from '../../context/AuthContext';

export function AdminInvoicesPage() {
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSales(await getSalesNeedingInvoice());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMarkDone(sale: Sale) {
    setMarkingId(sale.id);
    try {
      await markSaleInvoiceIssued(sale.id, {
        userId: user?.uid ?? '',
        userName: profile?.name,
      });
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo marcar');
    } finally {
      setMarkingId(null);
    }
  }

  if (loading) return <div className="loading-screen">Cargando facturas…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Ventas con factura</h3>
          <p>
            {sales.length === 0
              ? 'No hay facturas pendientes'
              : `${sales.length} pendiente${sales.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="empty-state card">
          <FileText size={32} />
          <h3>Sin pendientes</h3>
          <p>Cuando una venta se marque “Con factura”, aparece acá.</p>
        </div>
      ) : (
        <div className="admin-invoice-list">
          {sales.map((sale) => (
            <article key={sale.id} className="card admin-invoice-card">
              <div className="admin-invoice-top">
                <div>
                  <strong>{formatCurrency(sale.total)}</strong>
                  <div className="muted">
                    {formatShortDateTime(getSaleDisplayDate(sale))}
                  </div>
                </div>
                <span className="badge badge-muted">
                  {getSalePaymentLabel(sale)}
                </span>
              </div>
              <div className="admin-invoice-meta">
                <span>
                  <strong>Cliente:</strong> {sale.customer?.name || 'Sin nombre'}
                  {sale.customer?.phone ? ` · ${sale.customer.phone}` : ''}
                </span>
                {sale.customer?.email ? (
                  <span>
                    <strong>Email:</strong> {sale.customer.email}
                  </span>
                ) : null}
                {sale.customer?.cuit ? (
                  <span>
                    <strong>CUIT:</strong> {sale.customer.cuit}
                  </span>
                ) : null}
                <span>
                  <strong>Vendedor:</strong> {sale.createdByName || '—'}
                </span>
                <span>
                  <strong>Ítems:</strong>{' '}
                  {sale.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                </span>
              </div>
              <div className="actions admin-invoice-actions">
                <Link to={`/sales?edit=${sale.id}`} className="btn btn-ghost btn-sm">
                  Ver / editar
                </Link>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={markingId === sale.id}
                  onClick={() => void handleMarkDone(sale)}
                >
                  <Check size={14} />
                  {markingId === sale.id ? 'Marcando…' : 'Marcar facturada'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
