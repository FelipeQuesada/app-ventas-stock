import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  EyeOff,
} from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import { formatCurrency } from '@advance-coat/shared';
import { getProducts } from '../services/products';
import { useAuth } from '../context/AuthContext';
import { isTiendanubeConfigured } from '../services/tiendanube';
import {
  pullCatalogFromTiendanube,
  pushAllLinkedStockToTiendanube,
  type PullFromTnResult,
} from '../services/syncTiendanube';

export function SyncTiendanubePage() {
  const { profile } = useAuth();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [busy, setBusy] = useState<'pull' | 'push-stock' | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<PullFromTnResult | null>(null);
  const [pushResult, setPushResult] = useState<{
    synced: number;
    errors: number;
    skipped: number;
  } | null>(null);

  if (profile?.role !== 'admin') return <Navigate to="/" replace />;

  async function reloadLocal() {
    setLocalProducts(await getProducts());
  }

  useEffect(() => {
    reloadLocal().finally(() => setLoadingLocal(false));
  }, []);

  const linked = useMemo(
    () => localProducts.filter((p) => typeof p.tiendanubeId === 'number'),
    [localProducts]
  );
  const hidden = useMemo(() => localProducts.filter((p) => p.hidden), [localProducts]);
  const visibleLinked = useMemo(
    () => linked.filter((p) => !p.hidden),
    [linked]
  );

  const configOk = isTiendanubeConfigured();

  async function handlePull() {
    if (!configOk) return;
    if (
      !window.confirm(
        '¿Traer catálogo desde Tiendanube?\n\n' +
          '• Actualiza nombre, precio, stock, descripción e imagen\n' +
          '• Crea productos nuevos que estén en TN\n' +
          '• Oculta (no borra) los que ya no estén en TN\n' +
          '• NUNCA elimina productos en Tiendanube'
      )
    ) {
      return;
    }

    setBusy('pull');
    setPullResult(null);
    setPushResult(null);
    setProgress(null);
    try {
      const result = await pullCatalogFromTiendanube((_done, _total, message) => {
        setProgress(message);
      });
      setPullResult(result);
      await reloadLocal();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function handlePushStock() {
    if (!configOk) return;
    if (visibleLinked.length === 0) {
      alert('No hay productos vinculados visibles. Primero traé el catálogo desde TN.');
      return;
    }
    if (
      !window.confirm(
        `¿Enviar SOLO stock de ${visibleLinked.length} producto(s) a Tiendanube?\n\n` +
          'No se modifican nombres ni precios en TN. No se borra nada.'
      )
    ) {
      return;
    }

    setBusy('push-stock');
    setPushResult(null);
    setPullResult(null);
    try {
      const result = await pushAllLinkedStockToTiendanube(localProducts, (done, total) => {
        setProgress(`Stock ${done}/${total}`);
      });
      setPushResult(result);
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  return (
    <div className="stats-page">
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Sincronizar con Tiendanube</h3>
          <p className="muted">
            TN manda el catálogo · la app solo puede empujar stock · nunca se borran productos en TN
          </p>
        </div>
      </div>

      {!configOk && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Credenciales no configuradas</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              En <code>web/.env</code> agregá{' '}
              <code>VITE_TIENDANUBE_STORE_ID</code> y <code>VITE_TIENDANUBE_TOKEN</code>,
              y reiniciá el servidor.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Reglas de sincronización</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          <li>
            <strong>Tiendanube → app:</strong> nombre, precio, descripción, imagen, altas. Si un
            producto desaparece en TN, en la app se <strong>oculta</strong> (las ventas viejas
            quedan).
          </li>
          <li>
            <strong>App → Tiendanube:</strong> solo stock. No crea ni elimina productos en TN.
          </li>
          <li>
            Matching por <code>tiendanubeId</code> (no por nombre), para que un rename no duplique.
          </li>
        </ul>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">Productos locales</div>
          <div className="kpi-value">{loadingLocal ? '…' : localProducts.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vinculados a TN</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {visibleLinked.length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ocultos</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>
            {hidden.length}
          </div>
          <div className="kpi-hint">Ya no están en TN</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Acciones</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePull}
            disabled={!configOk || busy !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {busy === 'pull' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            Traer catálogo desde TN
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePushStock}
            disabled={!configOk || busy !== null || visibleLinked.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {busy === 'push-stock' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            Enviar solo stock a TN
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => reloadLocal()}
            disabled={busy !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={16} />
            Recargar lista
          </button>
        </div>

        {progress && (
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            {progress}
          </p>
        )}

        {pullResult && (
          <div style={{ marginTop: 16, display: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <Status ok text={`${pullResult.created} creados`} />
              <Status ok text={`${pullResult.updated} actualizados`} />
              <Status ok={pullResult.hidden === 0} text={`${pullResult.hidden} ocultados`} />
              <span className="muted" style={{ fontSize: 12 }}>
                {pullResult.unchanged} sin cambios
              </span>
            </div>
            {pullResult.errors.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--danger)' }}>
                {pullResult.errors.slice(0, 8).map((err) => (
                  <div key={err}>{err}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {pushResult && (
          <div style={{ marginTop: 16, display: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Status ok text={`${pushResult.synced} stock enviados`} />
              {pushResult.errors > 0 && <Status ok={false} text={`${pushResult.errors} errores`} />}
              <span className="muted" style={{ fontSize: 12 }}>
                {pushResult.skipped} omitidos
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <strong>Productos vinculados / ocultos</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Vista rápida después del sync (demo o tienda real)
          </p>
        </div>
        {loadingLocal ? (
          <div className="loading-screen" style={{ minHeight: 120 }}>
            Cargando…
          </div>
        ) : linked.length === 0 ? (
          <p className="muted" style={{ padding: 24, textAlign: 'center' }}>
            Todavía no hay productos con ID de Tiendanube. Creá 1–2 productos en la tienda demo y
            tocá “Traer catálogo desde TN”.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>TN ID</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {linked
                .slice()
                .sort((a, b) => Number(b.hidden) - Number(a.hidden) || a.name.localeCompare(b.name))
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.category}
                      </div>
                    </td>
                    <td>{p.tiendanubeId}</td>
                    <td>{p.stock} u.</td>
                    <td>{formatCurrency(p.price)}</td>
                    <td>
                      {p.hidden ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontSize: 13 }}>
                          <EyeOff size={14} /> Oculto
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 13 }}>
                          <CheckCircle size={14} /> Activo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Status({ ok, text }: { ok?: boolean; text: string }) {
  const good = ok !== false;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        color: good ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {good ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {text}
    </span>
  );
}
