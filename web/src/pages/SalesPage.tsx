import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Search, ShoppingCart, Landmark, Banknote, CreditCard, QrCode } from 'lucide-react';
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
  getUniqueProductCategories,
} from '@advance-coat/shared';
import { getProducts } from '../services/products';
import { createSale, updateSale, getSale } from '../services/sales';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const PAYMENT_ICONS: Record<string, typeof Landmark> = {
  'account-balance': Landmark,
  payments: Banknote,
  'credit-card': CreditCard,
  'qr-code': QrCode,
};
export function SalesPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [seller, setSeller] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCuit, setCustomerCuit] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraQty, setExtraQty] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [showExtraForm, setShowExtraForm] = useState(false);
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
            setSeller(sale.createdByName || '');
            if (sale.date) setSaleDate(sale.date.toISOString().slice(0, 10));
            setCustomerName(sale.customer?.name ?? '');
            setCustomerPhone(sale.customer?.phone ?? '');
            setCustomerEmail(sale.customer?.email ?? '');
            setCustomerCuit(sale.customer?.cuit ?? '');
            setPaymentMethod(sale.paymentMethod);
            setWantsInvoice(sale.wantsInvoice === true);
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

  const searchTerm = search.toLowerCase().trim();
  const categories = useMemo(() => getUniqueProductCategories(products), [products]);
  const showBrowseResults = searchTerm.length > 0 || category !== null;

  const filteredProducts = useMemo(() => {
    if (!showBrowseResults) return [];
    return products
      .filter((p) => {
        if (p.stock <= 0) return false;
        if (category && p.category !== category) return false;
        if (!searchTerm) return true;
        return (
          p.name.toLowerCase().includes(searchTerm) ||
          p.category.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 15);
  }, [products, searchTerm, category, showBrowseResults]);

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
  const canAskInvoice =
    paymentMethod === 'debito' || paymentMethod === 'credito' || paymentMethod === 'qr';

  function addExtra() {
    if (!extraDesc.trim() || !extraPrice) return;
    const qty = Math.max(1, Number(extraQty) || 1);
    const item = createExtraItem(extraDesc, qty, Number(extraPrice) || 0);
    cart.setItems([...cart.items, item]);
    setExtraDesc('');
    setExtraQty('1');
    setExtraPrice('');
    setShowExtraForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!seller) {
      setError('Elegí quién vende');
      return;
    }
    if (cart.items.length === 0) {
      setError('Agregá al menos un producto');
      return;
    }
    if (!user) {
      setError('Sesión inválida');
      return;
    }
    if (canAskInvoice && wantsInvoice) {
      if (!customerPhone.trim() || !customerName.trim() || !customerEmail.trim() || !customerCuit.trim()) {
        setError('Para factura completá teléfono, nombre, email y CUIT');
        return;
      }
    }

    setSaving(true);
    try {
      const paymentLabel = getPaymentMethodLabel(paymentMethod);
      const input = {
        date: saleDate ? new Date(`${saleDate}T12:00:00`) : new Date(),
        items: cart.items,
        paymentMethod,
        paymentMethodLabel: paymentLabel,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          cuit: customerCuit.trim() || undefined,
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
        wantsInvoice: canAskInvoice && wantsInvoice,
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

  const submitLabel = saving
    ? 'Guardando…'
    : editId
      ? 'Guardar cambios'
      : 'Registrar venta';

  const selectedAlias = PAYMENT_METHODS.find((pm) => pm.value === paymentMethod)?.alias;

  return (
    <form className="sale-form sale-form-app" onSubmit={handleSubmit}>
      {error && <p className="error-text">{error}</p>}

      <div className="field">
        <label>Fecha</label>
        <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
      </div>

      <div className="field">
        <label>Vendedor</label>
        <select value={seller} onChange={(e) => setSeller(e.target.value)}>
          <option value="">Elegí quién vende</option>
          {SALE_SELLERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <h4 className="sale-section-title">Datos del cliente</h4>
      <div className="field">
        <label>{wantsInvoice ? 'Teléfono *' : 'Teléfono (identificador)'}</label>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="11 2345 6789"
          inputMode="tel"
        />
      </div>
      <div className="field">
        <label>{wantsInvoice ? 'Nombre y apellido *' : 'Nombre y apellido'}</label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Se completa si ya compró"
        />
      </div>
      <div className="field">
        <label>{wantsInvoice ? 'Email *' : 'Email (opcional)'}</label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="cliente@email.com"
        />
      </div>

      <div className="sale-search">
        <Search size={16} className="sale-search-icon" />
        <input
          className="search-input"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
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
      )}

      {showBrowseResults && (
        <div className="product-pick-list product-pick-list-open">
          {filteredProducts.length === 0 ? (
            <p className="muted sale-empty-hint">No hay productos con esa búsqueda</p>
          ) : (
            filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                className="product-pick-row"
                onClick={() => {
                  cart.addProduct(p);
                  setSearch('');
                  setCategory(null);
                }}
                disabled={p.stock <= 0}
              >
                <div className="product-pick-info">
                  <strong>{p.name}</strong>
                  <span className="muted">
                    {formatCurrency(p.price)} · Stock {p.stock}
                  </span>
                </div>
                <span className="product-pick-add" aria-hidden>
                  <Plus size={18} />
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <button
        type="button"
        className="sale-extra-toggle"
        onClick={() => setShowExtraForm((prev) => !prev)}
      >
        <Plus size={18} />
        Agregar extra
      </button>

      {showExtraForm && (
        <div className="sale-extra-panel">
          <h4 className="sale-section-title" style={{ marginTop: 0 }}>
            Extra personalizado
          </h4>
          <div className="field">
            <label>Descripción</label>
            <input
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              placeholder="Ej: Instalación, flete…"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Cantidad</label>
              <input
                type="number"
                min="1"
                value={extraQty}
                onChange={(e) => setExtraQty(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="field">
              <label>Precio c/u</label>
              <input
                type="number"
                min="0"
                value={extraPrice}
                onChange={(e) => setExtraPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="sale-extra-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setShowExtraForm(false);
                setExtraDesc('');
                setExtraQty('1');
                setExtraPrice('');
              }}
            >
              Cancelar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={addExtra}>
              Agregar
            </button>
          </div>
        </div>
      )}

      <h4 className="sale-section-title">
        Productos seleccionados ({cart.items.length})
      </h4>

      {cart.items.length === 0 ? (
        <div className="sale-empty-cart">
          <ShoppingCart size={36} strokeWidth={1.5} />
          <p>Sin productos</p>
          <span className="muted">Buscá productos o agregá un extra</span>
        </div>
      ) : (
        <div className="sale-selected-list">
          {cart.items.map((item) => (
            <div className="cart-item" key={item.productId}>
              <div className="cart-item-body">
                <strong>{item.productName}</strong>
                <div className="muted">{formatCurrency(item.unitPrice)} c/u</div>
                <div className="qty-controls">
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
                aria-label="Quitar del carrito"
              >
                <Trash2 size={14} color="#EF4444" />
              </button>
            </div>
          ))}
        </div>
      )}

      <h4 className="sale-section-title">Descuento</h4>
      <div className="chip-group">
        <button
          type="button"
          className={`chip ${discountType === 'percent' ? 'active' : ''}`}
          onClick={() => setDiscountType(discountType === 'percent' ? null : 'percent')}
        >
          Porcentaje %
        </button>
        <button
          type="button"
          className={`chip ${discountType === 'fixed' ? 'active' : ''}`}
          onClick={() => setDiscountType(discountType === 'fixed' ? null : 'fixed')}
        >
          Monto fijo $
        </button>
      </div>
      {discountType && (
        <div className="field">
          <label>{discountType === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}</label>
          <input
            type="number"
            min="0"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="0"
          />
        </div>
      )}

      <h4 className="sale-section-title">Forma de pago</h4>
      <div className="payment-grid">
        {PAYMENT_METHODS.map((pm) => {
          const Icon = PAYMENT_ICONS[pm.icon] ?? Banknote;
          return (
            <button
              key={pm.value}
              type="button"
              className={`payment-option ${paymentMethod === pm.value ? 'active' : ''}`}
              onClick={() => {
                setPaymentMethod(pm.value);
                if (pm.value !== 'efectivo') setAmountPaid('');
                if (pm.value !== 'debito' && pm.value !== 'credito' && pm.value !== 'qr') {
                  setWantsInvoice(false);
                }
              }}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{pm.label}</span>
            </button>
          );
        })}
      </div>
      {selectedAlias ? (
        <div className="sale-alias-card">
          <span className="muted">Alias para transferir</span>
          <strong>{selectedAlias}</strong>
        </div>
      ) : null}

      {canAskInvoice ? (
        <>
          <h4 className="sale-section-title">Factura</h4>
          <div className="invoice-toggle-row">
            <button
              type="button"
              className={`invoice-option ${!wantsInvoice ? 'active' : ''}`}
              onClick={() => setWantsInvoice(false)}
            >
              Sin factura
            </button>
            <button
              type="button"
              className={`invoice-option ${wantsInvoice ? 'active' : ''}`}
              onClick={() => setWantsInvoice(true)}
            >
              Con factura
            </button>
          </div>
          {wantsInvoice ? (
            <>
              <div className="field" style={{ marginTop: 8 }}>
                <label>CUIT / CUIL *</label>
                <input
                  value={customerCuit}
                  onChange={(e) => setCustomerCuit(e.target.value)}
                  placeholder="20-12345678-9"
                  inputMode="numeric"
                />
              </div>
              <p className="caja-hint">Queda pendiente en el panel admin para emitir.</p>
            </>
          ) : null}
        </>
      ) : null}

      <div className="sale-summary-card">
        <div className="row sale-total-row">
          <span className="muted">Subtotal</span>
          <strong>{formatCurrency(subtotal)}</strong>
        </div>
        {discountAmount > 0 && (
          <div className="row sale-total-row">
            <span className="muted">Descuento</span>
            <strong style={{ color: 'var(--accent)' }}>
              -{formatCurrency(discountAmount)}
            </strong>
          </div>
        )}
        <div className="row sale-total-row sale-summary-total">
          <span>Total</span>
          <strong className="sale-total-amount">{formatCurrency(total)}</strong>
        </div>
      </div>

      {paymentMethod === 'efectivo' && (
        <div className="sale-cash-row">
          <div className="field">
            <label>Paga con</label>
            <input
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="sale-change-box">
            <span className="muted">Vuelto</span>
            <strong>{formatCurrency(change)}</strong>
          </div>
        </div>
      )}

      <button type="submit" className="btn btn-primary sale-register-btn" disabled={saving}>
        {submitLabel}
      </button>
    </form>
  );
}
