import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FLEX_ALL_LOCALITIES,
  FLEX_ZONE_IDS,
  FLEX_ZONE_LABELS,
  FLEX_ZONE_PRICES,
  buildFlexMonthRows,
  calcFlexLineTotal,
  findZoneForLocality,
  getFlexLocalityStats,
  getFlexZoneStats,
  summarizeFlexMonth,
  type FlexShipment,
  type FlexZoneId,
} from '@advance-coat/shared';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { MonthPickerField } from '@/components/ui/MonthPickerField';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { addFlexShipment, deleteFlexShipment, getFlexShipmentsByMonth } from '@/services/flex';
import { exportFlexMonthToExcel } from '@/services/export';
import { ImportFlexLabelsModal } from '@/components/ImportFlexLabelsModal';
import { formatCurrency } from '@/utils/format';
import { colors, spacing, typography } from '@/constants/theme';

export default function FlexScreen() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [shipments, setShipments] = useState<FlexShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [entryDate, setEntryDate] = useState(() => new Date());
  const [locality, setLocality] = useState('CABA');
  const [quantity, setQuantity] = useState('1');

  const zone: FlexZoneId | null = findZoneForLocality(locality);
  const unitPrice = zone ? FLEX_ZONE_PRICES[zone] : 0;
  const previewTotal = zone ? calcFlexLineTotal(zone, Math.max(1, Number(quantity) || 0)) : 0;

  const load = useCallback(async () => {
    try {
      setShipments(await getFlexShipmentsByMonth(month));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const rows = useMemo(() => buildFlexMonthRows(month, shipments), [month, shipments]);
  const summary = useMemo(() => summarizeFlexMonth(rows), [rows]);
  const localityStats = useMemo(() => getFlexLocalityStats(shipments, 10), [shipments]);
  const zoneStats = useMemo(() => getFlexZoneStats(shipments), [shipments]);
  const recent = [...shipments].reverse().slice(0, 15);

  async function handleAdd() {
    if (!user) return;
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      Alert.alert('Error', 'Ingresá una cantidad válida');
      return;
    }
    if (!locality.trim() || !zone) {
      Alert.alert('Error', 'Seleccioná un lugar válido');
      return;
    }
    setSaving(true);
    try {
      await addFlexShipment({
        date: entryDate,
        zone,
        locality,
        quantity: qty,
        createdBy: user.uid,
        createdByName: profile?.name,
      });
      setQuantity('1');
      const entryMonth = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
      if (
        entryMonth.getFullYear() !== month.getFullYear() ||
        entryMonth.getMonth() !== month.getMonth()
      ) {
        setMonth(entryMonth);
      } else {
        await load();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este registro Flex?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteFlexShipment(id);
              await load();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
            }
          })();
        },
      },
    ]);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportFlexMonthToExcel(month, shipments);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  function handleImported(info: { rows: number; packages: number; firstDate: Date | null }) {
    if (info.firstDate) {
      const nextMonth = new Date(info.firstDate.getFullYear(), info.firstDate.getMonth(), 1);
      if (
        nextMonth.getFullYear() !== month.getFullYear() ||
        nextMonth.getMonth() !== month.getMonth()
      ) {
        setMonth(nextMonth);
        return;
      }
    }
    void load();
  }

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.title}>Flex</Text>
      <Text style={styles.subtitle}>Paquetes por zona · {format(month, 'MMMM yyyy', { locale: es })}</Text>

      <MonthPickerField label="Mes" value={month} onChange={setMonth} />

      <Button
        title={exporting ? 'Exportando…' : 'Exportar Excel mensual'}
        onPress={() => void handleExport()}
        disabled={exporting}
        style={styles.exportBtn}
      />
      <Button
        title="Importar PDF de etiquetas"
        variant="outline"
        onPress={() => setImportOpen(true)}
        style={styles.exportBtn}
      />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Cargar envío</Text>
        <Text style={styles.cardHint}>Elegí el lugar; la zona y el precio se asignan solos</Text>
        <DatePickerField value={entryDate} onChange={setEntryDate} />
        <SelectField
          label="Lugar"
          value={locality}
          onChange={setLocality}
          options={[...FLEX_ALL_LOCALITIES]}
        />
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneInfoLabel}>Zona automática</Text>
          <Text style={styles.zoneInfoValue}>
            {zone
              ? `${FLEX_ZONE_LABELS[zone]} — ${formatCurrency(unitPrice)}`
              : 'Seleccioná un lugar'}
          </Text>
        </View>
        <Input
          label="Cantidad"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
        <Text style={styles.preview}>Subtotal: {formatCurrency(previewTotal)}</Text>
        <Button
          title={saving ? 'Guardando…' : 'Agregar'}
          onPress={() => void handleAdd()}
          disabled={saving || !zone}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Resumen del mes</Text>
        {FLEX_ZONE_IDS.map((id) => (
          <View key={id} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{FLEX_ZONE_LABELS[id]}</Text>
            <Text style={styles.summaryValue}>
              {summary.counts[id]} · {formatCurrency(summary.counts[id] * FLEX_ZONE_PRICES[id])}
            </Text>
          </View>
        ))}
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryLabelBold}>Total pedidos</Text>
          <Text style={styles.summaryValueBold}>{summary.totalPedidos}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelBold}>Total facturado</Text>
          <Text style={styles.summaryValueBold}>{formatCurrency(summary.totalRecaudado)}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Zonas top</Text>
        {zoneStats.map((z) => (
          <View key={z.zone} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{z.zoneLabel}</Text>
            <Text style={styles.summaryValue}>
              {z.quantity} · {formatCurrency(z.revenue)}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Localidades top</Text>
        {localityStats.length === 0 ? (
          <Text style={styles.empty}>Sin datos este mes</Text>
        ) : (
          localityStats.map((s) => (
            <View key={`${s.zone}-${s.locality}`} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {s.locality} ({s.zoneLabel})
              </Text>
              <Text style={styles.summaryValue}>
                {s.quantity} · {formatCurrency(s.revenue)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Últimos registros</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay envíos este mes</Text>
        ) : (
          recent.map((s) => (
            <Pressable key={s.id} onLongPress={() => void handleDelete(s.id)} style={styles.recentRow}>
              <Text style={styles.recentText}>
                {format(s.date, 'dd/MM')} · {FLEX_ZONE_LABELS[s.zone]} · {s.locality} ×{s.quantity}
              </Text>
              <Text style={styles.recentAmount}>{formatCurrency(s.total)}</Text>
            </Pressable>
          ))
        )}
        <Text style={styles.hint}>Mantené pulsado un registro para eliminarlo</Text>
      </Card>

      {user ? (
        <ImportFlexLabelsModal
          visible={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
          referenceYear={month.getFullYear()}
          createdBy={user.uid}
          createdByName={profile?.name}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: { ...typography.h2, fontFamily: 'Inter_700Bold', color: colors.text },
  subtitle: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  exportBtn: { marginBottom: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  zoneInfo: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  zoneInfoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  zoneInfoValue: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  preview: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryTotal: { marginTop: spacing.xs },
  summaryLabel: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  summaryValue: { ...typography.bodySmall, color: colors.text, fontFamily: 'Inter_500Medium' },
  summaryLabelBold: { ...typography.body, fontFamily: 'Inter_600SemiBold', color: colors.text },
  summaryValueBold: { ...typography.body, fontFamily: 'Inter_700Bold', color: colors.primary },
  empty: { ...typography.bodySmall, color: colors.textMuted },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentText: { ...typography.bodySmall, color: colors.text, flex: 1 },
  recentAmount: { ...typography.bodySmall, fontFamily: 'Inter_600SemiBold', color: colors.primary },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
