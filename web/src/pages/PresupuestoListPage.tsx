import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import type { Presupuesto } from '@advance-coat/shared';
import { formatCurrency, formatShortDateTime } from '@advance-coat/shared';
import { format, isValid } from 'date-fns';
import { printHtml } from '../services/export';
import { presupuestoToPdfData, buildPresupuestoHtml, buildPresupuestoDocumentTitle } from '../services/presupuesto';
import { deletePresupuesto, getPresupuestos } from '../services/presupuestos';

function formatDay(date: Date | undefined): string {
  if (!date || !isValid(date)) return '—';
  try {
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

function formatWhen(date: Date | undefined): string {
  if (!date || !isValid(date)) return '—';
  try {
    return formatShortDateTime(date);
  } catch {
    return formatDay(date);
  }
}

export function PresupuestoListPage() {
  const [rows, setRows] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await getPresupuestos());
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los presupuestos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const total = rows.reduce((sum, p) => sum + (p.total || 0), 0);

  function openPdf(p: Presupuesto) {
    printHtml(
      buildPresupuestoHtml(presupuestoToPdfData(p)),
      buildPresupuestoDocumentTitle(p.customer.name)
    );
  }

  async function handleDelete(p: Presupuesto) {
    if (!window.confirm(`¿Eliminar el presupuesto de ${p.customer.name || 'cliente'}?`)) return;
    try {
      await deletePresupuesto(p.id);
      setRows((prev) => prev.filter((row) => row.id !== p.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  if (loading) return <div className="loading-screen">Cargando presupuestos…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Historial de presupuestos</h3>
          <p>
            {rows.length} presupuestos · {formatCurrency(total)}
          </p>
        </div>
        <Link to="/presupuesto" className="btn btn-primary btn-sm">
          Nuevo presupuesto
        </Link>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {rows.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin presupuestos</h3>
          <p>Todavía no hay presupuestos guardados.</p>
          <Link to="/presupuesto" className="btn btn-primary" style={{ marginTop: 12 }}>
            Crear presupuesto
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Válido hasta</th>
                  <th>Total</th>
                  <th>Contacto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{formatWhen(p.date)}</td>
                    <td>
                      <div>{p.customer.name || 'Sin cliente'}</div>
                      {p.customer.phone ? (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {p.customer.phone}
                        </div>
                      ) : null}
                    </td>
                    <td>{formatDay(p.validUntil)}</td>
                    <td>{formatCurrency(p.total || 0)}</td>
                    <td>{p.createdByName || p.contactName || '—'}</td>
                    <td>
                      <div className="actions" style={{ flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="PDF"
                          onClick={() => openPdf(p)}
                        >
                          <FileText size={14} />
                        </button>
                        <Link
                          to={`/presupuesto?edit=${p.id}`}
                          className="btn btn-ghost btn-sm"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>
                        {p.customerId ? (
                          <Link
                            to={`/customers/${p.customerId}`}
                            className="btn btn-ghost btn-sm"
                            title="Cliente"
                          >
                            Cliente
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Eliminar"
                          onClick={() => void handleDelete(p)}
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
      )}
    </div>
  );
}
