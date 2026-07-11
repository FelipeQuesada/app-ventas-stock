import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MonthPickerField } from '@/components/ui/MonthPickerField';
import {
  ChartCard,
  StatsBarChart,
  StatsLineChart,
  StatsPieChart,
  StatsDonutChart,
  StatsHorizontalBarChart,
  StatsRankList,
} from '@/components/ui/ChartCard';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getSales, getMonthSales } from '@/services/sales';
import { getProducts } from '@/services/products';
import { exportMonthSalesToExcel } from '@/services/export';
import {
  CHART_COLORS,
  getDailyRevenueInMonth,
  getMonthlyComparison,
  getTopProducts,
  getProductRevenueChart,
  getPaymentMethodStats,
  getPaymentMethodRevenueStats,
  getCategoryStats,
  getCategoryRevenueStats,
  getStockByCategory,
  getStockLevelStats,
  getLowStockRanking,
  getMonthlyRevenue,
  getAnnualRevenue,
  getTotalCustomers,
  getAverageTicket,
} from '@/services/stats';
import { Product, Sale } from '@/types';
import { formatCurrency } from '@/utils/format';
import { showAlert } from '@/utils/alert';
import { colors, spacing, typography, radius } from '@/constants/theme';

type StatCategory = 'general' | 'ventas' | 'stock' | 'productos' | 'categorias' | 'pagos';

const CATEGORIES: {
  id: StatCategory;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { id: 'general', label: 'General', icon: 'insights' },
  { id: 'ventas', label: 'Ventas', icon: 'shopping-cart' },
  { id: 'stock', label: 'Stock', icon: 'inventory' },
  { id: 'productos', label: 'Productos', icon: 'inventory-2' },
  { id: 'categorias', label: 'Categorías', icon: 'category' },
  { id: 'pagos', label: 'Medios de pago', icon: 'payments' },
];

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </Card>
  );
}

