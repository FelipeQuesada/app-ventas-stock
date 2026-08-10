import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import { getCustomer, updateCustomer } from '@/services/customers';
import { fetchCustomerPurchaseStats } from '@/services/sales';
import { Customer, Sale } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [topProduct, setTopProduct] = useState<{ name: string; quantity: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCustomer(id);
      if (!data) {
        showAlert('Error', 'No se encontró el cliente');
        router.back();
        return;
      }
      setCustomer(data);
      setForm({ name: data.name, email: data.email, phone: data.phone });
      if (data.phone) {
        const stats = await fetchCustomerPurchaseStats(data.phone);
        setSales(stats.sales);
        setTotalSpent(stats.totalSpent);
        setTopProduct(stats.topProduct);
      } else {
        setSales([]);
        setTotalSpent(0);
        setTopProduct(null);
      }
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      await updateCustomer(customer.id, form);
      setEditVisible(false);
      await load();
      showAlert('Guardado', 'Datos del cliente actualizados');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar';
      showAlert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!customer) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card>
              <Text style={styles.name}>{customer.name || 'Sin nombre'}</Text>
              <Text style={styles.meta}>{customer.phone || 'Sin teléfono'}</Text>
              {!!customer.email && <Text style={styles.meta}>{customer.email}</Text>}
              <Button
                title="Editar datos"
                variant="outline"
                size="sm"
                onPress={() => setEditVisible(true)}
                style={styles.editBtn}
              />
            </Card>

            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Compras</Text>
                <Text style={styles.statValue}>{sales.length}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total gastado</Text>
                <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
              </Card>
            </View>

            <Card>
              <Text style={styles.statLabel}>Producto más comprado</Text>
              <Text style={styles.topProduct}>
                {topProduct
                  ? `${topProduct.name} (${topProduct.quantity} u.)`
                  : 'Sin compras aún'}
              </Text>
            </Card>

            <Text style={styles.historyTitle}>Historial de ventas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.saleCard}>
            <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
            <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
            <Text style={styles.saleItems} numberOfLines={2}>
              {item.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}
            </Text>
            {!!item.createdByName && (
              <Text style={styles.saleSeller}>Vendedor: {item.createdByName}</Text>
            )}
            <Button
              title="Ver / editar venta"
              variant="outline"
              size="sm"
              onPress={() => router.push(`/sale/${item.id}` as Href)}
              style={styles.saleBtn}
            />
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-long"
            title="Sin compras"
            subtitle="Cuando compre, las ventas aparecen acá"
          />
        }
      />

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Input
              label="Nombre"
              value={form.name}
              onChangeText={(name) => setForm((c) => ({ ...c, name }))}
              autoCapitalize="words"
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChangeText={(phone) => setForm((c) => ({ ...c, phone }))}
              keyboardType="phone-pad"
            />
            <Input
              label="Email"
              value={form.email}
              onChangeText={(email) => setForm((c) => ({ ...c, email }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" onPress={() => setEditVisible(false)} style={styles.actionButton} />
              <Button title="Guardar" onPress={handleSave} loading={saving} style={styles.actionButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  meta: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 4,
  },
  topProduct: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 4,
  },
  historyTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  saleCard: {
    marginBottom: spacing.sm,
  },
  saleDate: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  saleTotal: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 2,
  },
  saleItems: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  saleSeller: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  saleBtn: {
    marginTop: spacing.sm,
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
    padding: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
