import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import { formatCurrency, getStockLevel, getStockLabel, PRODUCT_CATEGORIES } from '@advance-coat/shared';
import { getProducts, deleteProduct } from '../services/products';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  async function load() {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = category === 'all' || p.category === category;
      const matchTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  }, [products, search, category]);

  async function handleDelete(product: Product) {
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
    await deleteProduct(product.id);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  if (loading) return <div className="loading-screen">Cargando productos…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Catálogo</h3>
          <p>{products.length} productos registrados</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <Plus size={16} /> Nuevo producto
        </Link>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin productos</h3>
          <p>No hay resultados con esos filtros.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const level = getStockLevel(p.stock);
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description ? (
                        <div className="muted" style={{ maxWidth: 280, whiteSpace: 'normal' }}>
                          {p.description}
                        </div>
                      ) : null}
                    </td>
                    <td>{p.category}</td>
                    <td>{formatCurrency(p.price)}</td>
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
                        {p.stock} · {getStockLabel(level)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link to={`/products/${p.id}`} className="btn btn-ghost btn-sm">
                          <Pencil size={14} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleDelete(p)}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </div>
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
