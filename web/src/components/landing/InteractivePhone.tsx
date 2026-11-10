import { useState } from 'react';
import {
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Wallet,
} from 'lucide-react';

type Tab = 'inicio' | 'ventas' | 'productos' | 'caja' | 'mas';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'caja', label: 'Caja', icon: Wallet },
  { id: 'mas', label: 'Más', icon: MoreHorizontal },
];

export function InteractivePhone() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [salesCount, setSalesCount] = useState(16);
  const [revenue, setRevenue] = useState(440600);

  return (
    <div className="lp-phone-wrap">
      <div className="lp-float-card lp-fc1">
        <b>$ {revenue.toLocaleString('es-AR')}</b>
        <span>Recaudación del mes</span>
      </div>
      <div className="lp-float-card lp-fc2">
        <b>268 productos</b>
        <span>con stock bajo</span>
      </div>
      <div className="lp-phone" role="region" aria-label="Demo interactiva de Control+">
        <div className="lp-screen lp-screen-app">
          <div className="lp-app">
            {tab === 'inicio' ? (
              <>
                <div className="lp-app-card">
                  <span>RECAUDACIÓN DEL MES</span>
                  <strong>$ {revenue.toLocaleString('es-AR')}</strong>
                  <small>{salesCount} ventas este mes</small>
                </div>
                <div className="lp-app-card">
                  <span>TICKET PROMEDIO</span>
                  <strong>$ {Math.round(revenue / Math.max(salesCount, 1)).toLocaleString('es-AR')}</strong>
                  <small>Promedio del mes actual</small>
                </div>
                <div className="lp-app-card">
                  <span>PRODUCTOS</span>
                  <strong>490</strong>
                  <small>268 con stock bajo</small>
                </div>
                <div className="lp-app-chart-card">
                  <b>Ventas últimos 30 días</b>
                  <small>Tocá “Simular venta” abajo</small>
                  <button
                    type="button"
                    className="lp-demo-chip"
                    onClick={() => {
                      setSalesCount((n) => n + 1);
                      setRevenue((n) => n + 2750);
                    }}
                  >
                    Simular venta +$2.750
                  </button>
                </div>
              </>
            ) : null}

            {tab === 'ventas' ? (
              <div className="lp-app-panel">
                <b>Ventas</b>
                <p>Registrá y cobrá sin fricción.</p>
                <ul>
                  <li>Borradores pendientes: 3</li>
                  <li>Hoy: {salesCount} tickets</li>
                </ul>
                <button type="button" className="lp-demo-chip" onClick={() => setTab('inicio')}>
                  Ver dashboard
                </button>
              </div>
            ) : null}

            {tab === 'productos' ? (
              <div className="lp-app-panel">
                <b>Productos</b>
                <p>Stock sincronizado con cada venta.</p>
                <ul>
                  <li>490 ítems activos</li>
                  <li>268 con alerta de mínimo</li>
                </ul>
                <button type="button" className="lp-demo-chip" onClick={() => setTab('caja')}>
                  Ir a caja
                </button>
              </div>
            ) : null}

            {tab === 'caja' ? (
              <div className="lp-app-panel">
                <b>Caja del día</b>
                <p>Cierre con cambio para mañana.</p>
                <ul>
                  <li>Efectivo: $ 44.200</li>
                  <li>Cambio mañana: $ 24.200</li>
                </ul>
                <button type="button" className="lp-demo-chip is-ok" onClick={() => setTab('inicio')}>
                  Cierre listo ✓
                </button>
              </div>
            ) : null}

            {tab === 'mas' ? (
              <div className="lp-app-panel">
                <b>Más</b>
                <p>Estadísticas, usuarios y marca.</p>
                <ul>
                  <li>Roles admin / empleado</li>
                  <li>Reportes PDF</li>
                </ul>
                <button type="button" className="lp-demo-chip" onClick={() => setTab('inicio')}>
                  Volver al inicio
                </button>
              </div>
            ) : null}

            <div className="lp-app-dock">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? 'is-active' : undefined}
                  onClick={() => setTab(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="lp-phone-hint">Tocá los botones del mockup</p>
    </div>
  );
}
