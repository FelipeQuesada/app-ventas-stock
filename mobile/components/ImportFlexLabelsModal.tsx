import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import {
  FLEX_ALL_LOCALITIES,
  FLEX_ZONE_LABELS,
  buildFlexImportRows,
  type FlexLabelsParseResult,
  type FlexZoneId,
} from '@advance-coat/shared';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { parseFlexLabelsPdfUri } from '@/services/importFlexLabels';
import { addFlexShipmentsBatch } from '@/services/flex';
import { showAlert, showConfirm } from '@/utils/alert';
import { formatCurrency } from '@/utils/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface ImportFlexLabelsModalProps {
  visible: boolean;
  onClose: () => void;
  onImported: (info: { rows: number; packages: number; firstDate: Date | null }) => void;
  referenceYear: number;
  createdBy: string;
  createdByName?: string;
}

export function ImportFlexLabelsModal({
  visible,
  onClose,
  onImported,
  referenceYear,
  createdBy,
  createdByName,
}: ImportFlexLabelsModalProps) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<FlexLabelsParseResult | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const { matched, unmatched } = useMemo(() => {
    if (!parsed) return { matched: [], unmatched: [] };
    return buildFlexImportRows(parsed.labels, overrides);
  }, [parsed, overrides]);

  const totalPackages = matched.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = matched.reduce((sum, row) => sum + row.total, 0);
  const busy = parsing || saving;

  function reset() {
    setParsed(null);
    setOverrides({});
    setFileName('');
    setParsing(false);
    setSaving(false);
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setParsing(true);
    setFileName(asset.name || 'etiquetas.pdf');
    try {
      const parsedResult = await parseFlexLabelsPdfUri(asset.uri, { referenceYear });
      setParsed(parsedResult);
      setOverrides({});
    } catch (err) {
      setParsed(null);
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo leer el PDF');
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (matched.length === 0) {
      showAlert('Sin datos', 'No hay etiquetas reconocidas para importar.');
      return;
    }
    if (unmatched.length > 0) {
      const ok = await showConfirm(
        'Etiquetas sin reconocer',
        `Hay ${unmatched.length} etiqueta(s) sin reconocer. ¿Importar las ${totalPackages} reconocidas?`,
        'Importar'
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await addFlexShipmentsBatch(
        matched.map((row) => ({
          date: row.date,
          zone: row.zone as FlexZoneId,
          locality: row.locality,
          quantity: row.quantity,
        })),
        { createdBy, createdByName }
      );
      const firstDate = matched[0]?.date ?? null;
      const packages = totalPackages;
      const rows = matched.length;
      reset();
      onImported({ rows, packages, firstDate });
      onClose();
      showAlert('Listo', `Se importaron ${packages} paquete(s) en ${rows} grupo(s).`);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Importar etiquetas ML</Text>
            <Pressable onPress={handleClose} disabled={busy} hitSlop={8}>
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>PDF de etiquetas Flex de Mercado Libre</Text>

          {!parsed ? (
            <View style={styles.drop}>
              {parsing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Button title="Elegir PDF" onPress={() => void pickPdf()} />
              )}
              <Text style={styles.hint}>{parsing ? 'Leyendo etiquetas…' : 'Una página = un paquete'}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.meta}>
                {fileName} · {parsed.totalLabels} etiq. · {totalPackages} paq. · {formatCurrency(totalAmount)}
              </Text>
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {matched.map((row) => (
                  <View key={row.key} style={[styles.row, styles.rowOk]}>
                    <Text style={styles.rowTitle}>
                      {format(row.date, 'dd/MM/yyyy')} · {row.locality}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {FLEX_ZONE_LABELS[row.zone]} · ×{row.quantity} · {formatCurrency(row.total)}
                    </Text>
                  </View>
                ))}
                {unmatched.map((label) => (
                  <View key={`u-${label.pageIndex}`} style={[styles.row, styles.rowWarn]}>
                    <Text style={styles.rowTitle}>
                      Etiqueta {label.labelIndex + 1} · pág. {label.sourcePage}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {label.rawLocality || 'Sin localidad'}
                      {!label.date ? ' · sin fecha' : ''}
                    </Text>
                    {label.date ? (
                      <SelectField
                        label="Asignar lugar"
                        value={overrides[label.pageIndex] || 'Asignar lugar…'}
                        onChange={(value) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [label.pageIndex]: value === 'Asignar lugar…' ? '' : value,
                          }))
                        }
                        options={['Asignar lugar…', ...FLEX_ALL_LOCALITIES]}
                      />
                    ) : null}
                  </View>
                ))}
              </ScrollView>
              <View style={styles.actions}>
                <Button title="Otro archivo" variant="outline" onPress={reset} disabled={busy} />
                <Button
                  title={saving ? 'Guardando…' : `Importar ${totalPackages || ''}`}
                  onPress={() => void handleConfirm()}
                  disabled={busy || matched.length === 0}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.h3, fontFamily: 'Inter_600SemiBold', color: colors.text },
  close: { ...typography.body, color: colors.primary, fontFamily: 'Inter_500Medium' },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  drop: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  hint: { ...typography.caption, color: colors.textMuted },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  list: { maxHeight: 360 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: {
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
  },
  rowOk: {
    borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  rowWarn: {
    borderColor: 'rgba(245,158,11,0.4)',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  rowTitle: { ...typography.body, fontFamily: 'Inter_600SemiBold', color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
