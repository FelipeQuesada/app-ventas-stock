import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search } from 'lucide-react';
import type { Product } from '@advance-coat/shared';
import { formatCurrency, getStockLevel, getStockLabel } from '@advance-coat/shared';
import { subscribeProducts, updateProductStock } from '../services/products';
import { useAuth } from '../context/AuthContext';

export function StockPage() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const unsub = subscribeProducts(
      (data) => {
        setProducts(data);
        setLive(true);
      },
      (err) => setError(err.message)
    );
    return unsub;
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter((product) => product.category === selectedCategory);
    }
    const term = search.toLowerCase().trim();
    if (!term) return result;
    return result.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, search, selectedCategory]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of filtered) {
      const category = product.category || 'Sin categoría';
      groups.set(category, [...(groups.get(category) ?? []), product]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

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

  return (
    <div className="stock-app-page">
      <section className="stock-app-toolbar">
        {live && (
          <div className="stock-live">
            <span />
            En vivo
          </div>
        )}

        <div className="stock-search">
          <Search size={18} />
          <input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="stock-categories" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={selectedCategory === null ? 'active' : ''}
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={selectedCategory === category ? 'active' : ''}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}

      <div className="stock-sections">
        {grouped.map(([category, items]) => (
          <section className="stock-category-section" key={category}>
            <h3>{category}</h3>
            <div className="stock-product-list">
              {items.map((product) => {
                const level = getStockLevel(product.stock);
                return (
                  <article className="stock-product-row" key={product.id}>
                    <div className="stock-product-info">
                      <strong>{product.name}</strong>
                      <span>{formatCurrency(product.price)}</span>
                      <small className={`stock-level stock-level-${level}`}>
                        {getStockLabel(level)}
                      </small>
                    </div>
                    <div className="stock-stepper">
                      <button
                        type="button"
                        disabled={savingId === product.id || product.stock <= 0}
                        onClick={() => void adjust(product, -1)}
                        aria-label={`Restar stock de ${product.name}`}
                      >
                        <Minus size={18} />
                      </button>
                      <strong className={`stock-count stock-count-${level}`}>
                        {product.stock}
                      </strong>
                      <button
                        type="button"
                        disabled={savingId === product.id}
                        onClick={() => void adjust(product, 1)}
                        aria-label={`Sumar stock de ${product.name}`}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="empty-state">
            <strong>No encontramos productos</strong>
            <p>Probá con otra búsqueda o categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
}
