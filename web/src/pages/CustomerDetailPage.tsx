import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageCircle } from 'lucide-react';
import type { Customer, Presupuesto } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDateTime,
  getSaleDisplayDate,
  buildWhatsAppUrl,
} from '@advance-coat/shared';
import { format } from 'date-fns';
import { getCustomer, updateCustomer } from '../services/customers';
import { fetchCustomerPurchaseStats, type CustomerPurchaseStats } from '../services/sales';
import {
  getPresupuestosByCustomerId,
  getPresupuestosByCustomerPhone,
} from '../services/presupuestos';
import { buildPresupuestoHtml, presupuestoToPdfData, buildPresupuestoDocumentTitle } from '../services/presupuesto';
import { printHtml } from '../services/export';

export function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerPurchaseStats | null>(null);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCustomer(id);
        if (!c || cancelled) {
          setError('Cliente no encontrado');
          return;
        }
        setCustomer(c);
        setName(c.name);
        setPhone(c.phone);
        setEmail(c.email);

        const [purchaseStats, byId, byPhone] = await Promise.all([
          c.phone ? fetchCustomerPurchaseStats(c.phone) : Promise.resolve(null),
          getPresupuestosByCustomerId(c.id),
          c.phone ? getPresupuestosByCustomerPhone(c.phone) : Promise.resolve([]),
        ]);

        if (cancelled) return;
        setStats(purchaseStats);

        const map = new Map<string, Presupuesto>();
        for (const p of [...byId, ...byPhone]) map.set(p.id, p);
        setPresupuestos(
          Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await updateCustomer(id, { name, phone, email });
      setCustomer((prev) => (prev ? { ...prev, name, phone, email } : prev));
      window.alert('Cliente actualizado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (!customer) {
    return (
      <div className="empty-state card">
        <h3>Cliente no encontrado</h3>
        <Link to="/customers" className="btn btn-ghost">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/customers" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Volver
          </Link>
          <h3 style={{ margin: 0 }}>{customer.name || 'Cliente'}</h3>
          <p>{customer.phone || customer.email || 'Sin contacto'}</p>
        </div>
        {customer.phone && (
          <a
            className="btn btn-secondary"
            href={buildWhatsAppUrl(customer.phone, `Hola ${customer.name || ''}`.trim())}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
      </div>

      <div className="grid-2">
        <form className="card" onSubmit={handleSave}>
          <h3 className="card-title">Datos</h3>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>

        <div className="card">
          <h3 className="card-title">Compras</h3>
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <div className="kpi-card">
              <div className="kpi-label">Ventas</div>
              <div className="kpi-value">{stats?.saleCount ?? 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total gastado</div>
              <div className="kpi-value">{formatCurrency(stats?.totalSpent ?? 0)}</div>
            </div>
          </div>
          {stats?.topProduct && (
            <p className="muted">
              Más comprado: <strong>{stats.topProduct.name}</strong> ({stats.topProduct.quantity} u.)
            </p>
          )}
        </div>
      </div>

      {stats && stats.sales.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 className="card-title">Historial de ventas</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Vendedor</th>
                </tr>
              </thead>
              <tbody>
                {stats.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatShortDateTime(getSaleDisplayDate(sale))}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{sale.createdByName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Presupuestos
          </h3>
          <Link to="/presupuesto" className="btn btn-ghost btn-sm">
            Nuevo
          </Link>
        </div>
        {presupuestos.length === 0 ? (
          <p className="muted">Todavía no hay presupuestos para este cliente.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Válido hasta</th>
                  <th>Total</th>
                  <th>Contacto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map((p) => (
                  <tr key={p.id}>
                    <td>{formatShortDateTime(p.date)}</td>
                    <td>{format(p.validUntil, 'dd/MM/yyyy')}</td>
                    <td>{formatCurrency(p.total)}</td>
                    <td>{p.createdByName || p.contactName || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="PDF"
                        onClick={() =>
                          printHtml(
                            buildPresupuestoHtml(presupuestoToPdfData(p)),
                            buildPresupuestoDocumentTitle(p.customer.name)
                          )
                        }
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
