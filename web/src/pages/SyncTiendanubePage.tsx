import { useEffect, useMemo, useState } from 'react';
import { Link2, Link2Off, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Search } from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import { formatCurrency } from '@advance-coat/shared';
import { getProducts } from '../services/products';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  fetchTiendanubeProducts,
  getTiendanubeProductName,
  isTiendanubeConfigured,
  type TiendanubeProduct,
} from '../services/tiendanube';
import {
  syncAllToTiendanube,
  linkProductToTiendanube,
  unlinkProductFromTiendanube,
  suggestTiendanubeMatch,
  getLinkStats,
  type SyncField,
  type SyncBatchResult,
} from '../services/syncTiendanube';

type Step = 'idle' | 'loading' | 'syncing';

function StatusChip({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: ok ? 'var(--success)' : 'var(--danger)' }}>
      {ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {text}
    </span>
  );
}

export function SyncTiendanubePage() {
  const { profile } = useAuth();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [tnProducts, setTnProducts] = useState<TiendanubeProduct[]>([]);
  const [step, setStep] = useState<Step>('idle');
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingTn, setLoadingTn] = useState(false);
  const [tnError, setTnError] = useState<string | null>(null);
  const [syncField, setSyncField] = useState<SyncField>('both');
  const [syncResult, setSyncResult] = useState<SyncBatchResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState<string | null>(null); // localProductId en proceso

  if (profile?.role !== 'admin') return <Navigate to="/" replace />;

  // Cargar productos locales
  useEffect(() => {
    getProducts()
      .then(setLocalProducts)
      .finally(() => setLoadingLocal(false));
  }, []);

  const stats = useMemo(() => getLinkStats(localProducts), [localProducts]);

  // Cargar productos de Tiendanube
  async function loadTiendanube() {
    if (!isTiendanubeConfigured()) {
      setTnError('Faltan VITE_TIENDANUBE_STORE_ID y/o VITE_TIENDANUBE_TOKEN en web/.env');
      return;
    }
    setLoadingTn(true);
    setTnError(null);
    try {
      const products = await fetchTiendanubeProducts();
      setTnProducts(products);
    } catch (e) {
      setTnError((e as Error).message);
    } finally {
      setLoadingTn(false);
    }
  }

  // Vincular producto local ↔ TN
  async function handleLink(localProduct: Product, tnProduct: TiendanubeProduct) {
    setLinking(localProduct.id);
    try {
      await linkProductToTiendanube(localProduct.id, tnProduct);
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === localProduct.id
            ? { ...p, tiendanubeId: tnProduct.id, tiendanubeVariantId: tnProduct.variants[0]?.id }
            : p
        )
      );
    } finally {
      setLinking(null);
    }
  }

  // Desvincular
  async function handleUnlink(localProduct: Product) {
    if (!window.confirm(`¿Desvincular "${localProduct.name}" de Tiendanube?`)) return;
    setLinking(localProduct.id);
    try {
      await unlinkProductFromTiendanube(localProduct.id);
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === localProduct.id
            ? { ...p, tiendanubeId: undefined, tiendanubeVariantId: undefined }
            : p
        )
      );
    } finally {
      setLinking(null);
    }
  }

  // Sincronización batch
  async function handleSync() {
    const linked = localProducts.filter((p) => p.tiendanubeId && p.tiendanubeVariantId);
    if (linked.length === 0) {
      alert('No hay productos vinculados a Tiendanube. Vinculá al menos uno primero.');
      return;
    }

    const what = syncField === 'both' ? 'stock y precios' : syncField === 'stock' ? 'stock' : 'precios';
    if (!window.confirm(`¿Sincronizar ${what} de ${linked.length} producto(s) hacia Tiendanube?`)) return;

    setSyncResult(null);
    setSyncProgress({ done: 0, total: linked.length });
    setStep('syncing');

    try {
      const result = await syncAllToTiendanube(localProducts, syncField, (done, total) => {
        setSyncProgress({ done, total });
      });
      setSyncResult(result);
    } catch (e) {
      alert(`Error inesperado: ${(e as Error).message}`);
    } finally {
      setStep('idle');
      setSyncProgress(null);
    }
  }

  // Filtrar productos locales
  const filteredLocal = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return localProducts;
    return localProducts.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [localProducts, search]);

  // Para cada producto local sin vincular, sugerir un match de TN
  const suggestions = useMemo(() => {
    const map = new Map<string, TiendanubeProduct | undefined>();
    for (const p of localProducts) {
      if (!p.tiendanubeId) {
        map.set(p.id, suggestTiendanubeMatch(p.name, tnProducts));
      }
    }
    return map;
  }, [localProducts, tnProducts]);

  const configOk = isTiendanubeConfigured();

  return (
    <div className="stats-page">
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Sincronizar con Tiendanube</h3>
          <p className="muted">Vinculá productos y sincronizá stock/precio hacia tu tienda online</p>
        </div>
      </div>

      {/* Alerta si no está configurado */}
      {!configOk && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Credenciales no configuradas</strong>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Agregá en <code>web/.env</code>:<br />
              <code>VITE_TIENDANUBE_STORE_ID=TU_STORE_ID</code><br />
              <code>VITE_TIENDANUBE_TOKEN=TU_TOKEN</code><br />
              Luego reiniciá el servidor de desarrollo.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total productos</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vinculados</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{stats.linked}</div>
          <div className="kpi-hint">{stats.linkPercent}% del catálogo</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sin vincular</div>
          <div className="kpi-value" style={{ color: stats.unlinked > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {stats.unlinked}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Productos TN cargados</div>
          <div className="kpi-value">{tnProducts.length}</div>
        </div>
      </div>

      {/* Panel de sincronización */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Sincronización</h3>
        <p className="card-subtitle">Envía datos desde esta app hacia Tiendanube</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Sincronizar:</label>
          {(['both', 'stock', 'price'] as SyncField[]).map((f) => (
            <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="radio"
                name="syncField"
                value={f}
                checked={syncField === f}
                onChange={() => setSyncField(f)}
              />
              {f === 'both' ? 'Stock y precio' : f === 'stock' ? 'Solo stock' : 'Solo precio'}
            </label>
          ))}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSync}
            disabled={step === 'syncing' || stats.linked === 0 || !configOk}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {step === 'syncing' ? (
              <>
                <Loader2 size={16} className="spin" />
                Sincronizando… {syncProgress ? `${syncProgress.done}/${syncProgress.total}` : ''}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Sincronizar ahora
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        {syncResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
              <StatusChip ok={true} text={`${syncResult.synced} sincronizados`} />
              {syncResult.errors > 0 && <StatusChip ok={false} text={`${syncResult.errors} errores`} />}
              {syncResult.skipped > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {syncResult.skipped} sin vincular (omitidos)
                </span>
              )}
            </div>
            {syncResult.errors > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                {syncResult.results
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <div key={r.productId} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <strong>{r.productName}</strong>
                      <span style={{ color: 'var(--danger)', marginLeft: 8 }}>{r.error}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cargar productos de TN */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Vinculación de productos</h3>
            <p className="card-subtitle" style={{ margin: '2px 0 0' }}>
              Asociá cada producto de tu app con el correspondiente en Tiendanube
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadTiendanube}
            disabled={loadingTn || !configOk}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {loadingTn ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
            {tnProducts.length > 0 ? 'Recargar TN' : 'Cargar productos de TN'}
          </button>
        </div>

        {tnError && (
          <div className="alert alert-warning" style={{ margin: '12px 0 0' }}>
            <XCircle size={16} />
            <span>{tnError}</span>
          </div>
        )}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="input"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Tabla de productos */}
      {loadingLocal ? (
        <div className="loading-screen">Cargando productos…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto (app)</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Tiendanube vinculado</th>
                <th style={{ width: 160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocal.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
                    Sin productos
                  </td>
                </tr>
              )}
              {filteredLocal.map((product) => {
                const isLinked = Boolean(product.tiendanubeId);
                const isBusy = linking === product.id;
                const suggestion = suggestions.get(product.id);

                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{product.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{product.category}</div>
                    </td>
                    <td>{product.stock} u.</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      {isLinked ? (
                        <div>
                          <StatusChip ok={true} text={`ID ${product.tiendanubeId}`} />
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Variante: {product.tiendanubeVariantId}
                          </div>
                        </div>
                      ) : tnProducts.length > 0 ? (
                        <TnSelector
                          tnProducts={tnProducts}
                          suggestion={suggestion}
                          disabled={isBusy}
                          onSelect={(tn) => handleLink(product, tn)}
                        />
                      ) : (
                        <span className="muted" style={{ fontSize: 13 }}>— sin vincular</span>
                      )}
                    </td>
                    <td>
                      {isLinked ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleUnlink(product)}
                          disabled={isBusy}
                          title="Desvincular de Tiendanube"
                        >
                          {isBusy ? <Loader2 size={14} className="spin" /> : <Link2Off size={14} />}
                          Desvincular
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          {tnProducts.length === 0 ? 'Cargá TN →' : ''}
                        </span>
                      )}
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

// ─── Sub-componente: selector de producto TN ──────────────────────────────────

function TnSelector({
  tnProducts,
  suggestion,
  disabled,
  onSelect,
}: {
  tnProducts: TiendanubeProduct[];
  suggestion?: TiendanubeProduct;
  disabled: boolean;
  onSelect: (tn: TiendanubeProduct) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(suggestion ? String(suggestion.id) : '');

  const selected = tnProducts.find((p) => String(p.id) === selectedId);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <select
        className="select"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={disabled}
        style={{ fontSize: 13, maxWidth: 200 }}
      >
        <option value="">— seleccionar —</option>
        {tnProducts.map((p) => (
          <option key={p.id} value={String(p.id)}>
            {getTiendanubeProductName(p)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={!selected || disabled}
        onClick={() => selected && onSelect(selected)}
        title="Vincular"
      >
        <Link2 size={14} />
        Vincular
      </button>
    </div>
  );
}
