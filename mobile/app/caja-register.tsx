import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO, isValid, subDays } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { LoadingScreen } from '@/components/ui/EmptyState';
import {
  getCashTotalForDate,
  getOrCreateCajaCentral,
  registerMissingCajaDay,
} from '@/services/caja';
import { getSales } from '@/services/sales';
import { SALE_SELLERS } from '@/constants/sellers';
import { calculateCajaTotal, calculateCajaGanancia, calculateCambioCierre } from '@/utils/caja';
import { formatCurrency, formatDate } from '@/utils/format';
import { showAlert, showConfirm } from '@/utils/alert';
import { colors, spacing, typography, radius } from '@/constants/theme';

export default function CajaRegisterScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const initialDate = useMemo(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed)) return parsed;
    }
    return subDays(new Date(), 1);
  }, [dateParam]);

  const isPaulaBackfill = format(initialDate, 'yyyy-MM-dd') === '2026-09-17';

  const [cajaDate, setCajaDate] = useState(initialDate);
  const [cajaCambio, setCajaCambio] = useState(isPaulaBackfill ? '27700' : '0');
  const [cajaTotalStr, setCajaTotalStr] = useState(isPaulaBackfill ? '67700' : '');
  const [totalGuardado, setTotalGuardado] = useState(isPaulaBackfill ? '40000' : '0');
  const [closedByName, setClosedByName] = useState(isPaulaBackfill ? 'Paula' : '');
  const [retiroAmount, setRetiroAmount] = useState(isPaulaBackfill ? '40000' : '');
  const [retiroByName, setRetiroByName] = useState(isPaulaBackfill ? 'Paula' : '');
  const [cashSales, setCashSales] = useState(0);
  const [centralBalance, setCentralBalance] = useState<number | null>(null);
  const [totalManual, setTotalManual] = useState(isPaulaBackfill);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sales = await getSales();
        if (cancelled) return;
        const cash = getCashTotalForDate(sales, cajaDate);
        setCashSales(cash);
        if (!totalManual) {
          const cambio = parseFloat(cajaCambio.replace(',', '.')) || 0;
          setCajaTotalStr(String(calculateCajaTotal(cash, cambio)));
        }
        if (user) {
          const central = await getOrCreateCajaCentral({
            userId: user.uid,
            userName: profile?.name,
          });
          if (!cancelled) setCentralBalance(central.balance);
        }
      } catch {
        showAlert('Error', 'No se pudo cargar los datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.uid]);

  const cambioNum = parseFloat(cajaCambio.replace(',', '.')) || 0;
  const guardadoNum = parseFloat(totalGuardado.replace(',', '.')) || 0;
  const retiroNum = parseFloat(retiroAmount.replace(',', '.')) || 0;
  const cajaTotal = parseFloat(cajaTotalStr.replace(',', '.')) || 0;
  const suggestedTotal = calculateCajaTotal(cashSales, cambioNum);
  const ganancia = calculateCajaGanancia(cajaTotal, cambioNum);
  const cambioCierre = calculateCambioCierre(cajaTotal, guardadoNum);

  const handleDateChange = async (next: Date) => {
    setCajaDate(next);
    try {
      const sales = await getSales();
      const cash = getCashTotalForDate(sales, next);
      setCashSales(cash);
      if (!totalManual) {
        setCajaTotalStr(String(calculateCajaTotal(cash, cambioNum)));
      }
    } catch {
      // keep values
    }
  };

  const handleCambioChange = (value: string) => {
    setCajaCambio(value);
    if (!totalManual) {
      const cambio = parseFloat(value.replace(',', '.')) || 0;
      setCajaTotalStr(String(calculateCajaTotal(cashSales, cambio)));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!closedByName) {
      showAlert('Error', 'Seleccioná quién cerró la caja');
      return;
    }
    if (retiroNum > 0 && !retiroByName) {
      showAlert('Error', 'Seleccioná quién retiró');
      return;
    }

    const centralNote =
      centralBalance != null
        ? `\n\nSaldo central ahora: ${formatCurrency(centralBalance)}.\nSe deposita ${formatCurrency(guardadoNum)}${retiroNum > 0 ? ` y se retira ${formatCurrency(retiroNum)}` : ''}.`
        : '';

    const confirmed = await showConfirm(
      'Registrar día faltante',
      `¿Registrar cierre del ${formatDate(cajaDate)}?${centralNote}`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await registerMissingCajaDay({
        date: cajaDate,
        cajaCambio: cambioNum,
        cajaTotal,
        totalGuardado: guardadoNum,
        closedByName,
        updatedBy: user.uid,
        updatedByName: profile?.name,
        retiroAmount: retiroNum > 0 ? retiroNum : undefined,
        retiroByName: retiroNum > 0 ? retiroByName : undefined,
      });
      showAlert('Listo', 'Cierre registrado', [
        { text: 'OK', onPress: () => router.replace('/caja-list') },
      ]);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Día faltante' }} />
        <Text style={styles.denied}>Solo administradores</Text>
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen options={{ title: 'Día faltante' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Para cierres o retiros hechos a mano (fuera de la app).
        </Text>

        {centralBalance != null && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Caja central ahora: <Text style={styles.infoStrong}>{formatCurrency(centralBalance)}</Text>
            </Text>
          </View>
        )}

        <DatePickerField value={cajaDate} onChange={handleDateChange} />

        <Card style={styles.card}>
          <Input
            label="Caja cambio"
            value={cajaCambio}
            onChangeText={handleCambioChange}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <Input
            label="Caja total"
            value={cajaTotalStr}
            onChangeText={(v) => {
              setTotalManual(true);
              setCajaTotalStr(v);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text style={styles.hint}>
            Sugerido: ventas efectivo ({formatCurrency(cashSales)}) + cambio ={' '}
            {formatCurrency(suggestedTotal)}. Editable si cerraron a mano.
          </Text>

          <Input
            label="Total guardado (a central)"
            value={totalGuardado}
            onChangeText={setTotalGuardado}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <SelectField
            label="Quién cerró"
            value={closedByName}
            options={[...SALE_SELLERS]}
            onChange={setClosedByName}
            placeholder="Seleccioná…"
          />

          <View style={styles.divider} />

          <Input
            label="Retiro de central (opcional)"
            value={retiroAmount}
            onChangeText={setRetiroAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {retiroNum > 0 && (
            <SelectField
              label="Quién retiró"
              value={retiroByName}
              options={[...SALE_SELLERS]}
              onChange={setRetiroByName}
              placeholder="Seleccioná…"
            />
          )}

          <Text style={styles.summary}>
            Ganancia: {formatCurrency(ganancia)} · Dejo en caja: {formatCurrency(cambioCierre)}
            {retiroNum > 0 ? ` · Retiro: ${formatCurrency(retiroNum)}` : ''}
          </Text>
        </Card>

        <Button
          title="Registrar cierre"
          onPress={handleSave}
          loading={saving}
          size="lg"
        />
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
  intro: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.primary + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  infoStrong: {
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },
  card: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
  summary: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  denied: {
    ...typography.body,
    textAlign: 'center',
    margin: spacing.lg,
    color: colors.textSecondary,
  },
});
