import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import type { Customer } from '@advance-coat/shared';
import { formatShortDate } from '@advance-coat/shared';
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
} from '../services/customers';
import { exportCustomersToExcel, exportCustomersToPdf } from '../services/export';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setCustomers(await getCustomers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.email.toLowerCase().includes(term)
    );
  }, [customers, search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createCustomer({ name, phone, email });
      setName('');
      setPhone('');
      setEmail('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`¿Eliminar a ${customer.name || customer.phone}?`)) return;
    await deleteCustomer(customer.id);
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
  }

  if (loading) return <div className="loading-screen">Cargando clientes…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Clientes</h3>
          <p>{customers.length} registrados</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportCustomersToExcel(customers).catch((e) => window.alert(e.message))
            }
          >
            <Download size={14} /> Excel
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              void exportCustomersToPdf(customers).catch((e) => window.alert(e.message))
            }
          >
            <FileText size={14} /> PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {showForm && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={handleCreate}>
          <div className="field-row">
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
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary btn-sm">
            Guardar cliente
          </button>
        </form>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nombre, teléfono o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Alta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/customers/${c.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {c.name || 'Sin nombre'}
                  </Link>
                </td>
                <td>{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.createdAt ? formatShortDate(c.createdAt) : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void handleDelete(c)}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
