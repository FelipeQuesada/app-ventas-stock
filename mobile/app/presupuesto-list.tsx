import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Presupuesto } from '@advance-coat/shared';
import { formatCurrency } from '@advance-coat/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import { deletePresupuesto, getPresupuestos } from '@/services/presupuestos';
import {
  buildPresupuestoHtmlAsync,
  buildPresupuestoDocumentTitle,
  presupuestoToPdfData,
} from '@/services/presupuesto';
import { formatDate } from '@/utils/format';
import { showAlert, showConfirm } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function PresupuestoListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getPresupuestos());
    } catch {
      showAlert('Error', 'No se pudieron cargar los presupuestos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const totalSum = useMemo(
    () => items.reduce((sum, p) => sum + (p.total || 0), 0),
    [items]
  );

  const openPdf = async (p: Presupuesto) => {
    try {
      const html = await buildPresupuestoHtmlAsync(presupuestoToPdfData(p));
      setPdfPreview({
        html,
        title: buildPresupuestoDocumentTitle(p.customer.name),
      });
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo armar el PDF');
    }
  };

  const handleDelete = async (p: Presupuesto) => {
    const ok = await showConfirm(
      'Eliminar',
      `¿Eliminar el presupuesto de ${p.customer.name || 'cliente'}?`
    );
    if (!ok) return;
    try {
      await deletePresupuesto(p.id);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      showAlert('Error', 'No se pudo eliminar');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Historial presupuestos' }} />

      <View style={styles.header}>
        <Text style={styles.summary}>
          {items.length} presupuesto(s) · {formatCurrency(totalSum)}
        </Text>
        <Button
          title="Nuevo"
          size="sm"
          onPress={() => router.push('/presupuesto')}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="description"
            title="Sin presupuestos"
            subtitle="Creá el primero desde Nuevo"
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Pressable onPress={() => void openPdf(item)}>
              <Text style={styles.name}>{item.customer.name || 'Sin nombre'}</Text>
              <Text style={styles.meta}>
                {formatDate(item.date)} · Válido hasta {formatDate(item.validUntil)}
              </Text>
              <Text style={styles.total}>{formatCurrency(item.total)}</Text>
              {item.contactName ? (
                <Text style={styles.meta}>Contacto: {item.contactName}</Text>
              ) : null}
            </Pressable>
            <View style={styles.actions}>
              <Button
                title="PDF"
                size="sm"
                variant="outline"
                onPress={() => void openPdf(item)}
              />
              <Button
                title="Editar"
                size="sm"
                variant="secondary"
                onPress={() => router.push(`/presupuesto?edit=${item.id}`)}
              />
              <TouchableOpacity onPress={() => void handleDelete(item)} style={styles.deleteBtn}>
                <MaterialIcons name="delete" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/presupuesto')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <PdfPreviewModal
        visible={!!pdfPreview}
        html={pdfPreview?.html ?? null}
        title={pdfPreview?.title}
        onClose={() => setPdfPreview(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summary: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    flex: 1,
  },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.sm },
  name: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  total: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteBtn: { padding: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
