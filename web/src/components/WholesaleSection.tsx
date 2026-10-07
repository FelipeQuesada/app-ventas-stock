import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Product, SaleItem } from '@advance-coat/shared';
import {
  WHOLESALE_OFFERS,
  buildWholesalePackLine,
  discountedUnitPrice,
  formatCurrency,
  resolveWholesaleProduct,
  wholesaleTierSummary,
  type WholesaleOffer,
} from '@advance-coat/shared';

export function WholesaleSection({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (lines: SaleItem[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [variado, setVariado] = useState(false);
  const [packs, setPacks] = useState(1);
  const [colorUnits, setColorUnits] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  function addColorPack(offer: WholesaleOffer, colorIncludes: string) {
    const product = resolveWholesaleProduct(products, offer, colorIncludes);
    if (!product) {
      setError(`No encontré ${offer.label} (${colorIncludes}) en el catálogo`);
      return;
    }
    setError('');
    onAdd([buildWholesalePackLine(product, offer, offer.unitsPerPack)]);
  }

  function addPlainPack(offer: WholesaleOffer) {
    const product = resolveWholesaleProduct(products, offer);
    if (!product) {
      setError(`No encontré “${offer.label}” en el catálogo`);
      return;
    }
    setError('');
    onAdd([buildWholesalePackLine(product, offer, offer.unitsPerPack)]);
  }

  function addVariado(offer: WholesaleOffer) {
    if (!offer.colors) return;
    const target = Math.max(1, packs) * offer.unitsPerPack;
    const lines: SaleItem[] = [];
    let sum = 0;
    for (const color of offer.colors) {
      const units = Math.round(Number(colorUnits[color.id]) || 0);
      if (units <= 0) continue;
      const product = resolveWholesaleProduct(products, offer, color.nameIncludes);
      if (!product) {
        setError(`No encontré el color ${color.label}`);
        return;
      }
      sum += units;
      lines.push(buildWholesalePackLine(product, offer, units));
    }
    if (lines.length === 0 || sum !== target) {
      setError(`Las unidades tienen que sumar ${target} (${packs} ${offer.unitLabel}${packs === 1 ? '' : 's'})`);
      return;
    }
    setError('');
    onAdd(lines);
    setColorUnits({});
  }

  return (
    <div className="wholesale-list">
      <p className="caja-hint">
        El descuento sale de cuántas cajas o packs van de ese producto. Las unidades sueltas del
        mismo usan ese porcentaje. Otro producto queda a precio de lista.
      </p>
      {error && <p className="error-text">{error}</p>}
      {WHOLESALE_OFFERS.map((offer) => {
        const open = openId === offer.id;
        const firstTier = [...offer.tiers].sort((a, b) => a.minPacks - b.minPacks)[0];
        const sample = discountedUnitPrice(offer.listUnitPrice, firstTier?.percent ?? 0);
        const resolved = offer.colors ? null : resolveWholesaleProduct(products, offer);
        return (
          <div key={offer.id} className="wholesale-card">
            <button
              type="button"
              className="product-pick-row"
              onClick={() => {
                setError('');
                if (offer.colors) {
                  setOpenId(open ? null : offer.id);
                  setVariado(false);
                  setPacks(1);
                  setColorUnits({});
                  return;
                }
                addPlainPack(offer);
              }}
            >
              <div className="product-pick-info">
                <strong>{offer.label}</strong>
                <span className="muted">
                  {offer.unitLabel === 'caja' ? 'Caja' : 'Pack'} de {offer.unitsPerPack} · público{' '}
                  {formatCurrency(offer.listUnitPrice)} · desde {formatCurrency(sample)} c/u (−
                  {firstTier?.percent ?? 0}%)
                  {resolved ? ` · stock ${resolved.stock}` : offer.colors ? '' : ' · no está en el catálogo'}
                </span>
                <span className="muted">{wholesaleTierSummary(offer)}</span>
              </div>
              <span className="product-pick-add" aria-hidden>
                <Plus size={18} />
              </span>
            </button>
            {open && offer.colors && (
              <div className="wholesale-colors">
                <div className="chip-group">
                  <button
                    type="button"
                    className={`chip ${variado ? 'active' : ''}`}
                    onClick={() => setVariado(true)}
                  >
                    Variado
                  </button>
                  {offer.colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      className="chip"
                      onClick={() => addColorPack(offer, color.nameIncludes)}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
                {variado && (
                  <div className="wholesale-variado">
                    <p className="caja-hint">
                      Repartí {packs * offer.unitsPerPack} unidades entre los colores. Cuenta como{' '}
                      {packs} {offer.unitLabel}
                      {packs === 1 ? '' : 's'}.
                    </p>
                    <div className="field">
                      <label>Packs surtidos</label>
                      <input
                        type="number"
                        min={1}
                        value={packs}
                        onChange={(e) => setPacks(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                    <div className="wholesale-color-grid">
                      {offer.colors.map((color) => (
                        <label key={color.id} className="field">
                          <span>{color.label}</span>
                          <input
                            type="number"
                            min={0}
                            value={colorUnits[color.id] ?? ''}
                            onChange={(e) =>
                              setColorUnits((current) => ({ ...current, [color.id]: e.target.value }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => addVariado(offer)}>
                      Agregar surtido
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
