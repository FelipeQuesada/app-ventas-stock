import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Product, Sale } from '@advance-coat/shared';
import {
  formatCurrency,
  PERIOD_PRESETS,
  createDefaultPeriod,
  getPresetRange,
  isDateInRange,
  formatPeriodLabel,
  type PeriodSelection,
  type PeriodPresetId,
} from '@advance-coat/shared';
import { getSales } from '../services/sales';
import { getProducts } from '../services/products';
import {
  getTopProducts,
  getPaymentMethodRevenueStats,
  getCategoryRevenueStats,
  getMonthlyComparison,
  getAverageTicket,
  getStockLevelStats,
} from '../services/stats';

export function StatisticsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodSelection>(createDefaultPeriod());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, p] = await Promise.all([getSales(), getProducts()]);
        if (!cancelled) {
          setSales(s);
          setProducts(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => sales.filter((s) => isDateInRange(s.date, period.range)),
    [sales, period]
  );

  const revenue = filtered.reduce((sum, s) => sum + s.total, 0);
  const topProducts = getTopProducts(filtered, 8);
  const payments = getPaymentMethodRevenueStats(filtered);
  const categories = getCategoryRevenueStats(filtered);
  const monthly = getMonthlyComparison(sales, 6);
  const stockLevels = getStockLevelStats(products);

  if (loading) return <div className="loading-screen">Cargando estadísticas…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Estadísticas</h3>
          <p>{formatPeriodLabel(period)}</p>
        </div>
      </div>

      <div className="chip-group" style={{ marginBottom: 20 }}>
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip ${period.preset === p.id ? 'active' : ''}`}
            onClick={() =>
              setPeriod({
                preset: p.id as Exclude<PeriodPresetId, 'custom'>,
                range: getPresetRange(p.id as Exclude<PeriodPresetId, 'custom'>),
              })
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Recaudación</div>
          <div className="kpi-value">{formatCurrency(revenue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ventas</div>
          <div className="kpi-value">{filtered.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-value">{formatCurrency(getAverageTicket(filtered))}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 className="card-title">Productos más vendidos</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#2563EB" name="Unidades" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Ingresos por medio de pago</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ label }) => label}
                >
                  {payments.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Comparativa mensual</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#1A1A2E" name="Recaudación" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Categorías / Stock</h3>
          <div className="stack">
            {categories.slice(0, 5).map((c) => (
              <div key={c.label} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{c.label}</span>
                <strong>{formatCurrency(c.value)}</strong>
              </div>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
            {stockLevels.map((s) => (
              <div key={s.label} className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ color: s.color }}>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
