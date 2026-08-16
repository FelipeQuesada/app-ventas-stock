import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Upload } from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import {
  formatCurrency,
  getStockLevel,
  filterAndSortProducts,
  getUniqueProductCategories,
} from '@advance-coat/shared';
import { getProducts, deleteProduct } from '../services/products';
import { useCart } from '../context/CartContext';
import { ImportProductsModal } from '../components/ImportProductsModal';

export function ProductsPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  const categories = useMemo(() => getUniqueProductCategories(products), [products]);

  const filtered = useMemo(
    () =>
      filterAndSortProducts(
        products,
        {
          search,
          category,
          showOutOfStock,
          showLowStock,
        },
        new Map()
      ),
    [products, search, category, showOutOfStock, showLowStock]
  );

  async function handleDelete(product: Product, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
    await deleteProduct(product.id);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  if (loading) return <div className="loading-screen">Cargando productos…</div>;

  return (
    <div className="products-page">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 12 }}
        onClick={() => setImportOpen(true)}
      >
        <Upload size={16} /> Importar productos
      </button>

      <div className="sale-category-chips">
        <button
          type="button"
          className={`chip ${category === null ? 'active' : ''}`}
          onClick={() => setCategory(null)}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="chip-group" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`chip ${showOutOfStock ? 'active' : ''}`}
          onClick={() => setShowOutOfStock((v) => !v)}
        >
          Sin stock
        </button>
        <button
          type="button"
          className={`chip ${showLowStock ? 'active' : ''}`}
          onClick={() => setShowLowStock((v) => !v)}
        >
          Poco stock
        </button>
      </div>

      {cart.count > 0 && (
        <Link to="/sales" className="products-cart-banner">
          {cart.count} en carrito — Ir a venta
        </Link>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <h3>Sin productos</h3>
          <p>No hay resultados con esos filtros.</p>
        </div>
      ) : (
        <div className="product-card-list">
          {filtered.map((p) => {
            const level = getStockLevel(p.stock);
            return (
              <article
                key={p.id}
                className="product-card-row"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="product-card-thumb" />
                ) : (
                  <div className="product-card-thumb product-card-thumb-empty">
                    <Package size={22} />
                  </div>
                )}
                <div className="product-card-info">
                  <strong>{p.name}</strong>
                  <span className="muted">{p.category || 'Sin categoría'}</span>
                  <div className="product-card-meta">
                    <span className="product-card-price">{formatCurrency(p.price)}</span>
                    <span className={`stock-dot stock-dot-${level}`}>
                      {p.stock} u.
                    </span>
                  </div>
                </div>
                <div className="product-card-actions" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/products/${p.id}`} className="btn btn-ghost btn-icon btn-sm" aria-label="Editar">
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={(e) => void handleDelete(p, e)}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                  <button
                    type="button"
                    className="product-add-btn"
                    onClick={() => cart.addProduct(p)}
                    disabled={p.stock <= 0}
                    aria-label="Agregar a la venta"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Link to="/products/new" className="products-fab" aria-label="Nuevo producto">
        <Plus size={24} />
      </Link>

      <ImportProductsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />
    </div>
  );
}
