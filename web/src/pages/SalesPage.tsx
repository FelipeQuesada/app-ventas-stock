import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Search } from 'lucide-react';
import type { DiscountType, PaymentMethod, Product, SaleItem } from '@advance-coat/shared';
import {
  SALE_SELLERS,
  PAYMENT_METHODS,
  formatCurrency,
  calculateDiscount,
  calculateSaleTotal,
  calculateChange,
  createExtraItem,
  getPaymentMethodLabel,
} from '@advance-coat/shared';
import { getProducts } from '../services/products';
import { createSale, updateSale, getSale } from '../services/sales';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function SalesPage() {
  const { user, profile } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [seller, setSeller] = useState<string>(SALE_SELLERS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraPrice, setExtraPrice] = useState('');
  const [previousItems, setPreviousItems] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getProducts();
        if (!cancelled) setProducts(list);

        if (editId) {
          const sale = await getSale(editId);
          if (sale && !cancelled) {
            cart.setItems(sale.items);
            setPreviousItems(sale.items);
            setSeller(sale.createdByName || SALE_SELLERS[0]);
            setCustomerName(sale.customer?.name ?? '');
            setCustomerPhone(sale.customer?.phone ?? '');
            setCustomerEmail(sale.customer?.email ?? '');
            setPaymentMethod(sale.paymentMethod);
            setDiscountType(sale.discountType ?? null);
            setDiscountValue(sale.discountValue != null ? String(sale.discountValue) : '');
            setAmountPaid(sale.amountPaid != null ? String(sale.amountPaid) : '');
          }
        } else {
          cart.clear();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per editId
  }, [editId]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      )
      .slice(0, 40);
  }, [products, search]);

  const stockById = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.stock]));
    return map;
  }, [products]);

  const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = calculateDiscount(
    subtotal,
    discountType,
    Number(discountValue) || 0
  );
  const total = calculateSaleTotal(subtotal, discountAmount);
  const paid = Number(amountPaid) || 0;
  const change = paymentMethod === 'efectivo' ? calculateChange(paid, total) : 0;

  function addExtra() {
    if (!extraDesc.trim() || !extraPrice) return;
    const item = createExtraItem(extraDesc, 1, Number(extraPrice) || 0);
    cart.setItems([...cart.items, item]);
    setExtraDesc('');
    setExtraPrice('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (cart.items.length === 0) {
      setError('Agregá al menos un producto');
      return;
    }
    if (!user) {
      setError('Sesión inválida');
      return;
    }

    setSaving(true);
    try {
      const paymentLabel = getPaymentMethodLabel(paymentMethod);
      const input = {
        date: new Date(),
        items: cart.items,
        paymentMethod,
        paymentMethodLabel: paymentLabel,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        subtotal,
        discountType: discountType ?? undefined,
        discountValue: Number(discountValue) || 0,
        discountAmount,
        total,
        amountPaid: paymentMethod === 'efectivo' ? paid || undefined : undefined,
        change: paymentMethod === 'efectivo' ? change : undefined,
        createdBy: user.uid,
        createdByName: seller,
      };

      if (editId) {
        await updateSale(editId, input, previousItems);
      } else {
        await createSale(input);
      }
      cart.clear();
      navigate('/sales-list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la venta');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando…</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>{editId ? 'Editar venta' : 'Nueva venta'}</h3>
          <p>Seleccioná productos y confirmá el cobro</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : editId ? 'Actualizar venta' : 'Confirmar venta'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3 className="card-title">Productos</h3>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 12, top: 12, color: '#6B7280' }}
                />
                <input
                  className="search-input"
                  style={{ width: '100%' }}
                  placeholder="Buscar para agregar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{formatCurrency(p.price)}</td>
                      <td>{p.stock}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => cart.addProduct(p)}
                          disabled={p.stock <= 0}
                        >
                          <Plus size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Ítem extra</h3>
            <div className="field-row">
              <div className="field">
                <label>Descripción</label>
                <input value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)} />
              </div>
              <div className="field">
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addExtra}>
              Agregar extra
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3 className="card-title">Carrito ({cart.count})</h3>
            {cart.items.length === 0 ? (
              <p className="muted">Todavía no hay ítems</p>
            ) : (
              cart.items.map((item) => (
                <div className="cart-item" key={item.productId}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{item.productName}</strong>
                    <div className="muted">{formatCurrency(item.unitPrice)} c/u</div>
                    <div className="qty-controls" style={{ marginTop: 6 }}>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          cart.updateQuantity(
                            item.productId,
                            Number(e.target.value) || 1,
                            stockById.get(item.productId)
                          )
                        }
                      />
                      <span className="muted">{formatCurrency(item.subtotal)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => cart.removeItem(item.productId)}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                </div>
              ))
            )}

            <div style={{ marginTop: 16 }} className="stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              {discountAmount > 0 && (
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">Descuento</span>
                  <strong style={{ color: 'var(--accent)' }}>
                    -{formatCurrency(discountAmount)}
                  </strong>
                </div>
              )}
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>Total</span>
                <strong style={{ fontSize: 20, color: 'var(--accent)' }}>
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Datos de la venta</h3>
            <div className="field">
              <label>Vendedor</label>
              <select value={seller} onChange={(e) => setSeller(e.target.value)}>
                {SALE_SELLERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cliente (nombre)</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Teléfono</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="11…"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Forma de pago</label>
              <div className="payment-grid">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    className={`payment-option ${paymentMethod === pm.value ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(pm.value)}
                  >
                    {pm.label}
                    {pm.alias ? <div className="muted">{pm.alias}</div> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Descuento</label>
                <select
                  value={discountType ?? ''}
                  onChange={(e) =>
                    setDiscountType((e.target.value || null) as DiscountType | null)
                  }
                >
                  <option value="">Sin descuento</option>
                  <option value="percent">Porcentaje %</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </div>
              <div className="field">
                <label>Valor</label>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  disabled={!discountType}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            {paymentMethod === 'efectivo' && (
              <div className="field-row">
                <div className="field">
                  <label>Paga con</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Vuelto</label>
                  <input value={formatCurrency(change)} readOnly />
                </div>
              </div>
            )}

            <p className="muted">
              Operador: {profile?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
