import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import {
  ChartCard,
  StatsAreaChart,
  StatsBarChart,
  StatsDonutChart,
  StatsHorizontalBarChart,
  StatsLineChart,
  StatsMultiBarChart,
  StatsPieChart,
  StatsRankList,
  CHART_PALETTE,
} from '@/components/ui/ChartCard';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getSales } from '@/services/sales';
import { getProducts } from '@/services/products';
import {
  exportSalesInRangeToExcel,
  buildSalesPdfHtml,
} from '@/services/export';
import {
  getMonthlyComparison,
  getTopProducts,
  getPaymentMethodRevenueStats,
  getCategoryRevenueStats,
  getStockLevelStats,
  getTotalCustomers,
  getAverageTicket,
  getTotalUnitsSold,
  getSellerRevenueStats,
  truncateLabel,
  getDailyRevenueInRange,
  getCategoryStats,
  getStockByCategory,
} from '@/services/stats';
import { Product, Sale } from '@/types';
import { formatCurrency } from '@/utils/format';
import {
  createDefaultPeriod,
  formatPeriodLabel,
  isDateInRange,
  type PeriodSelection,
} from '@/utils/datePeriod';
import {
  computeResinAccounting,
  buildResinAccountingCatalogMap,
  RESIN_UNIT_LABELS,
  type ResinUnitKey,
} from '@advance-coat/shared';
import { showAlert } from '@/utils/alert';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import { colors, spacing, typography, radius } from '@/constants/theme';

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={2}>
        {value}
      </Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </Card>
  );
}

