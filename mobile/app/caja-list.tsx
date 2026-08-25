import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SearchBar } from '@/components/ui/SearchBar';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { CajaListItem } from '@/components/ui/CajaListItem';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { deleteCaja, getCajaHistory } from '@/services/caja';
import { exportCajaRecordsToExcel, buildCajaPdfHtml } from '@/services/export';
import { DailyCaja } from '@/types/caja';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  createDefaultPeriod,
  formatPeriodLabel,
  isDateInRange,
  PeriodSelection,
} from '@/utils/datePeriod';
import { showAlert, showConfirm } from '@/utils/alert';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function CajaListScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<DailyCaja[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<PeriodSelection>(() => createDefaultPeriod());
  const [selected, setSelected] = useState<DailyCaja | null>(null);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getCajaHistory();
      setRecords(data);
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudo cargar el historial de caja');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const periodRecords = useMemo(
    () => records.filter((record) => isDateInRange(record.date, period.range)),
    [records, period]
  );

  const periodLabel = formatPeriodLabel(period);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return periodRecords;

    return periodRecords.filter((record) => {
      const dateText = formatDate(record.date).toLowerCase();
      const amounts = [
        formatCurrency(record.cajaTotal),
        formatCurrency(record.ganancia),
        formatCurrency(record.totalGuardado),
        formatCurrency(record.cajaCambio),
        formatCurrency(record.cambioCierre),
      ]
        .join(' ')
        .toLowerCase();

      return dateText.includes(term) || amounts.includes(term) || record.id.includes(term);
    });
  }, [periodRecords, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCajaRecordsToExcel(filtered, periodLabel);
      showAlert('Listo', `El Excel de caja de ${periodLabel} se descargó correctamente`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) {
      showAlert('Error', 'No hay cierres de caja en este período para exportar');
      return;
    }
    const title = `Caja ${periodLabel}`;
    setPdfPreview({
      html: buildCajaPdfHtml(filtered, title),
      title,
    });
  };

  const handleDelete = async (record: DailyCaja) => {
    const confirmed = await showConfirm(
      'Eliminar registro',
      `¿Eliminar el cierre de caja del ${formatDate(record.date)}?`
    );
    if (!confirmed) return;

    try {
      await deleteCaja(record.date);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (selected?.id === record.id) setSelected(null);
      showAlert('Registro eliminado', 'El cierre de caja fue eliminado');
    } catch {
      showAlert('Error', 'No se pudo eliminar el registro');
    }
  };

  if (loading) return <LoadingScreen />;

  const listHeader = (
    <View style={styles.headerSection}>
      <PeriodFilter value={period} onChange={setPeriod} />

      <Card style={styles.exportCard}>
        <Text style={styles.exportTitle}>Exportar caja</Text>
        <Text style={styles.exportSubtitle}>
          Excel o PDF de {periodLabel} con resumen y cierres diarios
        </Text>
        <View style={styles.exportActions}>
          <Button
            title="Excel"
            onPress={handleExport}
            loading={exporting}
            variant="secondary"
            size="sm"
          />
          <Button title="PDF" onPress={handleExportPdf} variant="outline" size="sm" />
        </View>
      </Card>

      <Text style={styles.listTitle}>
        Cierres de {periodLabel} ({filtered.length})
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por fecha o monto..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <CajaListItem
            caja={item}
            onPress={() => setSelected(item)}
            onEdit={() => router.push(`/caja-edit/${item.id}`)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          periodRecords.length === 0 ? (
            <EmptyState
              icon="point-of-sale"
              title="No hay registros de caja"
              subtitle="Tocá + para agregar un cierre"
            />
          ) : (
            <EmptyState
              icon="search-off"
              title="Sin resultados"
              subtitle="No hay cierres que coincidan con la búsqueda"
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/caja-edit/new')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle de caja</Text>
                  <Pressable onPress={() => setSelected(null)}>
                    <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <DetailRow label="Fecha" value={formatDate(selected.date)} />
                  {selected.sinMovimiento ? (
                    <DetailRow label="Estado" value="Sin movimiento" accent />
                  ) : null}
                  <DetailRow label="Caja cambio" value={formatCurrency(selected.cajaCambio)} />
                  <DetailRow label="Caja total" value={formatCurrency(selected.cajaTotal)} highlight />
                  <DetailRow label="Ganancia" value={formatCurrency(selected.ganancia)} accent />
                  <DetailRow label="Total guardado" value={formatCurrency(selected.totalGuardado)} />
                  <DetailRow label="Cambio para mañana" value={formatCurrency(selected.cambioCierre)} />
                  {selected.closedByName ? (
                    <DetailRow label="Cerró" value={selected.closedByName} />
                  ) : null}
                  {selected.updatedByName ? (
                    <DetailRow label="Actualizado por" value={selected.updatedByName} />
                  ) : null}
                </ScrollView>

                <View style={styles.modalActions}>
                  <Button
                    title="Editar"
                    onPress={() => {
                      const id = selected.id;
                      setSelected(null);
                      router.push(`/caja-edit/${id}`);
                    }}
                    style={styles.editAction}
                  />
                  <Button
                    title="Eliminar"
                    variant="outline"
                    onPress={() => handleDelete(selected)}
                    style={styles.deleteAction}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <PdfPreviewModal
        visible={!!pdfPreview}
        html={pdfPreview?.html ?? null}
        title={pdfPreview?.title}
        onClose={() => setPdfPreview(null)}
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          highlight && styles.detailHighlight,
          accent && styles.detailAccent,
        ]}
      >
        {value}
      </Text>
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
  exportCard: {
    gap: spacing.sm,
  },
  exportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    textTransform: 'capitalize',
  },
  listTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    maxHeight: 360,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  detailHighlight: {
    color: colors.primary,
  },
  detailAccent: {
    color: colors.success,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editAction: {
    flex: 1,
  },
  deleteAction: {
    flex: 1,
    borderColor: colors.danger,
  },
});
