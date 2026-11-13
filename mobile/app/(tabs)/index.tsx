import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { StatCard } from '@/components/ui/StatCard';
import { QuickAction } from '@/components/QuickAction';
import { ChartCard, StatsLineChart } from '@/components/ui/ChartCard';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getSales, getTodaySales, getMonthSales } from '@/services/sales';
import { getDailySalesChart, getAverageTicket } from '@/services/stats';
import { syncPendingSales, getPendingSalesCount } from '@/services/offlineQueue';
import { formatCurrency, capitalize } from '@/utils/format';
import { showAlert } from '@/utils/alert';
import { colors, spacing, typography } from '@/constants/theme';

export default function DashboardScreen() {
  const { profile } = useAuth();
  const { limits } = useBrand();
  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const sales = await getSales();
      const today = getTodaySales(sales);
      const month = getMonthSales(sales);
      setTodaySales(today.length);
      setTodayRevenue(today.reduce((sum, s) => sum + s.total, 0));
      setMonthRevenue(month.reduce((sum, s) => sum + s.total, 0));
      setAvgTicket(getAverageTicket(month));
      setTotalSales(sales.length);
      setChartData(getDailySalesChart(sales, 30).map((d) => ({ label: d.label, value: d.value })));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showAlert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      getPendingSalesCount().then(setPendingCount).catch(() => undefined);
      syncPendingSales()
        .then(({ synced }) => {
          if (synced > 0) {
            showAlert('Sincronizado', `Se enviaron ${synced} venta(s) pendientes`);
            getPendingSalesCount().then(setPendingCount).catch(() => undefined);
            loadData();
          }
        })
        .catch(() => undefined);
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <LoadingScreen />;

  const greeting = capitalize(
    new Date().getHours() < 12
      ? 'buenos días'
      : new Date().getHours() < 19
        ? 'buenas tardes'
        : 'buenas noches'
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
        {new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </Text>

      {pendingCount > 0 ? (
        <Text style={styles.pendingHint}>
          {pendingCount} venta(s) pendiente(s) de sincronizar
        </Text>
      ) : null}

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
        </View>
        {isAdmin ? (
          <View style={styles.statsTopRow}>
            <StatCard
              title="Ticket promedio"
              value={formatCurrency(avgTicket)}
              icon="receipt"
              iconColor={colors.primary}
              subtitle="Mes actual"
            />
            <StatCard
              title="Total ventas"
              value={totalSales}
              icon="receipt-long"
              iconColor={colors.primary}
            />
          </View>
        ) : null}
      </View>

      {isAdmin && limits.statistics ? (
        <ChartCard title="Ventas últimos 30 días">
          <StatsLineChart data={chartData} color={colors.accent} />
        </ChartCard>
      ) : null}

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.quickActions}>
        <QuickAction title="Nueva venta" icon="add-shopping-cart" href="/(tabs)/sales" />
        <QuickAction title="Caja" icon="point-of-sale" href="/(tabs)/caja" />
        <QuickAction title="Productos" icon="inventory-2" href="/(tabs)/products" />
        <QuickAction title="Stock" icon="warehouse" href="/stock" />
        <QuickAction title="Clientes" icon="people" href="/customers" />
        <QuickAction title="Hist. ventas" icon="receipt-long" href="/sales-list" />
        {limits.presupuestos ? (
          <QuickAction title="Presupuesto" icon="description" href="/presupuesto" />
        ) : null}
        {isAdmin && limits.statistics ? (
          <QuickAction title="Estadísticas" icon="bar-chart" href="/(tabs)/statistics" />
        ) : null}
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
    paddingBottom: 120,
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
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  pendingHint: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.warning,
    marginBottom: spacing.md,
  },
  statsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
