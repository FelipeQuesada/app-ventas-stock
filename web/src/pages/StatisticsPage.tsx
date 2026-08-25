import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  createDefaultPeriod,
  isDateInRange,
  formatPeriodLabel,
  type PeriodSelection,
} from '@advance-coat/shared';
import { getSales } from '../services/sales';
import { getProducts } from '../services/products';
import { PeriodFilter } from '../components/PeriodFilter';
import { useAuth } from '../context/AuthContext';
import {
  getTopProducts,
  getPaymentMethodRevenueStats,
  getCategoryRevenueStats,
  getMonthlyComparison,
  getAverageTicket,
  getStockLevelStats,
  getTotalUnitsSold,
  getSellerRevenueStats,
  getTotalCustomers,
  truncateLabel,
} from '../services/stats';

function RankRow({
  rank,
  label,
  primary,
  secondary,
  percent,
  color = 'var(--accent)',
}: {
  rank: number;
  label: string;
  primary: string;
  secondary?: string;
  percent: number;
  color?: string;
}) {
  return (
    <div className="stats-rank-row">
      <span className="stats-rank-index">{rank}</span>
      <div className="stats-rank-body">
        <div className="stats-rank-top">
          <span className="stats-rank-label" title={label}>
            {label}
          </span>
          <strong className="stats-rank-value">{primary}</strong>
        </div>
        {secondary ? <div className="stats-rank-secondary">{secondary}</div> : null}
        <div className="stats-rank-track">
          <div
            className="stats-rank-fill"
            style={{ width: `${Math.max(4, Math.min(100, percent))}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

export function StatisticsPage() {
  const { profile } = useAuth();
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
    () => sales.filter((sale) => isDateInRange(sale.date, period.range)),
    [sales, period]
  );

  const revenue = useMemo(
    () => filtered.reduce((sum, s) => sum + s.total, 0),
    [filtered]
  );
  const unitsSold = useMemo(() => getTotalUnitsSold(filtered), [filtered]);
  const customers = useMemo(() => getTotalCustomers(filtered), [filtered]);
  const avgTicket = useMemo(() => getAverageTicket(filtered), [filtered]);
  const topProducts = useMemo(() => getTopProducts(filtered, 8), [filtered]);
  const topByRevenue = useMemo(() => {
    return [...getTopProducts(filtered, 100)].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filtered]);
  const payments = useMemo(() => getPaymentMethodRevenueStats(filtered), [filtered]);
  const categories = useMemo(() => getCategoryRevenueStats(filtered), [filtered]);
  const sellers = useMemo(() => getSellerRevenueStats(filtered), [filtered]);
  const monthly = useMemo(() => getMonthlyComparison(sales, 6), [sales]);
  const stockLevels = useMemo(() => getStockLevelStats(products), [products]);

  const maxProductQty = topProducts[0]?.quantity ?? 1;
  const maxProductRevenue = topByRevenue[0]?.revenue ?? 1;
  const paymentTotal = payments.reduce((sum, p) => sum + p.value, 0) || 1;
  const maxCategory = categories[0]?.value ?? 1;
  const maxSeller = sellers[0]?.value ?? 1;
  const dominantPayment = payments[0];

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div className="loading-screen">Cargando estadísticas…</div>;

  return (
    <div className="stats-page">
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Estadísticas</h3>
          <p>{formatPeriodLabel(period)}</p>
        </div>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Recaudación</div>
          <div className="kpi-value">{formatCurrency(revenue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ventas</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-hint">{unitsSold} unidades</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket promedio</div>
          <div className="kpi-value">{formatCurrency(avgTicket)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Clientes</div>
          <div className="kpi-value">{customers}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Medio dominante</div>
          <div className="kpi-value kpi-value-sm">
            {dominantPayment ? dominantPayment.label : '—'}
          </div>
          {dominantPayment ? (
            <div className="kpi-hint">
              {Math.round((dominantPayment.value / paymentTotal) * 100)}% ·{' '}
              {formatCurrency(dominantPayment.value)}
            </div>
          ) : null}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top producto</div>
          <div className="kpi-value kpi-value-sm" title={topProducts[0]?.name}>
            {topProducts[0] ? truncateLabel(topProducts[0].name, 22) : '—'}
          </div>
          {topProducts[0] ? (
            <div className="kpi-hint">
              {topProducts[0].quantity} u. · {formatCurrency(topProducts[0].revenue)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <h3 className="card-title">Productos más vendidos</h3>
          <p className="card-subtitle">Por unidades en el período</p>
          {topProducts.length === 0 ? (
            <p className="muted">Sin ventas en este período.</p>
          ) : (
            <div className="stats-rank-list">
              {topProducts.map((item, index) => (
                <RankRow
                  key={`${item.name}-${index}`}
                  rank={index + 1}
                  label={item.name}
                  primary={`${item.quantity} u.`}
                  secondary={formatCurrency(item.revenue)}
                  percent={(item.quantity / maxProductQty) * 100}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Ingresos por medio de pago</h3>
          <p className="card-subtitle">Participación del período</p>
          {payments.length === 0 ? (
            <p className="muted">Sin datos de pago.</p>
          ) : (
            <div className="stats-payment-layout">
              <div className="stats-donut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={payments}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {payments.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="stats-rank-list">
                {payments.map((item, index) => {
                  const pct = Math.round((item.value / paymentTotal) * 100);
                  return (
                    <RankRow
                      key={item.label}
                      rank={index + 1}
                      label={item.label}
                      primary={formatCurrency(item.value)}
                      secondary={`${pct}% del total`}
                      percent={pct}
                      color={item.color}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Mayor recaudación por producto</h3>
          <p className="card-subtitle">Top por $ (no solo unidades)</p>
          {topByRevenue.length === 0 ? (
            <p className="muted">Sin ventas en este período.</p>
          ) : (
            <div className="stats-rank-list">
              {topByRevenue.map((item, index) => (
                <RankRow
                  key={`rev-${item.name}-${index}`}
                  rank={index + 1}
                  label={item.name}
                  primary={formatCurrency(item.revenue)}
                  secondary={`${item.quantity} unidades`}
                  percent={(item.revenue / maxProductRevenue) * 100}
                  color="#1A1A2E"
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Ventas por vendedor</h3>
          <p className="card-subtitle">Quién cerró más $ en el período</p>
          {sellers.length === 0 ? (
            <p className="muted">Sin datos de vendedor.</p>
          ) : (
            <div className="stats-rank-list">
              {sellers.map((item, index) => (
                <RankRow
                  key={item.label}
                  rank={index + 1}
                  label={item.label}
                  primary={formatCurrency(item.value)}
                  secondary={`${Math.round((item.value / maxSeller) * 100)}% vs líder`}
                  percent={(item.value / maxSeller) * 100}
                  color="#6366F1"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid stats-grid-bottom">
        <div className="card">
          <h3 className="card-title">Comparativa mensual</h3>
          <p className="card-subtitle">Últimos 6 meses (todas las ventas)</p>
          <div className="stats-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="revenue" fill="#1A1A2E" name="Recaudación" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Categorías</h3>
          <p className="card-subtitle">Ingresos del período</p>
          {categories.length === 0 ? (
            <p className="muted">Sin categorías.</p>
          ) : (
            <div className="stats-rank-list">
              {categories.slice(0, 8).map((item, index) => (
                <RankRow
                  key={item.label}
                  rank={index + 1}
                  label={item.label}
                  primary={formatCurrency(item.value)}
                  percent={(item.value / maxCategory) * 100}
                  color="#10B981"
                />
              ))}
            </div>
          )}
          <hr className="stats-divider" />
          <h4 className="stats-section-title">Estado de stock</h4>
          <div className="stats-stock-row">
            {stockLevels.map((s) => (
              <div key={s.label} className="stats-stock-chip" style={{ borderColor: s.color }}>
                <span style={{ color: s.color }}>{s.value}</span>
                <small>{s.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
