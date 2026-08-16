import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Package,
  ShoppingCart,
  Users,
  Wallet,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import {
  formatCurrency,
  getLowStockProducts,
} from '@advance-coat/shared';
import { getSales, getTodaySales } from '../services/sales';
import { getProducts } from '../services/products';
import {
  getDailySalesChart,
  getMonthlyRevenue,
  getAverageTicket,
} from '../services/stats';
import type { Sale, Product } from '@advance-coat/shared';

export function DashboardPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, p] = await Promise.all([getSales(), getProducts()]);
        if (!cancelled) {
          setSales(s);
          setProducts(p);
          if (getLowStockProducts(p).length > 0) {
            setShowLowStock(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="loading-screen">Cargando dashboard…</div>;

  const today = getTodaySales(sales);
  const todayTotal = today.reduce((sum, s) => sum + s.total, 0);
  const monthRevenue = getMonthlyRevenue(sales);
  const avgTicket = getAverageTicket(today.length ? today : sales.slice(0, 50));
  const lowStock = getLowStockProducts(products);
  const chartData = getDailySalesChart(sales, 30);

  return (
    <div>
      {showLowStock && lowStock.length > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={20} color="#B45309" />
          <div style={{ flex: 1 }}>
            <strong>Alerta de stock bajo</strong>
            <p className="muted" style={{ margin: '4px 0 10px' }}>
              Hay {lowStock.length} producto{lowStock.length === 1 ? '' : 's'} con poco stock.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowLowStock(false);
                  if (window.confirm('¿Querés ir a la pantalla de stock?')) {
                    navigate('/stock');
                  }
                }}
              >
                Ver stock
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowLowStock(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Ventas de hoy</div>
          <div className="kpi-value">{formatCurrency(todayTotal)}</div>
          <div className="kpi-hint">{today.length} operaciones</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Mes actual</div>
          <div className="kpi-value">{formatCurrency(monthRevenue)}</div>
          <div className="kpi-hint">Recaudación del mes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-value">{formatCurrency(avgTicket)}</div>
          <div className="kpi-hint">Basado en ventas recientes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Productos</div>
          <div className="kpi-value">{products.length}</div>
          <div className="kpi-hint">{lowStock.length} con stock bajo</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 className="card-title">Ventas últimos 30 días</h3>
          <p className="card-subtitle">Recaudación diaria</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#1A1A2E' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  fill="url(#rev)"
                  strokeWidth={2}
                  name="Recaudación"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Accesos rápidos</h3>
          <p className="card-subtitle">Atajos frecuentes</p>
          <div className="quick-links">
            <Link to="/sales" className="quick-link">
              <div className="icon-box"><ShoppingCart size={18} /></div>
              <span>Nueva venta</span>
            </Link>
            <Link to="/products" className="quick-link">
              <div className="icon-box"><Package size={18} /></div>
              <span>Productos</span>
            </Link>
            <Link to="/customers" className="quick-link">
              <div className="icon-box"><Users size={18} /></div>
              <span>Clientes</span>
            </Link>
            <Link to="/caja" className="quick-link">
              <div className="icon-box"><Wallet size={18} /></div>
              <span>Caja</span>
            </Link>
            <Link to="/statistics" className="quick-link">
              <div className="icon-box"><BarChart3 size={18} /></div>
              <span>Estadísticas</span>
            </Link>
            <Link to="/stock" className="quick-link">
              <div className="icon-box"><Package size={18} /></div>
              <span>Stock</span>
            </Link>
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card hide-below-desktop">
          <h3 className="card-title">Productos con poco stock</h3>
          <p className="card-subtitle">Menos de 10 unidades</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
