import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Button } from '@/components/ui/Button';
import { deleteAllProducts } from '@/services/products';
import {
  EXCEL_MIME_TYPES,
  importProducts,
  parseProductsWorkbook,
  readWorkbookFromFile,
  readWorkbookFromUri,
} from '@/services/importProducts';
import { showAlert, showConfirm } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface ImportProductsModalProps {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

async function processWorkbook(
  workbook: Awaited<ReturnType<typeof readWorkbookFromFile>>,
  onImported: () => void
) {
  const { rows, errors: parseErrors } = parseProductsWorkbook(workbook);
  const result = await importProducts(rows);
  const allErrors = [...parseErrors, ...result.errors];

  onImported();

  const lines = [`Se importaron ${result.created} producto(s).`];
  if (allErrors.length > 0) {
    const preview = allErrors
      .slice(0, 5)
      .map((error) => `Fila ${error.row}: ${error.message}`)
      .join('\n');
    lines.push(`\n${allErrors.length} fila(s) con problemas:\n${preview}`);
    if (allErrors.length > 5) {
      lines.push(`\n... y ${allErrors.length - 5} más`);
    }
  }

  showAlert(
    result.created > 0 ? 'Importación completada' : 'Importación con errores',
    lines.join('')
  );
}

export function ImportProductsModal({
  visible,
  onClose,
  onImported,
}: ImportProductsModalProps) {
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busy = importing || deleting;

  const handleDeleteAll = useCallback(async () => {
    const confirmed = await showConfirm(
      'Eliminar todos los productos',
      'Se van a borrar todos los productos de la base. Esta acción no se puede deshacer.',
      'Eliminar todo'
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const count = await deleteAllProducts();
      onImported();
      showAlert('Listo', `Se eliminaron ${count} producto(s).`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron eliminar los productos';
      showAlert('Error', message);
    } finally {
      setDeleting(false);
    }
  }, [onImported]);

  const handleImport = useCallback(
    async (loadWorkbook: () => Promise<Awaited<ReturnType<typeof readWorkbookFromFile>>>) => {
      setImporting(true);
      try {
        const workbook = await loadWorkbook();
        await processWorkbook(workbook, onImported);
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo importar el archivo';
        showAlert('Error', message);
      } finally {
        setImporting(false);
        setDragging(false);
      }
    },
    [onClose, onImported]
  );

  const pickWithDocumentPicker = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: EXCEL_MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    await handleImport(() =>
      readWorkbookFromUri(result.assets[0].uri, result.assets[0].name)
    );
  }, [handleImport]);

  const pickWithWebInput = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      await pickWithDocumentPicker();
      return;
    }

    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

    if (!file) return;
    await handleImport(() => readWorkbookFromFile(file));
  }, [handleImport, pickWithDocumentPicker]);

  const handleWebDrop = useCallback(
    async (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragging(false);

      if (busy) return;

      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
        showAlert('Archivo no válido', 'Subí un archivo Excel (.xlsx, .xls) o CSV.');
        return;
      }

      await handleImport(() => readWorkbookFromFile(file));
    },
    [handleImport, busy]
  );

  const dropZoneProps =
    Platform.OS === 'web'
      ? ({
          onDragOver: (event: DragEvent) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop: handleWebDrop,
        } as object)
      : {};

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={busy ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />

        <View style={styles.modal}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Importar productos</Text>
              <Pressable onPress={onClose} disabled={busy} hitSlop={12}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.description}>
              Subí un Excel o CSV de Tienda Nube con tus productos. También aceptamos columnas:
              nombre, categoria, precio y stock.
            </Text>

            <View
              style={[styles.dropZone, dragging && styles.dropZoneActive]}
              {...dropZoneProps}
            >
              {busy ? (
                <>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.dropTitle}>
                    {deleting ? 'Eliminando productos...' : 'Importando productos...'}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="upload-file"
                    size={40}
                    color={dragging ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.dropTitle}>
                    {Platform.OS === 'web'
                      ? 'Arrastrá tu Excel acá'
                      : 'Seleccioná un archivo Excel'}
                  </Text>
                  <Text style={styles.dropHint}>.xlsx, .xls o .csv</Text>
                  <Button
                    title="Seleccionar archivo"
                    variant="outline"
                    onPress={pickWithWebInput}
                    style={styles.pickButton}
                  />
                </>
              )}
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Ejemplo de columnas</Text>
              <Text style={styles.exampleText}>nombre | categoria | precio | stock</Text>
            </View>

            <Button
              title="Eliminar todos los productos"
              variant="danger"
              onPress={handleDeleteAll}
              disabled={busy}
              loading={deleting}
              style={styles.deleteButton}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '90%',
    zIndex: 1,
  },
  modalContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  description: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  dropZoneActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF0F8',
  },
  dropTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    textAlign: 'center',
  },
  dropHint: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  pickButton: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  exampleBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  exampleTitle: {
    ...typography.label,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exampleText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
});
