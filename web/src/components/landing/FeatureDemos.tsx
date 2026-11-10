import { useMemo, useState } from 'react';

export function SaleDemo() {
  const [qtyDrink, setQtyDrink] = useState(2);
  const [qtySnack, setQtySnack] = useState(1);
  const [draft, setDraft] = useState(true);
  const [saved, setSaved] = useState(false);

  const drinkTotal = qtyDrink * 1800;
  const snackTotal = qtySnack * 1200;
  const total = drinkTotal + snackTotal;

  return (
    <div className="lp-sale-mock lp-demo-live">
      <div className="lp-caja-head">
        <b>Nueva venta</b>
        <small>Productos seleccionados ({qtyDrink + qtySnack})</small>
      </div>
      <div className="lp-caja-card">
        <div className="lp-sale-line">
          <div>
            <strong>Bebida 500ml</strong>
            <small>
              {qtyDrink} un. · $ 1.800 c/u
            </small>
          </div>
          <div className="lp-demo-stepper">
            <button type="button" onClick={() => setQtyDrink((n) => Math.max(1, n - 1))} aria-label="Menos bebidas">
              −
            </button>
            <b>$ {drinkTotal.toLocaleString('es-AR')}</b>
            <button type="button" onClick={() => setQtyDrink((n) => n + 1)} aria-label="Más bebidas">
              +
            </button>
          </div>
        </div>
        <div className="lp-caja-divider" />
        <div className="lp-sale-line">
          <div>
            <strong>Snack pack</strong>
            <small>
              {qtySnack} un. · $ 1.200 c/u
            </small>
          </div>
          <div className="lp-demo-stepper">
            <button type="button" onClick={() => setQtySnack((n) => Math.max(1, n - 1))} aria-label="Menos snacks">
              −
            </button>
            <b>$ {snackTotal.toLocaleString('es-AR')}</b>
            <button type="button" onClick={() => setQtySnack((n) => n + 1)} aria-label="Más snacks">
              +
            </button>
          </div>
        </div>
      </div>
      <div className="lp-caja-card">
        <div className="lp-sale-line">
          <div>
            <strong>{draft ? 'Borrador · Pedido 3' : 'Venta lista · Pedido 3'}</strong>
            <small className={draft ? 'is-warn' : 'is-ok'}>
              {draft ? 'Pendiente de cobro' : 'Lista para cobrar'}
            </small>
          </div>
          <button
            type="button"
            className={`lp-stock-badge ${draft ? 'is-warn' : 'is-ok'}`}
            onClick={() => {
              setDraft((v) => !v);
              setSaved(false);
            }}
          >
            {draft ? 'Borrador' : 'Cobrar'}
          </button>
        </div>
      </div>
      <div className="lp-caja-card">
        <div className="lp-caja-row is-highlight">
          <span>Total a cobrar</span>
          <strong>$ {total.toLocaleString('es-AR')}</strong>
        </div>
      </div>
      <button
        type="button"
        className={`lp-caja-btn ${saved ? 'is-done' : ''}`}
        onClick={() => setSaved(true)}
      >
        {saved ? 'Venta registrada ✓' : 'Registrar venta'}
      </button>
    </div>
  );
}

type StockItem = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  min: number;
  max: number;
};

export function StockDemo() {
  const [items, setItems] = useState<StockItem[]>([
    { id: 'a', name: 'Producto A', unit: '1kg', qty: 18, min: 5, max: 25 },
    { id: 'b', name: 'Producto B', unit: '1.5L', qty: 2, min: 5, max: 20 },
    { id: 'c', name: 'Producto C', unit: 'pack', qty: 40, min: 8, max: 45 },
  ]);

  function bump(id: string, delta: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: Math.max(0, Math.min(item.max, item.qty + delta)) }
          : item
      )
    );
  }

  return (
    <div className="lp-stock-mock lp-demo-live">
      <div className="lp-caja-head">
        <b>Stock</b>
        <small>Tocá + / − para ver alertas</small>
      </div>
      {items.map((item) => {
        const low = item.qty <= item.min;
        const pct = Math.round((item.qty / item.max) * 100);
        return (
          <div className="lp-caja-card" key={item.id}>
            <div className="lp-stock-row">
              <div>
                <strong>
                  {item.name} · {item.unit}
                </strong>
                <small className={low ? 'is-warn' : undefined}>
                  {low ? 'Stock bajo' : 'Stock normal'}
                </small>
              </div>
              <div className="lp-demo-stepper">
                <button type="button" onClick={() => bump(item.id, -1)} aria-label={`Bajar ${item.name}`}>
                  −
                </button>
                <span className={`lp-stock-badge ${low ? 'is-warn' : 'is-ok'}`}>{item.qty} u.</span>
                <button type="button" onClick={() => bump(item.id, 1)} aria-label={`Subir ${item.name}`}>
                  +
                </button>
              </div>
            </div>
            <div className="lp-stock-meter">
              <i className={low ? 'is-warn' : 'is-ok'} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CajaDemo() {
  const [cambio, setCambio] = useState(20000);
  const [saved, setSaved] = useState(false);
  const ventas = 44200;
  const total = cambio + ventas;
  const ganancia = ventas;
  const manana = useMemo(() => Math.max(0, total - 40000), [total]);

  return (
    <div className="lp-caja-mock lp-demo-live">
      <div className="lp-caja-head">
        <b>Caja del día</b>
        <small>Ajustá el cambio inicial</small>
      </div>
      <div className="lp-caja-card">
        <div className="lp-caja-row">
          <span>Caja cambio</span>
          <div className="lp-demo-stepper">
            <button
              type="button"
              onClick={() => {
                setCambio((n) => Math.max(0, n - 1000));
                setSaved(false);
              }}
            >
              −
            </button>
            <strong>$ {cambio.toLocaleString('es-AR')}</strong>
            <button
              type="button"
              onClick={() => {
                setCambio((n) => n + 1000);
                setSaved(false);
              }}
            >
              +
            </button>
          </div>
        </div>
        <div className="lp-caja-divider" />
        <div className="lp-caja-row">
          <span>Ventas efectivo</span>
          <strong>$ {ventas.toLocaleString('es-AR')}</strong>
        </div>
        <div className="lp-caja-divider" />
        <div className="lp-caja-row">
          <span>Caja total</span>
          <strong>$ {total.toLocaleString('es-AR')}</strong>
        </div>
        <div className="lp-caja-divider" />
        <div className="lp-caja-row is-highlight">
          <span>Ganancia</span>
          <strong className="is-ok">$ {ganancia.toLocaleString('es-AR')}</strong>
        </div>
        <div className="lp-caja-divider" />
        <div className="lp-caja-row is-highlight">
          <span>Cambio para mañana</span>
          <strong>$ {manana.toLocaleString('es-AR')}</strong>
        </div>
      </div>
      <button
        type="button"
        className={`lp-caja-btn ${saved ? 'is-done' : ''}`}
        onClick={() => setSaved(true)}
      >
        {saved ? 'Cierre guardado ✓' : 'Guardar cierre de caja'}
      </button>
    </div>
  );
}
