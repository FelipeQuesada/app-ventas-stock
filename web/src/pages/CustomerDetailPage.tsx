import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { Customer } from '@advance-coat/shared';
import {
  formatCurrency,
  formatShortDateTime,
  getSaleDisplayDate,
  buildWhatsAppUrl,
} from '@advance-coat/shared';
import { getCustomer, updateCustomer } from '../services/customers';
import { fetchCustomerPurchaseStats, type CustomerPurchaseStats } from '../services/sales';

export function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerPurchaseStats | null>(null);
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
        if (c.phone) {
          const s = await fetchCustomerPurchaseStats(c.phone);
          if (!cancelled) setStats(s);
        }
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
          <h3 className="card-title">Historial</h3>
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
    </div>
  );
}
