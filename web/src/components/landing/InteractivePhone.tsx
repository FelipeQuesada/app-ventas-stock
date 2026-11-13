import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';

type Tab = 'inicio' | 'ventas' | 'productos' | 'caja';

type ChartPoint = {
  label: string;
  amount: number;
  tickets: number;
};

const TABS: { id: Tab | 'mas'; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'caja', label: 'Caja', icon: Wallet },
  { id: 'mas', label: 'Más', icon: MoreHorizontal },
];

const BASE_POINTS: ChartPoint[] = [
  { label: '11/10', amount: 180000, tickets: 7 },
  { label: '13/10', amount: 420000, tickets: 12 },
  { label: '15/10', amount: 260000, tickets: 9 },
  { label: '17/10', amount: 1100000, tickets: 28 },
  { label: '19/10', amount: 380000, tickets: 11 },
  { label: '21/10', amount: 0, tickets: 0 },
  { label: '23/10', amount: 520000, tickets: 15 },
  { label: '25/10', amount: 210000, tickets: 8 },
  { label: '27/10', amount: 640000, tickets: 18 },
  { label: '29/10', amount: 90000, tickets: 3 },
  { label: '31/10', amount: 470000, tickets: 14 },
  { label: '02/11', amount: 330000, tickets: 10 },
  { label: '04/11', amount: 710000, tickets: 19 },
  { label: '06/11', amount: 150000, tickets: 5 },
  { label: '09/11', amount: 580000, tickets: 16 },
];

const Y_MAX = 1200000;

function money(n: number) {
  return `$ ${n.toLocaleString('es-AR')}`;
}

function buildPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function InteractivePhone() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [points, setPoints] = useState(BASE_POINTS);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [salesCount, setSalesCount] = useState(16);
  const [revenue, setRevenue] = useState(440600);
  const [saleFlash, setSaleFlash] = useState(false);
  const [cajaClosed, setCajaClosed] = useState(false);
  const [cart, setCart] = useState([
    { id: 'drink', name: 'Bebida 500ml', unit: 1800, qty: 2 },
    { id: 'snack', name: 'Snack pack', unit: 1200, qty: 1 },
  ]);
  const [stock, setStock] = useState([
    { id: 'a', name: 'Bebida 500ml', qty: 18 },
    { id: 'b', name: 'Snack pack', qty: 2 },
    { id: 'c', name: 'Agua 2L', qty: 40 },
  ]);

  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.unit, 0);

  const chart = useMemo(() => {
    const width = 280;
    const height = 112;
    const padL = 34;
    const padR = 8;
    const padT = 12;
    const padB = 8;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const coords = points.map((p, i) => {
      const x = padL + (i / Math.max(points.length - 1, 1)) * innerW;
      const y = padT + innerH - (Math.min(p.amount, Y_MAX) / Y_MAX) * innerH;
      return { x, y, ...p };
    });
    const line = buildPath(coords.map(({ x, y }) => ({ x, y })));
    const area =
      coords.length > 0
        ? `${line} L ${coords[coords.length - 1].x} ${padT + innerH} L ${coords[0].x} ${padT + innerH} Z`
        : '';
    return { width, height, padL, padT, innerH, coords, line, area };
  }, [points]);

  function registerSale() {
    const amount = cartTotal;
    setSalesCount((n) => n + 1);
    setRevenue((n) => n + amount);
    setPoints((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = {
        ...last,
        amount: last.amount + amount,
        tickets: last.tickets + 1,
      };
      return next;
    });
    setSaleFlash(true);
    window.setTimeout(() => setSaleFlash(false), 1400);
  }

  function bumpCart(id: string, delta: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  }

  function bumpStock(id: string, delta: number) {
    setStock((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, Math.min(99, item.qty + delta)) } : item
      )
    );
  }

  const lowStock = stock.filter((s) => s.qty <= 5).length;
  const active = activeIdx != null ? chart.coords[activeIdx] : null;

  return (
    <div className="lp-phone-wrap">
      <p className="lp-phone-hint">Tocá el gráfico y los botones del mockup</p>

      <div className="lp-phone-stage">
        {tab === 'inicio' ? (
          <>
            <div className="lp-float-card lp-fc1">
              <b>{money(revenue)}</b>
              <span>Recaudación del mes</span>
            </div>
            <div className="lp-float-card lp-fc2">
              <b>{lowStock || 268} productos</b>
              <span>con stock bajo</span>
            </div>
          </>
        ) : null}

        <div className="lp-phone" role="region" aria-label="Demo interactiva de Control+">
        <div className="lp-screen lp-screen-app">
          <div className="lp-app">
            {saleFlash ? (
              <div className="lp-app-flash is-sale" role="status">
                <CheckCircle2 size={28} />
                <strong>Venta registrada</strong>
                <span>{money(cartTotal)}</span>
              </div>
            ) : null}

            {cajaClosed ? (
              <div className="lp-app-flash is-caja" role="status">
                <CheckCircle2 size={28} />
                <strong>Caja cerrada</strong>
                <span>Cambio listo para mañana</span>
              </div>
            ) : null}

            {tab === 'inicio' ? (
              <div className="lp-app-scroll">
                <div className="lp-app-metrics">
                  <div className="lp-app-card">
                    <span>RECAUDACIÓN</span>
                    <strong>{money(revenue)}</strong>
                    <small>{salesCount} ventas</small>
                  </div>
                  <div className="lp-app-card">
                    <span>TICKET PROM.</span>
                    <strong>{money(Math.round(revenue / Math.max(salesCount, 1)))}</strong>
                    <small>este mes</small>
                  </div>
                </div>

                <div className="lp-app-chart-card">
                  <b>Ventas últimos 30 días</b>
                  <small>Tocá un punto del gráfico</small>
                  <div className="lp-chart-wrap">
                    {active ? (
                      <div
                        className="lp-chart-tooltip"
                        style={{
                          left: `${Math.min(Math.max((active.x / chart.width) * 100, 20), 80)}%`,
                        }}
                      >
                        <strong>{active.label}</strong>
                        <span>{active.tickets} ventas</span>
                        <span>{money(active.amount)}</span>
                      </div>
                    ) : null}
                    <svg
                      className="lp-app-chart"
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      onMouseLeave={() => setActiveIdx(null)}
                    >
                      <defs>
                        <linearGradient id="lpChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <g className="lp-app-grid">
                        {[0, 0.33, 0.66, 1].map((t) => {
                          const y = chart.padT + chart.innerH * (1 - t);
                          return (
                            <line
                              key={t}
                              x1={chart.padL}
                              y1={y}
                              x2={chart.width - 8}
                              y2={y}
                            />
                          );
                        })}
                      </g>
                      <text x="2" y="16" className="lp-app-axis">
                        1.2M
                      </text>
                      <text x="2" y="52" className="lp-app-axis">
                        600k
                      </text>
                      <text x="2" y="88" className="lp-app-axis">
                        0
                      </text>
                      <path className="lp-app-area" d={chart.area} fill="url(#lpChartFill)" />
                      <path className="lp-app-line is-live" d={chart.line} />
                      {chart.coords.map((p, i) => (
                        <g key={p.label}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={activeIdx === i ? 5 : 3}
                            className={`lp-app-dot ${activeIdx === i ? 'is-on' : ''}`}
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={14}
                            fill="transparent"
                            className="lp-app-hit"
                            onMouseEnter={() => setActiveIdx(i)}
                            onFocus={() => setActiveIdx(i)}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              setActiveIdx(i);
                            }}
                          />
                        </g>
                      ))}
                    </svg>
                    <div className="lp-app-x">
                      <span>11/10</span>
                      <span>19/10</span>
                      <span>27/10</span>
                      <span>04/11</span>
                      <span>09/11</span>
                    </div>
                  </div>
                </div>

                <div className="lp-app-quick">
                  <div className="lp-app-quick-head">
                    <b>Accesos rápidos</b>
                    <small>Atajos frecuentes</small>
                  </div>
                  <div className="lp-app-quick-grid">
                    <button type="button" onClick={() => setTab('ventas')}>
                      <span className="lp-app-quick-icon">
                        <ShoppingCart size={16} />
                      </span>
                      Nueva venta
                    </button>
                    <button type="button" onClick={() => setTab('productos')}>
                      <span className="lp-app-quick-icon">
                        <Package size={16} />
                      </span>
                      Productos
                    </button>
                    <button type="button" onClick={() => setTab('caja')}>
                      <span className="lp-app-quick-icon">
                        <Wallet size={16} />
                      </span>
                      Caja
                    </button>
                    <button type="button" onClick={() => setTab('productos')}>
                      <span className="lp-app-quick-icon">
                        <Warehouse size={16} />
                      </span>
                      Stock
                    </button>
                    <button type="button" className="is-muted">
                      <span className="lp-app-quick-icon">
                        <Users size={16} />
                      </span>
                      Clientes
                    </button>
                    <button type="button" className="is-muted">
                      <span className="lp-app-quick-icon">
                        <BarChart3 size={16} />
                      </span>
                      Estadísticas
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'ventas' ? (
              <div className="lp-app-panel lp-app-sale">
                <div className="lp-caja-head">
                  <b>Nueva venta</b>
                  <small>
                    Productos seleccionados ({cart.reduce((n, i) => n + i.qty, 0)})
                  </small>
                </div>
                <div className="lp-caja-card">
                  {cart.map((item, index) => (
                    <div key={item.id}>
                      {index > 0 ? <div className="lp-caja-divider" /> : null}
                      <div className="lp-sale-line">
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            {item.qty} un. · {money(item.unit)} c/u
                          </small>
                        </div>
                        <div className="lp-demo-stepper">
                          <button type="button" onClick={() => bumpCart(item.id, -1)} aria-label={`Menos ${item.name}`}>
                            −
                          </button>
                          <b>{money(item.qty * item.unit)}</b>
                          <button type="button" onClick={() => bumpCart(item.id, 1)} aria-label={`Más ${item.name}`}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lp-caja-card">
                  <div className="lp-caja-row is-highlight">
                    <span>Total a cobrar</span>
                    <strong>{money(cartTotal)}</strong>
                  </div>
                </div>
                <button type="button" className="lp-app-primary-btn" onClick={registerSale}>
                  Registrar venta
                </button>
              </div>
            ) : null}

            {tab === 'productos' ? (
              <div className="lp-app-panel">
                <div className="lp-caja-head">
                  <b>Productos</b>
                  <small>Sumá o restá stock</small>
                </div>
                <div className="lp-app-stock-list">
                  {stock.map((item) => (
                    <div key={item.id} className="lp-app-stock-row">
                      <div>
                        <strong>{item.name}</strong>
                        <small className={item.qty <= 5 ? 'is-warn' : undefined}>
                          {item.qty <= 5 ? 'Stock bajo' : 'Stock normal'}
                        </small>
                      </div>
                      <div className="lp-demo-stepper">
                        <button type="button" onClick={() => bumpStock(item.id, -1)}>
                          −
                        </button>
                        <span className={`lp-stock-badge ${item.qty <= 5 ? 'is-warn' : 'is-ok'}`}>
                          {item.qty} u.
                        </span>
                        <button type="button" onClick={() => bumpStock(item.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === 'caja' ? (
              <div className="lp-app-panel">
                <div className="lp-caja-head">
                  <b>Caja del día</b>
                  <small>Resumen en efectivo</small>
                </div>
                <div className="lp-app-caja-card">
                  <div>
                    <span>Caja cambio</span>
                    <strong>$ 20.000</strong>
                  </div>
                  <div>
                    <span>Ventas efectivo</span>
                    <strong>$ 44.200</strong>
                  </div>
                  <div>
                    <span>Caja total</span>
                    <strong>$ 64.200</strong>
                  </div>
                  <div className="is-ok">
                    <span>Ganancia</span>
                    <strong>$ 44.200</strong>
                  </div>
                  <div>
                    <span>Cambio mañana</span>
                    <strong>$ 24.200</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="lp-app-primary-btn"
                  disabled={cajaClosed}
                  onClick={() => {
                    setCajaClosed(true);
                    window.setTimeout(() => setCajaClosed(false), 1600);
                  }}
                >
                  Cerrar caja
                </button>
              </div>
            ) : null}

            <div className="lp-app-dock">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? 'is-active' : undefined}
                  onClick={() => {
                    if (id === 'mas') return;
                    setTab(id);
                    setActiveIdx(null);
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
