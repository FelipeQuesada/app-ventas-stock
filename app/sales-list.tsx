import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, startOfMonth, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SearchBar } from '@/components/ui/SearchBar';
import { MonthPickerField } from '@/components/ui/MonthPickerField';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SaleListItem } from '@/components/ui/SaleListItem';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { deleteSale, getSales, getMonthSales } from '@/services/sales';
import { exportDaySalesToExcel, exportMonthSalesToExcel, exportDaySalesReportText } from '@/services/export';
import { Sale, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { PAYMENT_METHODS, getPaymentMethodLabel } from '@/constants/payments';
import { useAuth } from '@/context/AuthContext';
import { showAlert, showConfirm } from '@/utils/alert';
import { SaleTicketModal } from '@/components/SaleTicketModal';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function SalesListScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [filterDay, setFilterDay] = useState<Date | null>(null);
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | 'all'>('all');
  const [filterSeller, setFilterSeller] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [ticketSale, setTicketSale] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [loadSales])
  );

  const monthSales = useMemo(
    () => getMonthSales(sales, selectedMonth),
    [sales, selectedMonth]
  );

  const sellers = useMemo(() => {
    const names = new Set<string>();
    for (const sale of monthSales) {
      if (sale.createdByName?.trim()) names.add(sale.createdByName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [monthSales]);

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: es });

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return monthSales.filter((sale) => {
      if (filterDay) {
        if (!isSameDay(sale.date, filterDay)) return false;
      }
      if (filterPayment !== 'all' && sale.paymentMethod !== filterPayment) return false;
      if (filterSeller !== 'all' && (sale.createdByName ?? '') !== filterSeller) return false;

      if (!term) return true;

      const customerText = [
        sale.customer.name,
        sale.customer.email,
        sale.customer.phone,
      ]
        .join(' ')
        .toLowerCase();
      const itemsText = sale.items.map((item) => item.productName).join(' ').toLowerCase();
      const payment = getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel).toLowerCase();
      const seller = (sale.createdByName ?? '').toLowerCase();

      return (
        customerText.includes(term) ||
        itemsText.includes(term) ||
        payment.includes(term) ||
        seller.includes(term) ||
        formatCurrency(sale.total).toLowerCase().includes(term)
      );
    });
  }, [monthSales, search, filterDay, filterPayment, filterSeller]);

  const handleExportMonth = async () => {
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

  const handleExportDay = async () => {
    const day = filterDay ?? new Date();
    setExporting(true);
    try {
      await exportDaySalesToExcel(sales, day);
      showAlert('Listo', `Excel del ${format(day, 'dd/MM/yyyy')} listo`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportDayText = async () => {
    const day = filterDay ?? new Date();
    setExporting(true);
    try {
      await exportDaySalesReportText(sales, day);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (sale: Sale) => {
    const confirmed = await showConfirm(
      'Eliminar venta',
      `¿Eliminar la venta del ${formatDate(sale.date)} por ${formatCurrency(sale.total)}?`
    );
    if (!confirmed) return;

    try {
      await deleteSale(sale.id, {
        userId: user?.uid ?? 'unknown',
        userName: profile?.name,
      });
      setSales((current) => current.filter((item) => item.id !== sale.id));
      if (selectedSale?.id === sale.id) setSelectedSale(null);
      showAlert('Venta eliminada', 'Se restauró el stock de los productos');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo eliminar la venta';
      showAlert('Error', message);
    }
  };

  const clearFilters = () => {
    setFilterDay(null);
    setFilterPayment('all');
    setFilterSeller('all');
    setSearch('');
  };

  const listHeader = (
    <View style={styles.headerSection}>
      <View style={styles.monthRow}>
        <MonthPickerField value={selectedMonth} onChange={setSelectedMonth} />
      </View>

      <Card style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filtros</Text>
        <Text style={styles.filterLabel}>Filtrar por día</Text>
        <DatePickerField
          value={filterDay ?? startOfDay(new Date())}
          onChange={(d) => setFilterDay(startOfDay(d))}
        />
        {filterDay && (
          <Button title="Quitar filtro de día" onPress={() => setFilterDay(null)} variant="outline" size="sm" />
        )}

        <Text style={styles.filterLabel}>Medio de pago</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable
            style={[styles.chip, filterPayment === 'all' && styles.chipActive]}
            onPress={() => setFilterPayment('all')}
          >
            <Text style={[styles.chipText, filterPayment === 'all' && styles.chipTextActive]}>Todos</Text>
          </Pressable>
          {PAYMENT_METHODS.map((pm) => (
            <Pressable
              key={pm.value}
              style={[styles.chip, filterPayment === pm.value && styles.chipActive]}
              onPress={() => setFilterPayment(pm.value)}
            >
              <Text style={[styles.chipText, filterPayment === pm.value && styles.chipTextActive]}>
                {pm.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {sellers.length > 0 && (
          <>
            <Text style={styles.filterLabel}>Vendedor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable
                style={[styles.chip, filterSeller === 'all' && styles.chipActive]}
                onPress={() => setFilterSeller('all')}
              >
                <Text style={[styles.chipText, filterSeller === 'all' && styles.chipTextActive]}>Todos</Text>
              </Pressable>
              {sellers.map((seller) => (
                <Pressable
                  key={seller}
                  style={[styles.chip, filterSeller === seller && styles.chipActive]}
                  onPress={() => setFilterSeller(seller)}
                >
                  <Text style={[styles.chipText, filterSeller === seller && styles.chipTextActive]}>
                    {seller}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Button title="Limpiar filtros" onPress={clearFilters} variant="outline" size="sm" />
      </Card>

      <Card style={styles.exportCard}>
        <View style={styles.exportInfo}>
          <Text style={styles.exportTitle}>Exportar</Text>
          <Text style={styles.exportSubtitle}>
            Excel del mes, del día o reporte compartible
          </Text>
        </View>
        <View style={styles.exportActions}>
          <Button title="Mes" onPress={handleExportMonth} loading={exporting} variant="secondary" size="sm" />
          <Button title="Día" onPress={handleExportDay} loading={exporting} size="sm" />
          <Button title="PDF/Txt" onPress={handleExportDayText} loading={exporting} variant="outline" size="sm" />
        </View>
      </Card>

      <Text style={styles.listTitle}>
        Ventas ({filtered.length})
      </Text>
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente, producto, vendedor..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <SaleListItem
            sale={item}
            onPress={() => setSelectedSale(item)}
            onEdit={() => router.push(`/sale/${item.id}`)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-long"
            title="Sin resultados"
            subtitle="No hay ventas con estos filtros"
          />
        }
      />

      <Modal visible={!!selectedSale} transparent animationType="fade" onRequestClose={() => setSelectedSale(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedSale(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            {selectedSale && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle de venta</Text>
                  <Pressable onPress={() => setSelectedSale(null)}>
                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailLabel}>Fecha</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedSale.date)}</Text>

                  <Text style={styles.detailLabel}>Cliente</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale.customer.name || 'Sin nombre'}
                  </Text>
                  {!!selectedSale.customer.email && (
                    <Text style={styles.detailMuted}>{selectedSale.customer.email}</Text>
                  )}
                  {!!selectedSale.customer.phone && (
                    <Text style={styles.detailMuted}>{selectedSale.customer.phone}</Text>
                  )}

                  <Text style={styles.detailLabel}>Forma de pago</Text>
                  <Text style={styles.detailValue}>
                    {getPaymentMethodLabel(selectedSale.paymentMethod, selectedSale.paymentMethodLabel)}
                  </Text>

                  <Text style={styles.sectionTitle}>Productos</Text>
                  {selectedSale.items.map((item, index) => (
                    <View key={`${item.productId}-${index}`} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.productName}</Text>
                        <Text style={styles.itemMeta}>
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                  ))}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(selectedSale.subtotal)}</Text>
                  </View>
                  {(selectedSale.discountAmount ?? 0) > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Descuento</Text>
                      <Text style={[styles.summaryValue, styles.discount]}>
                        -{formatCurrency(selectedSale.discountAmount ?? 0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{formatCurrency(selectedSale.total)}</Text>
                  </View>

                  {selectedSale.createdByName ? (
                    <>
                      <Text style={styles.detailLabel}>Registrada por</Text>
                      <Text style={styles.detailValue}>{selectedSale.createdByName}</Text>
                    </>
                  ) : null}
                </ScrollView>

                <View style={styles.modalActions}>
                  <Button
                    title="Ticket"
                    onPress={() => {
                      setTicketSale(selectedSale);
                      setSelectedSale(null);
                    }}
                    variant="secondary"
                    style={styles.editAction}
                  />
                  <Button
                    title="Editar"
                    onPress={() => {
                      const id = selectedSale.id;
                      setSelectedSale(null);
                      router.push(`/sale/${id}`);
                    }}
                    style={styles.editAction}
                  />
                  <Button
                    title="Eliminar"
                    variant="outline"
                    onPress={() => handleDelete(selectedSale)}
                    style={styles.deleteAction}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <SaleTicketModal
        visible={!!ticketSale}
        sale={ticketSale}
        title="Ticket de venta"
        onClose={() => setTicketSale(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerSection: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
  },
  filtersCard: {
    gap: spacing.sm,
  },
  filtersTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  filterLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chips: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  exportCard: {
    gap: spacing.sm,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exportSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  listTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '85%',
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  modalContent: {
    maxHeight: 420,
  },
  detailLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    marginTop: 2,
  },
  detailMuted: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  itemMeta: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  discount: {
    color: colors.success,
  },
  totalLabel: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  totalValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  deleteAction: {
    flex: 1,
    borderColor: colors.danger,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editAction: {
    flex: 1,
  },
});