export default function StatisticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<StatCategory>('general');
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [salesData, productsData] = await Promise.all([getSales(), getProducts()]);
      setSales(salesData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const monthSales = useMemo(
    () => getMonthSales(sales, selectedMonth),
    [sales, selectedMonth]
  );

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: es });

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportMonthSalesToExcel(sales, selectedMonth);
      showAlert('Listo', `El Excel de ${monthLabel} se descargó correctamente`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const monthRevenue = getMonthlyRevenue(sales, selectedMonth);
  const yearRevenue = getAnnualRevenue(sales);
  const monthCustomers = getTotalCustomers(monthSales);
  const monthAvgTicket = getAverageTicket(monthSales);
  const monthComparison = getMonthlyComparison(sales, 6);
  const categoryStats = getCategoryStats(monthSales);
  const categoryRevenue = getCategoryRevenueStats(monthSales);
  const paymentStats = getPaymentMethodStats(monthSales);
  const paymentRevenue = getPaymentMethodRevenueStats(monthSales);
  const stockByCategory = getStockByCategory(products);
  const stockLevels = getStockLevelStats(products);
  const lowStockProducts = getLowStockRanking(products);

  const showMonthPicker = activeCategory !== 'stock';

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'general':
        return (
          <>
            <View style={styles.summaryRow}>
              <SummaryCard label="Recaudación del mes" value={formatCurrency(monthRevenue)} />
              <SummaryCard label="Recaudación anual" value={formatCurrency(yearRevenue)} />
            </View>
            <View style={styles.summaryRow}>
              <SummaryCard label="Clientes del mes" value={monthCustomers} />
              <SummaryCard label="Ticket promedio" value={formatCurrency(monthAvgTicket)} />
            </View>
            <ChartCard title="Tendencia de recaudación (6 meses)">
              <StatsLineChart
                data={monthComparison.map((m) => ({ label: m.label.slice(0, 6), value: m.revenue }))}
                color={colors.primary}
              />
            </ChartCard>
            <ChartCard title="Comparativa mensual">
              <StatsRankList
                items={monthComparison.map((m, i) => ({
                  label: m.label,
                  value: m.revenue,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                formatValue={formatCurrency}
              />
            </ChartCard>
          </>
        );

      case 'ventas':
        return (
          <>
            <ChartCard title={`Recaudación diaria — ${monthLabel}`}>
              <StatsLineChart
                data={getDailyRevenueInMonth(sales, selectedMonth).map((d) => ({
                  label: d.label,
                  value: d.value,
                }))}
                color={colors.success}
              />
            </ChartCard>
            <ChartCard title="Cantidad de ventas por mes">
              <StatsBarChart
                data={monthComparison.map((m) => ({ label: m.label.slice(0, 6), value: m.salesCount }))}
                color={colors.accent}
              />
            </ChartCard>
            <ChartCard title="Clientes atendidos por mes">
              <StatsHorizontalBarChart
                data={monthComparison.map((m) => ({ label: m.label, value: m.customers }))}
                color={colors.primary}
              />
            </ChartCard>
          </>
        );

      case 'stock':
        return (
          <>
            <ChartCard title="Estado del inventario">
              <StatsDonutChart data={stockLevels} />
            </ChartCard>
            <ChartCard title="Unidades por categoría">
              <StatsHorizontalBarChart
                data={stockByCategory.map((c) => ({ label: c.label, value: c.stock }))}
                color={colors.warning}
              />
            </ChartCard>
            <ChartCard title="Productos con bajo stock">
              <StatsRankList
                items={lowStockProducts.map((p) => ({
                  label: p.name,
                  value: p.quantity,
                  color: p.quantity === 0 ? colors.danger : colors.warning,
                }))}
                formatValue={(value) => `${value} u.`}
              />
            </ChartCard>
          </>
        );

      case 'productos':
        return (
          <>
            <ChartCard title="Más vendidos (unidades)">
              <StatsHorizontalBarChart
                data={getTopProducts(monthSales, 6).map((p) => ({
                  label: p.name.slice(0, 18),
                  value: p.quantity,
                }))}
                color={colors.accent}
              />
            </ChartCard>
            <ChartCard title="Ranking por ingresos">
              <StatsRankList
                items={getProductRevenueChart(monthSales, 6).map((p, i) => ({
                  label: p.name,
                  value: p.revenue,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                formatValue={formatCurrency}
              />
            </ChartCard>
            <ChartCard title="Menos vendidos">
              <StatsBarChart
                data={getTopProducts(monthSales, 5, true).map((p) => ({
                  label: p.name.slice(0, 12),
                  value: p.quantity,
                }))}
                color={colors.warning}
              />
            </ChartCard>
          </>
        );

      case 'categorias':
        return (
          <>
            <ChartCard title="Unidades vendidas por categoría">
              <StatsPieChart
                data={categoryStats.map((c, i) => ({
                  label: c.label,
                  value: c.value,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
              />
            </ChartCard>
            <ChartCard title="Ingresos por categoría">
              <StatsHorizontalBarChart
                data={categoryRevenue.map((c) => ({ label: c.label, value: c.value }))}
                color={colors.success}
              />
            </ChartCard>
            <ChartCard title="Top categorías">
              <StatsRankList
                items={categoryRevenue.map((c, i) => ({
                  label: c.label,
                  value: c.value,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                formatValue={formatCurrency}
              />
            </ChartCard>
          </>
        );

      case 'pagos':
        return (
          <>
            <ChartCard title="Uso por cantidad de ventas">
              <StatsDonutChart data={paymentStats} />
            </ChartCard>
            <ChartCard title="Ingresos por medio de pago">
              <StatsRankList
                items={paymentRevenue.map((p, i) => ({
                  label: p.label,
                  value: p.value,
                  color: p.color ?? CHART_COLORS[i % CHART_COLORS.length],
                }))}
                formatValue={formatCurrency}
              />
            </ChartCard>
            <ChartCard title="Distribución de ingresos">
              <StatsBarChart
                data={paymentRevenue.map((p) => ({
                  label: p.label.slice(0, 10),
                  value: p.value,
                }))}
                color={colors.primary}
              />
            </ChartCard>
          </>
        );

      default:
        return null;
    }
  };

  return (
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabs}
      >
        {CATEGORIES.map((category) => {
          const active = activeCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryTab, active && styles.categoryTabActive]}
              onPress={() => setActiveCategory(category.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={category.icon}
                size={18}
                color={active ? colors.white : colors.primary}
              />
              <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showMonthPicker && (
        <Card style={styles.filterCard}>
          <MonthPickerField value={selectedMonth} onChange={setSelectedMonth} label="Mes a analizar" />
        </Card>
      )}

      {activeCategory === 'general' && (
        <Card style={styles.exportCard}>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Exportar a Excel</Text>
            <Text style={styles.exportSubtitle}>
              Incluye resumen, ventas, productos y medios de pago de {monthLabel}
            </Text>
          </View>
          <Button
            title="Descargar Excel"
            onPress={handleExport}
            loading={exporting}
            variant="secondary"
            size="sm"
          />
        </Card>
      )}

      <View style={styles.sectionContent}>{renderCategoryContent()}</View>
    </ScrollView>
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
  },
  categoryTabs: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  categoryTabTextActive: {
    color: colors.white,
  },
  filterCard: {
    marginBottom: spacing.sm,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  exportInfo: {
    flex: 1,
    gap: spacing.xs,
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
    textTransform: 'capitalize',
  },
  sectionContent: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
});