export default function StatisticsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<PeriodSelection>(createDefaultPeriod());
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);

  const loadData = useCallback(async () => {
    try {
      const [salesData, productsData] = await Promise.all([getSales(), getProducts()]);
      setSales(salesData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }
      loadData();
    }, [loadData, profile?.role, router])
  );

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
  const topByRevenue = useMemo(
    () => [...getTopProducts(filtered, 100)].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    [filtered]
  );
  const payments = useMemo(() => getPaymentMethodRevenueStats(filtered), [filtered]);
  const categories = useMemo(() => getCategoryRevenueStats(filtered), [filtered]);
  const sellers = useMemo(() => getSellerRevenueStats(filtered), [filtered]);
  const monthly = useMemo(() => getMonthlyComparison(sales, 6), [sales]);
  const dailyTrend = useMemo(
    () => getDailyRevenueInRange(filtered, period.range.start, period.range.end),
    [filtered, period]
  );
  const categoryUnits = useMemo(() => getCategoryStats(filtered), [filtered]);
  const stockByCategory = useMemo(() => getStockByCategory(products), [products]);
  const stockLevels = useMemo(() => getStockLevelStats(products), [products]);
  const resinTotals = useMemo(
    () =>
      computeResinAccounting(filtered, {
        catalogPrices: buildResinAccountingCatalogMap(products),
      }),
    [filtered, products]
  );

  const resinUnitKeys: ResinUnitKey[] = [
    '150g',
    '300g',
    '750g',
    '1.5kg',
    '3kg',
    'catalizador',
    'dr',
    'bel',
  ];

  const maxProductQty = topProducts[0]?.quantity ?? 1;
  const maxProductRevenue = topByRevenue[0]?.revenue ?? 1;
  const paymentTotal = payments.reduce((sum, p) => sum + p.value, 0) || 1;
  const maxCategory = categories[0]?.value ?? 1;
  const maxSeller = sellers[0]?.value ?? 1;
  const dominantPayment = payments[0];
  const periodLabel = formatPeriodLabel(period);
  const resinOptions = useMemo(
    () => ({ catalogPrices: buildResinAccountingCatalogMap(products) }),
    [products]
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportSalesInRangeToExcel(
        filtered,
        period.range.start,
        period.range.end,
        periodLabel,
        resinOptions
      );
      showAlert('Listo', `El informe Excel de ${periodLabel} se descargó correctamente`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) {
      showAlert('Error', 'No hay ventas en este período para exportar');
      return;
    }
    setPdfPreview({
      html: buildSalesPdfHtml(filtered, 'Informe de ventas', periodLabel, resinOptions),
      title: `Informe ${periodLabel}`,
    });
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <Text style={styles.headerSubtitle}>{periodLabel}</Text>
        </View>

        <PeriodFilter value={period} onChange={setPeriod} />

        <View style={styles.kpiGrid}>
          <KpiCard label="Recaudación" value={formatCurrency(revenue)} />
          <KpiCard
            label="Ventas"
            value={filtered.length}
            hint={`${unitsSold} unidades`}
          />
          <KpiCard label="Ticket promedio" value={formatCurrency(avgTicket)} />
          <KpiCard label="Clientes" value={customers} />
          <KpiCard
            label="Medio dominante"
            value={dominantPayment ? dominantPayment.label : '—'}
            hint={
              dominantPayment
                ? `${Math.round((dominantPayment.value / paymentTotal) * 100)}% · ${formatCurrency(dominantPayment.value)}`
                : undefined
            }
          />
          <KpiCard
            label="Top producto"
            value={topProducts[0] ? truncateLabel(topProducts[0].name, 18) : '—'}
            hint={
              topProducts[0]
                ? `${topProducts[0].quantity} u. · ${formatCurrency(topProducts[0].revenue)}`
                : undefined
            }
          />
        </View>

        <Card style={styles.exportCard}>
          <Text style={styles.exportTitle}>Exportar informe</Text>
          <Text style={styles.exportSubtitle}>Excel o PDF del período seleccionado</Text>
          <View style={styles.exportActions}>
            <Button
              title="Excel"
              onPress={handleExportExcel}
              loading={exporting}
              variant="secondary"
              size="sm"
            />
            <Button title="PDF" onPress={handleExportPdf} variant="outline" size="sm" />
          </View>
        </Card>

        <ChartCard
          title="Tendencia diaria"
          subtitle="Recaudación día a día en el período"
          scrollable
        >
          {dailyTrend.some((d) => d.value > 0) ? (
            <StatsAreaChart data={dailyTrend} color="#2563EB" />
          ) : (
            <Text style={styles.empty}>Sin ventas en este período.</Text>
          )}
        </ChartCard>

        <ChartCard title="Productos más vendidos" subtitle="Por unidades en el período">
          {topProducts.length === 0 ? (
            <Text style={styles.empty}>Sin ventas en este período.</Text>
          ) : (
            <View style={styles.chartStack}>
              <StatsHorizontalBarChart
                data={topProducts.slice(0, 6).map((p) => ({
                  label: truncateLabel(p.name, 14),
                  value: p.quantity,
                }))}
                multiColor
                formatValue={(v) => `${v} u.`}
              />
              <View style={styles.divider} />
              <StatsRankList
                items={topProducts.map((item) => ({
                  label: item.name,
                  value: item.quantity,
                  secondary: formatCurrency(item.revenue),
                }))}
                formatValue={(value) => `${value} u.`}
                maxValue={maxProductQty}
              />
            </View>
          )}
        </ChartCard>

        <ChartCard title="Ingresos por medio de pago" subtitle="Participación del período">
          {payments.length === 0 ? (
            <Text style={styles.empty}>Sin datos de pago.</Text>
          ) : (
            <View style={styles.paymentLayout}>
              <StatsDonutChart data={payments} />
              <StatsRankList
                items={payments.map((item) => ({
                  label: item.label,
                  value: item.value,
                  color: item.color,
                  secondary: `${Math.round((item.value / paymentTotal) * 100)}% del total`,
                }))}
                formatValue={formatCurrency}
              />
            </View>
          )}
        </ChartCard>

        <ChartCard title="Mayor recaudación por producto" subtitle="Top por $ (no solo unidades)">
          {topByRevenue.length === 0 ? (
            <Text style={styles.empty}>Sin ventas en este período.</Text>
          ) : (
            <View style={styles.chartStack}>
              <StatsMultiBarChart
                data={topByRevenue.slice(0, 6).map((p) => ({
                  label: truncateLabel(p.name, 10),
                  value: p.revenue,
                }))}
              />
              <View style={styles.divider} />
              <StatsRankList
                items={topByRevenue.map((item) => ({
                  label: item.name,
                  value: item.revenue,
                  secondary: `${item.quantity} unidades`,
                  color: colors.primary,
                }))}
                formatValue={formatCurrency}
                maxValue={maxProductRevenue}
              />
            </View>
          )}
        </ChartCard>

        <ChartCard title="Ventas por vendedor" subtitle="Quién cerró más $ en el período">
          {sellers.length === 0 ? (
            <Text style={styles.empty}>Sin datos de vendedor.</Text>
          ) : (
            <View style={styles.chartStack}>
              <StatsBarChart
                data={sellers.map((s) => ({
                  label: truncateLabel(s.label, 8),
                  value: s.value,
                }))}
                color="#6366F1"
              />
              <View style={styles.divider} />
              <StatsRankList
                items={sellers.map((item) => ({
                  label: item.label,
                  value: item.value,
                  secondary: `${Math.round((item.value / maxSeller) * 100)}% vs líder`,
                  color: '#6366F1',
                }))}
                formatValue={formatCurrency}
                maxValue={maxSeller}
              />
            </View>
          )}
        </ChartCard>

        <Card style={styles.resinCard}>
          <Text style={styles.sectionTitle}>Contabilización resina</Text>
          <Text style={styles.sectionSubtitle}>
            Unidades y plata del período · Grupo resina vs extras (DR, BEL y resto)
          </Text>

          <Text style={styles.resinBlockTitle}>Unidades vendidas</Text>
          <StatsBarChart
            data={resinUnitKeys.map((key) => ({
              label: RESIN_UNIT_LABELS[key],
              value: resinTotals.units[key],
            }))}
            color={colors.primary}
          />

          <View style={styles.resinMoney}>
            <View style={styles.resinMoneyRow}>
              <Text style={styles.resinMoneyLabel}>Recibido resina (incl. catalizadores)</Text>
              <Text style={styles.resinMoneyValue}>{formatCurrency(resinTotals.resinMoney)}</Text>
            </View>
            <View style={styles.resinMoneyRow}>
              <Text style={styles.resinMoneyLabel}>Plata de extras (DR, BEL y resto)</Text>
              <Text style={styles.resinMoneyValue}>{formatCurrency(resinTotals.extrasMoney)}</Text>
            </View>
            <View style={[styles.resinMoneyRow, styles.resinMoneyTotal]}>
              <Text style={styles.resinMoneyTotalLabel}>Total contabilizado</Text>
              <Text style={styles.resinMoneyTotalValue}>
                {formatCurrency(resinTotals.resinMoney + resinTotals.extrasMoney)}
              </Text>
            </View>
          </View>
        </Card>

        <ChartCard title="Comparativa mensual" subtitle="Últimos 6 meses (todas las ventas)" scrollable>
          <View style={styles.chartStack}>
            <StatsBarChart
              data={monthly.map((m) => ({
                label: m.label.slice(0, 6),
                value: m.revenue,
              }))}
              color={colors.primary}
            />
            <View style={styles.divider} />
            <Text style={styles.miniChartTitle}>Tendencia en línea</Text>
            <StatsLineChart
              data={monthly.map((m) => ({
                label: m.label.slice(0, 6),
                value: m.revenue,
              }))}
              color="#10B981"
            />
          </View>
        </ChartCard>

        <ChartCard title="Categorías" subtitle="Ingresos y unidades del período">
          {categories.length === 0 ? (
            <Text style={styles.empty}>Sin categorías.</Text>
          ) : (
            <View style={styles.chartStack}>
              <StatsPieChart
                data={categories.slice(0, 6).map((c, i) => ({
                  label: c.label,
                  value: c.value,
                  color: CHART_PALETTE[i % CHART_PALETTE.length],
                }))}
              />
              <View style={styles.divider} />
              <Text style={styles.miniChartTitle}>Unidades por categoría</Text>
              <StatsHorizontalBarChart
                data={categoryUnits.slice(0, 6).map((c, i) => ({
                  label: truncateLabel(c.label, 14),
                  value: c.value,
                }))}
                color={colors.success}
                multiColor
                formatValue={(v) => `${v} u.`}
              />
              <View style={styles.divider} />
              <StatsRankList
                items={categories.slice(0, 8).map((item) => ({
                  label: item.label,
                  value: item.value,
                  color: colors.success,
                }))}
                formatValue={formatCurrency}
                maxValue={maxCategory}
              />
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.resinBlockTitle}>Estado de stock</Text>
          {stockLevels.length > 0 ? (
            <StatsDonutChart data={stockLevels} />
          ) : null}
          <View style={styles.stockRow}>
            {stockLevels.map((s) => (
              <View key={s.label} style={[styles.stockChip, { borderColor: s.color }]}>
                <Text style={[styles.stockChipValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.stockChipLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          {stockByCategory.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.miniChartTitle}>Stock por categoría</Text>
              <StatsHorizontalBarChart
                data={stockByCategory.slice(0, 6).map((c) => ({
                  label: truncateLabel(c.label, 14),
                  value: c.stock,
                }))}
                color={colors.warning}
                formatValue={(v) => `${v} u.`}
              />
            </>
          ) : null}
        </ChartCard>
      </ScrollView>

      <PdfPreviewModal
        visible={!!pdfPreview}
        html={pdfPreview?.html ?? null}
        title={pdfPreview?.title}
        onClose={() => setPdfPreview(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 150,
    gap: spacing.xs,
  },
  kpiLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  kpiValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  kpiHint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  exportCard: {
    gap: spacing.sm,
  },
  exportTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  exportSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentLayout: {
    gap: spacing.md,
  },
  chartStack: {
    gap: spacing.sm,
    width: '100%',
  },
  miniChartTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  empty: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  resinCard: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  resinBlockTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  resinUnitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  resinUnitChip: {
    width: '22%',
    minWidth: 72,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    gap: 4,
  },
  resinUnitValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  resinUnitLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resinMoney: {
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resinMoneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resinMoneyLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
  },
  resinMoneyValue: {
    ...typography.bodySmall,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  resinMoneyTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  resinMoneyTotalLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    flex: 1,
  },
  resinMoneyTotalValue: {
    ...typography.body,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  stockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stockChip: {
    flex: 1,
    minWidth: 100,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
  },
  stockChipValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
  },
  stockChipLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
