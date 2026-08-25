import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { getSales } from '@/services/sales';
import {
  getTodayCashTotal,
  getCajaByDate,
  getCajaCambioFromPreviousDay,
  saveCaja,
  getOrCreateCajaCentral,
  withdrawFromCajaCentral,
} from '@/services/caja';
import { SALE_SELLERS } from '@/constants/sellers';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  buildSinMovimientoCaja,
  calculateCajaTotal,
  buildCajaCierreMessage,
  buildCajaRetiroMessage,
  CAJA_WHATSAPP_PHONE,
} from '@/utils/caja';
import { buildWhatsAppUrl } from '@/utils/saleTicket';
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

export default function CajaScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingRetiro, setProcessingRetiro] = useState(false);
  const [cajaCambio, setCajaCambio] = useState('');
  const [cashSales, setCashSales] = useState(0);
  const [totalGuardado, setTotalGuardado] = useState(0);
  const [centralBalance, setCentralBalance] = useState(0);
  const [montoGuardo, setMontoGuardo] = useState('');
  const [montoRetiro, setMontoRetiro] = useState('');
  const [closedByName, setClosedByName] = useState('');
  const [retiroByName, setRetiroByName] = useState('');
  const [retiroVisible, setRetiroVisible] = useState(false);
  const [sinMovimiento, setSinMovimiento] = useState(false);

  const cajaCambioAmount = parseFloat(cajaCambio) || 0;
  const cajaTotal = calculateCajaTotal(cashSales, cajaCambioAmount);
  const guardoPendiente = parseFloat(montoGuardo) || 0;
  const totalGuardadoPreview = totalGuardado + Math.max(0, guardoPendiente);
  const ganancia = cajaTotal - cajaCambioAmount;
  const cambioCierre = cajaTotal - totalGuardadoPreview;
  const canMarkNoMovement = cashSales === 0;

  const loadData = useCallback(async () => {
    try {
      const [sales, todayCaja, previousCambio] = await Promise.all([
        getSales(),
        getCajaByDate(today),
        getCajaCambioFromPreviousDay(today),
      ]);

      setCashSales(getTodayCashTotal(sales));
      setCajaCambio((todayCaja?.cajaCambio ?? previousCambio).toString());
      setTotalGuardado(todayCaja?.totalGuardado ?? 0);
      setSinMovimiento(todayCaja?.sinMovimiento === true);
      if (todayCaja?.closedByName) setClosedByName(todayCaja.closedByName);

      if (profile?.role === 'admin' && user) {
        const central = await getOrCreateCajaCentral({
          userId: user.uid,
          userName: profile.name,
        });
        setCentralBalance(central.balance);
      }
    } catch (error) {
      console.error('Error loading caja:', error);
      Alert.alert('Error', 'No se pudo cargar la información de caja');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.role, profile?.name, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const offerShareMessage = (title: string, message: string) => {
    const openWhatsApp = async () => {
      const url = buildWhatsAppUrl(CAJA_WHATSAPP_PHONE, message);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
      await Share.share({ message, title });
    };

    if (Platform.OS === 'web') {
      const sendWhatsApp = window.confirm(
        `${title}\n\n${message}\n\nAceptar: enviar por WhatsApp\nCancelar: otras opciones`
      );
      if (sendWhatsApp) {
        void openWhatsApp();
        return;
      }
      const shareOrCopy = window.confirm('¿Copiar / compartir el mensaje?');
      if (shareOrCopy) {
        void Share.share({ message, title });
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cerrar', style: 'cancel' },
      {
        text: 'Copiar / compartir',
        onPress: () => {
          void Share.share({ message, title });
        },
      },
      {
        text: 'WhatsApp',
        onPress: () => {
          void openWhatsApp();
        },
      },
    ]);
  };

  const handleRetiro = async () => {
    if (!user || !isAdmin) return;
    const amount = parseFloat(montoRetiro);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido para el retiro');
      return;
    }
    if (!retiroByName) {
      Alert.alert('Error', 'Seleccioná quién retira el dinero');
      return;
    }
    if (amount > centralBalance) {
      Alert.alert('Error', 'El retiro no puede ser mayor al saldo de caja central');
      return;
    }

    setProcessingRetiro(true);
    try {
      const central = await withdrawFromCajaCentral({
        amount,
        actorName: retiroByName,
        userId: user.uid,
        userName: profile?.name,
      });
      setCentralBalance(central.balance);
      setMontoRetiro('');
      setRetiroVisible(false);
      offerShareMessage(
        'Retiro registrado',
        buildCajaRetiroMessage({
          date: today,
          amount,
          totalGuardado: central.balance,
          actorName: retiroByName,
        })
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo registrar el retiro');
    } finally {
      setProcessingRetiro(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!closedByName) {
      Alert.alert('Error', 'Seleccioná quién cierra la caja');
      return;
    }

    const cajaCambioValue = parseFloat(cajaCambio);
    const guardoAmount = parseFloat(montoGuardo) || 0;

    if (isNaN(cajaCambioValue) || cajaCambioValue < 0) {
      Alert.alert('Error', 'Ingresá un monto válido para caja cambio');
      return;
    }
    if (guardoAmount < 0) {
      Alert.alert('Error', 'Ingresá un monto válido para guardar');
      return;
    }

    const finalTotalGuardado = totalGuardado + guardoAmount;
    if (finalTotalGuardado > cajaTotal) {
      Alert.alert('Error', 'El total guardado no puede superar la caja total');
      return;
    }

    setSaving(true);
    try {
      await saveCaja({
        date: today,
        cajaCambio: cajaCambioValue,
        cajaTotal,
        totalGuardado: finalTotalGuardado,
        depositoCentral: Math.max(0, guardoAmount),
        sinMovimiento: false,
        closedByName,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      const leftInCaja = cajaTotal - finalTotalGuardado;
      setTotalGuardado(finalTotalGuardado);
      setMontoGuardo('');
      setSinMovimiento(false);
      if (isAdmin) {
        const central = await getOrCreateCajaCentral({
          userId: user.uid,
          userName: profile?.name,
        });
        setCentralBalance(central.balance);
      }
      offerShareMessage(
        'Caja guardada',
        buildCajaCierreMessage({
          date: today,
          cajaCambio: cajaCambioValue,
          cajaTotal,
          ganancia: cajaTotal - cajaCambioValue,
          totalGuardado: finalTotalGuardado,
          cambioCierre: leftInCaja,
          closedByName,
        })
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cierre de caja');
    } finally {
      setSaving(false);
    }
  };

  const handleNoMovement = async () => {
    if (!user) return;
    if (!closedByName) {
      Alert.alert('Error', 'Seleccioná quién cierra la caja');
      return;
    }
    if (!canMarkNoMovement) {
      showAlert('No disponible', 'Hay ventas en efectivo hoy. No se puede marcar sin movimiento.');
      return;
    }

    const confirmed = await showConfirm(
      'Sin movimiento de caja',
      '¿Confirmás que hoy no hubo movimiento de caja? El cambio de apertura queda igual para mañana.',
      'Confirmar'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = buildSinMovimientoCaja(cajaCambioAmount);
      await saveCaja({
        date: today,
        ...payload,
        closedByName,
        updatedBy: user.uid,
        updatedByName: profile?.name,
      });
      setTotalGuardado(0);
      setMontoGuardo('');
      setSinMovimiento(true);
      offerShareMessage(
        'Sin movimiento registrado',
        buildCajaCierreMessage({
          date: today,
          ...payload,
          sinMovimiento: true,
          closedByName,
        })
      );
    } catch {
      showAlert('Error', 'No se pudo registrar el cierre sin movimiento');
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
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{formatDate(today)}</Text>
          <Text style={styles.subtitle}>Resumen de caja en efectivo del día</Text>
          {sinMovimiento ? (
            <Text style={styles.noMovementBadge}>Registrado: sin movimiento</Text>
          ) : null}
        </View>
        <Button
          title="Historial"
          variant="outline"
          size="sm"
          onPress={() => router.push('/caja-list')}
        />
      </View>

      {isAdmin ? (
        <Card style={styles.card}>
          <CajaRow label="Caja central" value={formatCurrency(centralBalance)} highlight accent />
          <Text style={styles.hint}>Pozo acumulado. Los retiros salen de acá y no cambian el día.</Text>
          <Button
            title="Retirar dinero"
            variant="outline"
            onPress={() => setRetiroVisible(true)}
            style={styles.withdrawButton}
          />
        </Card>
      ) : null}

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

        <CajaRow label="Ventas efectivo hoy" value={formatCurrency(cashSales)} />
        <Text style={styles.hint}>Solo ventas del día en efectivo</Text>

        <View style={styles.divider} />

        <CajaRow label="Caja total" value={formatCurrency(cajaTotal)} />
        <Text style={styles.hint}>Ventas en efectivo + caja cambio</Text>

        <View style={styles.divider} />

        <CajaRow label="Ganancia" value={formatCurrency(ganancia)} highlight accent />
        <Text style={styles.hint}>Caja total − Caja cambio (= ventas efectivo)</Text>
      </Card>

      <Card style={styles.card}>
        <CajaRow label="Transferido hoy" value={formatCurrency(totalGuardadoPreview)} highlight />
        <Text style={styles.hint}>Lo enviado a caja central en este cierre (no baja por retiros)</Text>

        <View style={styles.divider} />

        <Input
          label="Guardo (a caja central)"
          value={montoGuardo}
          onChangeText={setMontoGuardo}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Text style={styles.hint}>
          Se suma al pozo central al tocar “Guardar cierre de caja”
        </Text>

        <View style={styles.divider} />

        <CajaRow
          label="Cambio para mañana"
          value={formatCurrency(cambioCierre)}
          highlight
        />
        <Text style={styles.hint}>Caja total − Transferido hoy</Text>

        <View style={styles.divider} />

        <SelectField
          label="Quién cierra la caja"
          value={closedByName}
          options={[...SALE_SELLERS]}
          onChange={setClosedByName}
          placeholder="Seleccioná…"
        />
      </Card>

      <Button
        title="Guardar cierre de caja"
        onPress={handleSave}
        loading={saving}
        size="lg"
        style={styles.saveButton}
      />

      {canMarkNoMovement ? (
        <Button
          title="No hubo movimiento de caja"
          onPress={handleNoMovement}
          loading={saving}
          variant="outline"
          size="lg"
          style={styles.noMovementButton}
        />
      ) : null}

      <Modal
        visible={retiroVisible && isAdmin}
        transparent
        animationType="fade"
        onRequestClose={() => setRetiroVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRetiroVisible(false)}>
          <Pressable style={styles.withdrawModal} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Retirar de caja central</Text>
              <Pressable onPress={() => setRetiroVisible(false)} hitSlop={8}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.availableLabel}>Disponible en caja central</Text>
            <Text style={styles.availableAmount}>{formatCurrency(centralBalance)}</Text>

            <SelectField
              label="Quién retira"
              value={retiroByName}
              options={[...SALE_SELLERS]}
              onChange={setRetiroByName}
              placeholder="Seleccioná…"
            />

            <Input
              label="Monto a retirar"
              value={montoRetiro}
              onChangeText={setMontoRetiro}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <Text style={styles.withdrawHint}>
              Se descuenta solo del pozo central. El cierre del día no cambia.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => {
                  setMontoRetiro('');
                  setRetiroVisible(false);
                }}
                style={styles.modalAction}
              />
              <Button
                title="Confirmar retiro"
                onPress={handleRetiro}
                loading={processingRetiro}
                variant="danger"
                style={styles.modalAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  noMovementBadge: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.success,
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
  withdrawButton: {
    marginTop: spacing.sm,
    borderColor: colors.danger,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  noMovementButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  withdrawModal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  closeButton: {
    fontSize: 30,
    lineHeight: 30,
    color: colors.textSecondary,
  },
  availableLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  availableAmount: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  withdrawHint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalAction: {
    flex: 1,
  },
});
