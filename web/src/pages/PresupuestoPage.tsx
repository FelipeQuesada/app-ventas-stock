import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Product } from '@advance-coat/shared';
import {
  SALE_SELLERS,
  createExtraItem,
  formatCurrency,
  getUniqueProductCategories,
} from '@advance-coat/shared';
import { DateField } from '../components/DateField';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../services/products';
import { printHtml } from '../services/export';
import {
  buildPresupuestoHtml,
  defaultValidUntil,
  type PresupuestoItem,
} from '../services/presupuesto';
import {
  createPresupuesto,
  getPresupuesto,
  updatePresupuesto,
} from '../services/presupuestos';
import { findCustomerByPhone } from '../services/customers';

const CONTACT_DEFAULTS: Record<string, { phone: string; email: string }> = {
  Mateo: { phone: '+54 9 11 5171-4211', email: 'advancecoat.arg@gmail.com' },
  Joaquin: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Felipe: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Paula: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Martin: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Bruno: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
};

function DraftNumberInput({
  value,
  min = 0,
  step,
  onCommit,
}: {
  value: number;
  min?: number;
  step?: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const n = Number(draft.replace(',', '.'));
    if (!Number.isFinite(n) || n < min) {
      setDraft(String(value));
      return;
    }
    onCommit(n);
    setDraft(String(n));
  }

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') return;
        const n = Number(raw.replace(',', '.'));
        if (Number.isFinite(n) && n >= min) onCommit(n);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function PresupuestoPage() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const todayIso = () => new Date().toISOString().slice(0, 10);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<PresupuestoItem[]>([]);
  const [date, setDate] = useState(todayIso);
  const [validUntil, setValidUntil] = useState(() => defaultValidUntil(todayIso()));
  const [lockValidUntil, setLockValidUntil] = useState(false);
  const [contactName, setContactName] = useState('Mateo');
  const [contactPhone, setContactPhone] = useState(CONTACT_DEFAULTS.Mateo.phone);
  const [contactEmail, setContactEmail] = useState(CONTACT_DEFAULTS.Mateo.email);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCuit, setClientCuit] = useState('');
  const [notes, setNotes] = useState('');
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDesc, setExtraDesc] = useState('');
  const [extraQty, setExtraQty] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getProducts();
        if (!cancelled) setProducts(list);

        if (editId) {
          const existing = await getPresupuesto(editId);
          if (existing && !cancelled) {
            setLockValidUntil(true);
            setDate(format(existing.date, 'yyyy-MM-dd'));
            setValidUntil(format(existing.validUntil, 'yyyy-MM-dd'));
            setContactName(existing.contactName || 'Mateo');
            setContactPhone(existing.contactPhone || '');
            setContactEmail(existing.contactEmail || '');
            setClientName(existing.customer.name || '');
            setClientPhone(existing.customer.phone || '');
            setClientEmail(existing.customer.email || '');
            setClientCuit(existing.customer.cuit || '');
            setNotes(existing.notes || '');
            setItems(existing.items || []);
          } else if (!cancelled) {
            setError('Presupuesto no encontrado');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (lockValidUntil) return;
    setValidUntil(defaultValidUntil(date));
  }, [date, lockValidUntil]);

  const searchTerm = search.toLowerCase().trim();
  const categories = useMemo(() => getUniqueProductCategories(products), [products]);
  const showBrowseResults = searchTerm.length > 0 || category !== null;

  const filteredProducts = useMemo(() => {
    if (!showBrowseResults) return [];
    return products
      .filter((p) => {
        if (p.hidden) return false;
        if (category && p.category !== category) return false;
        if (!searchTerm) return true;
        return (
          p.name.toLowerCase().includes(searchTerm) ||
          p.category.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 15);
  }, [products, searchTerm, category, showBrowseResults]);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  function applyContact(name: string) {
    setContactName(name);
    const defaults = CONTACT_DEFAULTS[name];
    if (defaults) {
      setContactPhone(defaults.phone);
      setContactEmail(defaults.email);
    }
  }

  function addProduct(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: item.unitPrice * (item.quantity + 1),
              }
            : item
        );
      }
      return [
        ...current,
        {
          id: product.id,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    });
    setSearch('');
    setCategory(null);
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity, subtotal: item.unitPrice * quantity }
          : item
      )
    );
  }

  function updateUnitPrice(id: string, unitPrice: number) {
    if (unitPrice < 0) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, unitPrice, subtotal: unitPrice * item.quantity }
          : item
      )
    );
  }

  function updateSubtotal(id: string, subtotal: number) {
    if (subtotal < 0) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              subtotal,
              unitPrice: item.quantity > 0 ? subtotal / item.quantity : subtotal,
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function handleAddExtra() {
    const qty = Number(extraQty) || 1;
    const price = Number(extraPrice.replace(',', '.'));
    if (!extraDesc.trim()) {
      setError('Completá la descripción del extra');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Precio inválido');
      return;
    }
    const extra = createExtraItem(extraDesc.trim(), qty, price);
    setItems((current) => [
      ...current,
      {
        id: `extra-${Date.now()}`,
        productName: extra.productName,
        quantity: extra.quantity,
        unitPrice: extra.unitPrice,
        subtotal: extra.subtotal,
      },
    ]);
    setExtraDesc('');
    setExtraQty('1');
    setExtraPrice('');
    setShowExtraForm(false);
    setError('');
  }

  async function fillCustomerFromPhone() {
    const phone = clientPhone.trim();
    if (!phone) return;
    try {
      const existing = await findCustomerByPhone(phone);
      if (!existing) return;
      if (!clientName.trim() && existing.name) setClientName(existing.name);
      if (!clientEmail.trim() && existing.email) setClientEmail(existing.email);
      if (!clientCuit.trim() && existing.cuit) setClientCuit(existing.cuit);
    } catch {
      // ignore lookup errors
    }
  }

  async function handleGeneratePdf() {
    setError('');
    if (items.length === 0) {
      setError('Agregá al menos un producto');
      return;
    }
    if (!clientName.trim()) {
      setError('Completá el nombre del cliente / empresa');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: new Date(`${date}T12:00:00`),
        validUntil: new Date(`${validUntil}T12:00:00`),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        customer: {
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          cuit: clientCuit.trim() || '',
        },
        items,
        notes: notes.trim() || undefined,
        createdBy: user?.uid ?? '',
        createdByName: profile?.name || contactName.trim(),
      };

      if (editId) {
        await updatePresupuesto(editId, payload);
      } else {
        await createPresupuesto(payload);
      }

      printHtml(
        buildPresupuestoHtml({
          date,
          validUntil,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
          clientCuit: clientCuit.trim() || undefined,
          items,
          notes: notes.trim() || undefined,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el presupuesto');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Cargando productos…</div>;

  return (
    <div>
      <form
        className="sale-form sale-form-app"
        onSubmit={(e) => {
          e.preventDefault();
          void handleGeneratePdf();
        }}
      >
        <div className="page-header" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>{editId ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Se guarda en el historial y en el cliente (no descuenta stock)
            </p>
          </div>
          <Link to="/presupuesto/list" className="btn btn-ghost btn-sm">
            Historial
          </Link>
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <DateField label="Fecha" value={date} onChange={setDate} />
        <DateField
          label="Válido hasta"
          value={validUntil}
          onChange={(value) => {
            setLockValidUntil(true);
            setValidUntil(value);
          }}
        />

        <h4 className="sale-section-title">Persona de contacto</h4>
        <div className="field">
          <label>Contacto</label>
          <select value={contactName} onChange={(e) => applyContact(e.target.value)}>
            {SALE_SELLERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Teléfono contacto</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+54 9 11 …"
          />
        </div>
        <div className="field">
          <label>Email contacto</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <h4 className="sale-section-title">Cliente (PARA)</h4>
        <div className="field">
          <label>Nombre / empresa *</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ej: Vialidad Nacional"
          />
        </div>
        <div className="field">
          <label>CUIT / CUIL</label>
          <input
            value={clientCuit}
            onChange={(e) => setClientCuit(e.target.value)}
            placeholder="20-12345678-9"
            inputMode="numeric"
          />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            onBlur={() => void fillCustomerFromPhone()}
            placeholder="+54 9 11 …"
            inputMode="tel"
          />
        </div>
        <div className="field">
          <label>Email (opcional)</label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="cliente@email.com"
          />
        </div>

        <div className="sale-search">
          <Search size={16} className="sale-search-icon" />
          <input
            className="search-input"
            placeholder="Buscar producto…"
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
                  onClick={() => addProduct(p)}
                >
                  <div className="product-pick-info">
                    <strong>{p.name}</strong>
                    <span className="muted">{formatCurrency(p.price)}</span>
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
          {showExtraForm ? 'Cancelar extra' : '+ Agregar ítem libre'}
        </button>

        {showExtraForm && (
          <div className="sale-extra-form">
            <div className="field">
              <label>Descripción</label>
              <input
                value={extraDesc}
                onChange={(e) => setExtraDesc(e.target.value)}
                placeholder="Producto / servicio"
              />
            </div>
            <div className="field">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                value={extraQty}
                onChange={(e) => setExtraQty(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Precio c/u</label>
              <input
                type="number"
                min={0}
                value={extraPrice}
                onChange={(e) => setExtraPrice(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleAddExtra}>
              Agregar
            </button>
          </div>
        )}

        <h4 className="sale-section-title">Productos del presupuesto ({items.length})</h4>

        {items.length === 0 ? (
          <div className="sale-empty-cart">
            <FileText size={36} strokeWidth={1.5} />
            <p>Sin ítems</p>
            <span className="muted">Buscá productos o agregá un ítem libre</span>
          </div>
        ) : (
          <div className="sale-selected-list">
            {items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-body">
                  <strong>{item.productName}</strong>
                  <div className="cart-item-fields">
                    <label className="cart-field">
                      <span>Cantidad</span>
                      <DraftNumberInput
                        value={item.quantity}
                        min={1}
                        onCommit={(n) => updateQuantity(item.id, n)}
                      />
                    </label>
                    <label className="cart-field">
                      <span>Precio c/u</span>
                      <DraftNumberInput
                        value={item.unitPrice}
                        min={0}
                        step="1"
                        onCommit={(n) => updateUnitPrice(item.id, n)}
                      />
                    </label>
                    <label className="cart-field">
                      <span>Total línea</span>
                      <DraftNumberInput
                        value={item.subtotal}
                        min={0}
                        step="1"
                        onCommit={(n) => updateSubtotal(item.id, n)}
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => removeItem(item.id)}
                  aria-label="Quitar"
                >
                  <Trash2 size={14} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label>Otros detalles (opcional)</label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Si lo dejás vacío, se usan las condiciones estándar del presupuesto."
          />
        </div>

        <div className="sale-summary-card">
          <div className="row sale-total-row">
            <span>Total presupuesto</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          style={{ marginTop: 12 }}
          disabled={saving}
        >
          <FileText size={18} style={{ marginRight: 8 }} />
          {saving ? 'Guardando…' : editId ? 'Guardar cambios y PDF' : 'Guardar y generar PDF'}
        </button>
      </form>
    </div>
  );
}
