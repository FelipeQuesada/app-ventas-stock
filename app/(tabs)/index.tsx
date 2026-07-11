import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { QuickAction } from '@/components/QuickAction';
import { ChartCard, StatsLineChart } from '@/components/ui/ChartCard';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getProducts } from '@/services/products';
import { getSales } from '@/services/sales';
import {
  getDailySalesChart,
  getLowStockProducts,
  getMonthlyRevenue,
} from '@/services/stats';
import { getTodaySales } from '@/services/sales';
import { formatCurrency, capitalize } from '@/utils/format';
import { colors, spacing, typography } from '@/constants/theme';

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [products, sales] = await Promise.all([getProducts(), getSales()]);
      const today = getTodaySales(sales);
      setTodaySales(today.length);
      setTodayRevenue(today.reduce((sum, s) => sum + s.total, 0));
      setMonthRevenue(getMonthlyRevenue(sales));
      setLowStockCount(getLowStockProducts(products).length);
      setTotalSales(sales.length);
      setChartData(getDailySalesChart(sales, 30).map((d) => ({ label: d.label, value: d.value })));
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <LoadingScreen />;

  const greeting = capitalize(
    new Date().getHours() < 12 ? 'buenos días' : new Date().getHours() < 19 ? 'buenas tardes' : 'buenas noches'
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>
        {greeting}, {profile?.name?.split(' ')[0] ?? 'Usuario'}
      </Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsTopRow}>
          <StatCard
            title="Ventas del día"
            value={todaySales}
            icon="shopping-cart"
            iconColor={colors.accent}
            subtitle={formatCurrency(todayRevenue)}
          />
          <StatCard
            title="Recaudación del mes"
            value={formatCurrency(monthRevenue)}
            icon="attach-money"
            iconColor={colors.success}
          />
          <StatCard
            title="Bajo stock"
            value={lowStockCount}
            icon="warning"
            iconColor={colors.warning}
            subtitle="productos"
          />
        </View>
        <StatCard
          title="Total ventas"
          value={totalSales}
          icon="receipt-long"
          iconColor={colors.primary}
          style={styles.statFullWidth}
        />
      </View>

      <ChartCard title="Ventas últimos 30 días">
        <StatsLineChart data={chartData} color={colors.accent} />
      </ChartCard>

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.quickActions}>
        <QuickAction title="Caja" icon="point-of-sale" href="/caja" color={colors.primary} />
        <QuickAction title="Historial caja" icon="history" href="/caja-list" color={colors.primary} />
        <QuickAction title="Nueva venta" icon="add-shopping-cart" href="/(tabs)/sales" color={colors.accent} />
        <QuickAction title="Historial ventas" icon="receipt-long" href="/sales-list" color={colors.primary} />
        <QuickAction title="Clientes" icon="people" href="/customers" />
        <QuickAction title="Productos" icon="inventory-2" href="/(tabs)/products" />
        <QuickAction title="Stock" icon="warehouse" href="/stock" color={colors.warning} />
        <QuickAction title="Estadísticas" icon="bar-chart" href="/(tabs)/statistics" color={colors.success} />
      </View>
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
  greeting: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  date: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textTransform: 'capitalize',
  },
  statsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statFullWidth: {
    flex: undefined,
    width: '100%',
    minWidth: '100%',
  },
  sectionTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
