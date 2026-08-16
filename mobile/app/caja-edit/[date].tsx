import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { LoadingScreen } from '@/components/ui/EmptyState';
import {
  deleteCaja,
  getCajaByDate,
  getCashTotalForDate,
  getCajaCambioFromPreviousDay,
  parseCajaId,
  saveCaja,
} from '@/services/caja';
import { getSales } from '@/services/sales';
import { calculateCajaTotal } from '@/utils/caja';
import { formatCurrency, formatDate } from '@/utils/format';
import { showAlert, showConfirm } from '@/utils/alert';
import { colors, spacing, typography, radius } from '@/constants/theme';

function CajaRow({
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
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={[styles.rowLabel, highlight && styles.rowLabelHighlight]}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight, accent && styles.rowValueAccent]}>
        {value}
      </Text>
    </View>
  );
}

export default function CajaEditScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const isNew = dateParam === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cajaDate, setCajaDate] = useState(new Date());
  const [cajaCambio, setCajaCambio] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [totalGuardado, setTotalGuardado] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isNew) {
          const [sales, previousCambio] = await Promise.all([
            getSales(),
            getCajaCambioFromPreviousDay(new Date()),
          ]);
          if (cancelled) return;
          setCashSales(getCashTotalForDate(sales, new Date()));
          setCajaCambio(previousCambio.toString());
          return;
        }

        const parsedDate = parseCajaId(dateParam!);
        if (!parsedDate) {
          showAlert('Error', 'Fecha de caja no válida');
          router.back();
          return;
        }

        setCajaDate(parsedDate);
        const [record, sales] = await Promise.all([getCajaByDate(parsedDate), getSales()]);
        if (cancelled) return;
        setCashSales(getCashTotalForDate(sales, parsedDate));
        if (record) {
          setCajaCambio(record.cajaCambio.toString());
          setTotalGuardado(record.totalGuardado.toString());
        }
      } catch {
        showAlert('Error', 'No se pudo cargar el registro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNew, dateParam, router]);

  const cajaCambioAmount = parseFloat(cajaCambio.replace(',', '.')) || 0;
  const cajaTotalAmount = calculateCajaTotal(cashSales, cajaCambioAmount);
  const totalGuardadoAmount = parseFloat(totalGuardado.replace(',', '.')) || 0;
  const ganancia = cajaTotalAmount - cajaCambioAmount;
  const cambioCierre = cajaTotalAmount - totalGuardadoAmount;

  const handleDateChange = async (next: Date) => {
    setCajaDate(next);
    try {
      const sales = await getSales();
      setCashSales(getCashTotalForDate(sales, next));
      if (isNew) {
        const previousCambio = await getCajaCambioFromPreviousDay(next);
        setCajaCambio(previousCambio.toString());
      }
    } catch {
      // keep current values
    }
  };

  const handleSave = async () => {
    if (isNaN(cajaCambioAmount) || cajaCambioAmount < 0) {
      showAlert('Error', 'Ingresá un monto válido para caja cambio');
      return;
    }
    if (isNaN(totalGuardadoAmount) || totalGuardadoAmount < 0) {
      showAlert('Error', 'Ingresá un monto válido para total guardado');
      return;
    }
    if (totalGuardadoAmount > cajaTotalAmount) {
      showAlert('Error', 'El total guardado no puede superar la caja total');
      return;
    }

    setSaving(true);
    try {
      await saveCaja({
        date: cajaDate,
        cajaCambio: cajaCambioAmount,
        cajaTotal: cajaTotalAmount,
        totalGuardado: totalGuardadoAmount,
        updatedBy: user!.uid,
        updatedByName: profile?.name,
      });

      showAlert(
        isNew ? 'Caja registrada' : 'Caja actualizada',
        `Cambio para mañana: ${formatCurrency(cambioCierre)}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      showAlert('Error', 'No se pudo guardar el registro de caja');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Eliminar registro',
      `¿Eliminar el cierre de caja del ${formatDate(cajaDate)}?`
    );
    if (!confirmed) return;

    try {
      await deleteCaja(cajaDate);
      showAlert('Registro eliminado', 'El cierre de caja fue eliminado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      showAlert('Error', 'No se pudo eliminar el registro');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Nuevo cierre de caja' : 'Editar caja',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DatePickerField value={cajaDate} onChange={handleDateChange} />

        <Card style={styles.card}>
          <Input
            label="Caja cambio"
            value={cajaCambio}
            onChangeText={setCajaCambio}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text style={styles.hint}>Efectivo que quedó del día anterior</Text>

          <CajaRow label="Caja total" value={formatCurrency(cajaTotalAmount)} highlight />
          <Text style={styles.hint}>
            Ventas efectivo ({formatCurrency(cashSales)}) + cambio — no editable
          </Text>

          <Input
            label="Total guardado"
            value={totalGuardado}
            onChangeText={setTotalGuardado}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text style={styles.hint}>Acumulado en caja central</Text>

          <View style={styles.divider} />

          <CajaRow label="Ganancia" value={formatCurrency(ganancia)} highlight accent />
          <Text style={styles.hint}>Caja total − Caja cambio</Text>

          <CajaRow label="Cambio para mañana" value={formatCurrency(cambioCierre)} highlight />
          <Text style={styles.hint}>Caja total − Total guardado</Text>
        </Card>

        <Button
          title={isNew ? 'Registrar cierre' : 'Guardar cambios'}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveButton}
        />

        {!isNew && (
          <Button
            title="Eliminar registro"
            onPress={handleDelete}
            variant="outline"
            size="lg"
            style={styles.deleteButton}
          />
        )}
      </ScrollView>
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
  },
  card: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowHighlight: {
    backgroundColor: colors.primary + '08',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowLabel: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  rowLabelHighlight: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  rowValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  rowValueHighlight: {
    ...typography.h2,
    color: colors.primary,
  },
  rowValueAccent: {
    color: colors.success,
  },
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
  deleteButton: {
    borderColor: colors.danger,
  },
});
