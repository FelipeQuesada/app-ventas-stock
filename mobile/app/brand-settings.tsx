import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  DEFAULT_BRAND_ID,
  PLAN_DEFINITIONS,
  STANDARD_PAYMENT_METHODS,
  type PaymentMethod,
} from '@advance-coat/shared';
import { useAuth } from '@/context/AuthContext';
import { useBrand } from '@/context/BrandContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/EmptyState';
import {
  updateBrand,
  ensureBrandInviteCode,
  regenerateBrandInviteCode,
} from '@/services/brands';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

const DEFAULT_PRO_PAYMENTS: PaymentMethod[] = STANDARD_PAYMENT_METHODS.map((pm) => pm.value);

export default function BrandSettingsScreen() {
  const { user } = useAuth();
  const { brand, isBrandAdmin, limits, refreshBrand } = useBrand();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [paymentMethodIds, setPaymentMethodIds] = useState<PaymentMethod[]>(DEFAULT_PRO_PAYMENTS);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setName(brand.name ?? '');
    setWhatsapp(brand.whatsapp ?? brand.phone ?? '');
    setPhone(brand.phone ?? '');
    setInviteCode(brand.inviteCode ?? '');
    const saved = brand.paymentMethodIds?.filter(Boolean) ?? [];
    setPaymentMethodIds(saved.length > 0 ? saved : DEFAULT_PRO_PAYMENTS);
    setTelegramChatId(brand.telegramChatId ?? '');
    setTelegramEnabled(brand.telegramEnabled !== false);
  }, [brand?.id, brand?.name, brand?.whatsapp, brand?.phone, brand?.inviteCode, brand?.paymentMethodIds, brand?.telegramChatId, brand?.telegramEnabled]);

  useEffect(() => {
    if (!brand?.id || brand.inviteCode) return;
    let cancelled = false;
    void ensureBrandInviteCode(brand.id)
      .then(async (code) => {
        if (cancelled) return;
        setInviteCode(code);
        await refreshBrand();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [brand?.id, brand?.inviteCode, refreshBrand]);

  if (!isBrandAdmin) return <Redirect href="/(tabs)/profile" />;
  if (!brand) return <LoadingScreen />;

  const isAdvance = brand.id === DEFAULT_BRAND_ID;
  const plan = PLAN_DEFINITIONS[brand.planId] ?? PLAN_DEFINITIONS.starter;
  const canConfigurePayments = limits.multiPayment && !isAdvance;
  const canConfigureTelegram = limits.telegram;

  const togglePayment = (method: PaymentMethod) => {
    if (method === 'transferencia') return;
    setPaymentMethodIds((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSaveBrand = async () => {
    if (!brand || !name.trim()) {
      showAlert('Error', 'El nombre de la marca es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await updateBrand(brand.id, {
        name: name.trim(),
        whatsapp: whatsapp.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshBrand();
      showAlert('Listo', 'Marca actualizada');
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayments = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      const next = Array.from(new Set<PaymentMethod>(['transferencia', ...paymentMethodIds]));
      await updateBrand(brand.id, { paymentMethodIds: next });
      await refreshBrand();
      showAlert('Listo', 'Medios de pago guardados');
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      const chat = telegramChatId.trim();
      await updateBrand(brand.id, {
        telegramChatId: chat || null,
        telegramEnabled,
      });
      await refreshBrand();
      showAlert(
        'Listo',
        isAdvance
          ? 'Preferencia de Telegram guardada'
          : chat
            ? 'Telegram conectado'
            : 'Guardado sin chat: no se enviarán avisos'
      );
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    showAlert('Copiado', 'Código listo para compartir');
  };

  const handleRegenerateInvite = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      const code = await regenerateBrandInviteCode(brand.id);
      setInviteCode(code);
      await refreshBrand();
      showAlert('Listo', 'Código regenerado');
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'No se pudo regenerar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Ajustes de marca' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>Tu marca</Text>
          <Text style={styles.meta}>
            Plan: {plan.name} · Estado: {brand.status}
          </Text>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input
            label="WhatsApp de la marca"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="11 5771 5316"
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>Se usa al compartir cierres y en presupuestos.</Text>
          <Input
            label="Teléfono (opcional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="Si es distinto al WhatsApp"
            keyboardType="phone-pad"
          />
          <Button title="Guardar marca" onPress={() => void handleSaveBrand()} loading={saving} />
        </Card>

        {canConfigurePayments ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Medios de pago</Text>
            <Text style={styles.hint}>
              Elegí qué métodos aparecen al cobrar. Transferencia siempre queda activo.
            </Text>
            {STANDARD_PAYMENT_METHODS.map((pm) => {
              const locked = pm.value === 'transferencia';
              const checked = paymentMethodIds.includes(pm.value) || locked;
              return (
                <Pressable
                  key={pm.value}
                  style={styles.checkRow}
                  onPress={() => (!locked ? togglePayment(pm.value) : undefined)}
                >
                  <Text style={styles.checkLabel}>
                    {pm.label}
                    {locked ? ' (siempre)' : ''}
                  </Text>
                  <Switch
                    value={checked}
                    disabled={locked || saving}
                    onValueChange={() => togglePayment(pm.value)}
                  />
                </Pressable>
              );
            })}
            <Button
              title="Guardar medios de pago"
              onPress={() => void handleSavePayments()}
              loading={saving}
            />
          </Card>
        ) : null}

        {canConfigureTelegram ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Telegram</Text>
            <Text style={styles.hint}>
              {isAdvance
                ? 'Advance usa el bot global. Acá solo pausás o reactivás avisos.'
                : 'Pegá el chat ID del grupo donde está el bot de Control+.'}
            </Text>
            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Enviar avisos</Text>
              <Switch
                value={telegramEnabled}
                disabled={saving}
                onValueChange={setTelegramEnabled}
              />
            </View>
            {!isAdvance ? (
              <Input
                label="Chat ID del grupo"
                value={telegramChatId}
                onChangeText={setTelegramChatId}
                placeholder="-100…"
              />
            ) : null}
            <Button
              title="Guardar Telegram"
              onPress={() => void handleSaveTelegram()}
              loading={saving}
            />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.title}>Telegram</Text>
            <Text style={styles.hint}>Los avisos al grupo están en Pro y Empresa.</Text>
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.title}>Código para empleados</Text>
          <Text style={styles.hint}>
            Compartilo para que se registren en la app. Después los aprobás en Usuarios.
          </Text>
          <Text style={styles.inviteCode}>{inviteCode || '······'}</Text>
          <View style={styles.row}>
            <Button
              title="Copiar"
              onPress={() => void handleCopyInvite()}
              variant="outline"
              size="sm"
              disabled={!inviteCode || saving}
              style={{ flex: 1 }}
            />
            <Button
              title="Regenerar"
              onPress={() => void handleRegenerateInvite()}
              variant="outline"
              size="sm"
              disabled={saving || !user}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { gap: spacing.sm },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  meta: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  checkLabel: { ...typography.body, color: colors.text, flex: 1, paddingRight: 8 },
  inviteCode: {
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    backgroundColor: '#eef2f7',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
});
