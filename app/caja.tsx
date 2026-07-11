import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getSales } from '@/services/sales';
import {
  getTodayCashTotal,
  getCajaByDate,
  getCajaCambioFromPreviousDay,
  saveCaja,
  updateTotalGuardado,
} from '@/services/caja';
import { formatCurrency, formatDate } from '@/utils/format';
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

export default function CajaScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingGuardo, setProcessingGuardo] = useState(false);
  const [processingRetiro, setProcessingRetiro] = useState(false);
  const [cajaCambio, setCajaCambio] = useState('');
  const [cajaTotal, setCajaTotal] = useState(0);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [montoGuardo, setMontoGuardo] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');

  const cajaCambioAmount = parseFloat(cajaCambio) || 0;
  const ganancia = cajaTotal - cajaCambioAmount;
  const cambioCierre = cajaTotal - totalGuardado;

  const loadData = useCallback(async () => {
    try {
      const [sales, todayCaja, previousCambio] = await Promise.all([
        getSales(),
        getCajaByDate(today),
        getCajaCambioFromPreviousDay(today),
      ]);

      const cashTotal = getTodayCashTotal(sales);
      setCajaTotal(cashTotal);
      setCajaCambio((todayCaja?.cajaCambio ?? previousCambio).toString());
      setTotalGuardado(todayCaja?.totalGuardado ?? 0);
    } catch (error) {
      console.error('Error loading caja:', error);
      Alert.alert('Error', 'No se pudo cargar la información de caja');
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

  const persistTotalGuardado = async (newTotal: number) => {
    await updateTotalGuardado(
      today,
      newTotal,
      parseFloat(cajaCambio) || 0,
      cajaTotal,
      user!.uid,
      profile?.name
    );
    setTotalGuardado(newTotal);
  };

  const handleAgregarGuardado = async () => {
    const amount = parseFloat(montoGuardo);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido para guardar');
      return;
    }
    if (amount + totalGuardado > cajaTotal) {
      Alert.alert('Error', 'No podés guardar más de lo disponible en caja total');
      return;
    }

    setProcessingGuardo(true);
    try {
      const newTotal = totalGuardado + amount;
      await persistTotalGuardado(newTotal);
      setMontoGuardo('');
      Alert.alert('Guardado', `Se agregaron ${formatCurrency(amount)} a caja central`);
    } catch {
      Alert.alert('Error', 'No se pudo registrar el guardado');
    } finally {
      setProcessingGuardo(false);
    }
  };

  const handleRetiro = async () => {
    const amount = parseFloat(montoRetiro);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido para el retiro');
      return;
    }
    if (amount > totalGuardado) {
      Alert.alert('Error', 'El retiro no puede ser mayor al total guardado');
      return;
    }

    setProcessingRetiro(true);
    try {
      const newTotal = totalGuardado - amount;
      await persistTotalGuardado(newTotal);
      setMontoRetiro('');
      Alert.alert('Retiro registrado', `Se descontaron ${formatCurrency(amount)} del total guardado`);
    } catch {
      Alert.alert('Error', 'No se pudo registrar el retiro');
    } finally {
      setProcessingRetiro(false);
    }
  };

  const handleSave = async () => {
    const cajaCambioAmount = parseFloat(cajaCambio);

    if (isNaN(cajaCambioAmount) || cajaCambioAmount < 0) {
      Alert.alert('Error', 'Ingresá un monto válido para caja cambio');
      return;
    }
    if (totalGuardado > cajaTotal) {
      Alert.alert('Error', 'El total guardado no puede superar la caja total');
      return;
    }

    setSaving(true);
    try {
      await saveCaja({
        date: today,
        cajaCambio: cajaCambioAmount,
        cajaTotal,
        totalGuardado,
        updatedBy: user!.uid,
        updatedByName: profile?.name,
      });
      Alert.alert(
        'Caja guardada',
        `Cambio para mañana: ${formatCurrency(cajaTotal - totalGuardado)}`
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cierre de caja');
    } finally {
      setSaving(false);
    }
  };

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
            loadData();
          }}
        />
      }
    >
      <BackButton />
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{formatDate(today)}</Text>
          <Text style={styles.subtitle}>Resumen de caja en efectivo del día</Text>
        </View>
        <Button
          title="Historial"
          variant="outline"
          size="sm"
          onPress={() => router.push('/caja-list')}
        />
      </View>

      <Card style={styles.card}>
        <Input
          label="Caja cambio"
          value={cajaCambio}
          onChangeText={setCajaCambio}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Text style={styles.hint}>Lo que quedó en caja del día anterior (podés modificarlo)</Text>

        <View style={styles.divider} />

        <CajaRow label="Caja total" value={formatCurrency(cajaTotal)} />
        <Text style={styles.hint}>Total ingresado en efectivo hoy</Text>

        <View style={styles.divider} />

        <CajaRow label="Ganancia" value={formatCurrency(ganancia)} highlight accent />
        <Text style={styles.hint}>Caja total − Caja cambio</Text>
      </Card>

      <Card style={styles.card}>
        <CajaRow label="Total guardado" value={formatCurrency(totalGuardado)} highlight />
        <Text style={styles.hint}>Acumulado en caja central (guardados − retiros)</Text>

        <View style={styles.divider} />

        <Input
          label="Guardo (caja central)"
          value={montoGuardo}
          onChangeText={setMontoGuardo}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Button
          title="Agregar a caja central"
          onPress={handleAgregarGuardado}
          loading={processingGuardo}
          size="sm"
          style={styles.actionButton}
        />

        <View style={styles.divider} />

        <Input
          label="Retiro de caja"
          value={montoRetiro}
          onChangeText={setMontoRetiro}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Text style={styles.hint}>Se descuenta del total guardado</Text>
        <Button
          title="Registrar retiro"
          onPress={handleRetiro}
          loading={processingRetiro}
          variant="outline"
          size="sm"
          style={styles.actionButton}
        />

        <View style={styles.divider} />

        <CajaRow
          label="Cambio para mañana"
          value={formatCurrency(cambioCierre)}
          highlight
        />
        <Text style={styles.hint}>Caja total − Total guardado</Text>
      </Card>

      <Button
        title="Guardar cierre de caja"
        onPress={handleSave}
        loading={saving}
        size="lg"
        style={styles.saveButton}
      />
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
  date: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    textTransform: 'capitalize',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  card: {
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
  actionButton: {
    marginBottom: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
