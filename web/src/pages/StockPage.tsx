import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import { getStockLevel, getStockLabel } from '@advance-coat/shared';
import { subscribeProducts, updateProductStock } from '../services/products';
import { useAuth } from '../context/AuthContext';

export function StockPage() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeProducts(
      setProducts,
      (err) => setError(err.message)
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }, [products, search]);

  async function adjust(product: Product, delta: number) {
    const next = Math.max(0, product.stock + delta);
    if (next === product.stock) return;
    setSavingId(product.id);
    try {
      await updateProductStock(product.id, next, {
        userId: user?.uid ?? '',
        userName: profile?.name,
        previousStock: product.stock,
        productName: product.name,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setSavingId(null);
    }
  }

  async function setExact(product: Product, value: string) {
    const next = Math.max(0, Number(value) || 0);
    if (next === product.stock) return;
    setSavingId(product.id);
    try {
      await updateProductStock(product.id, next, {
        userId: user?.uid ?? '',
        userName: profile?.name,
        previousStock: product.stock,
        productName: product.name,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Control de stock</h3>
          <p>Actualización en tiempo real</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const level = getStockLevel(p.stock);
              return (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.category}</td>
                  <td>
                    <span
                      className={`badge ${
                        level === 'high'
                          ? 'badge-success'
                          : level === 'low'
                            ? 'badge-warning'
                            : 'badge-danger'
                      }`}
                    >
                      {getStockLabel(level)}
                    </span>
                  </td>
                  <td>
                    <div className="qty-controls">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        disabled={savingId === p.id || p.stock <= 0}
                        onClick={() => void adjust(p, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={p.stock}
                        disabled={savingId === p.id}
                        onChange={(e) => void setExact(p, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        disabled={savingId === p.id}
                        onClick={() => void adjust(p, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
