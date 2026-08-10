import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Button } from '@/components/ui/Button';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import {
  SaleTicketData,
  shareSaleTicket,
  shareSaleTicketWhatsApp,
  exportSaleTicketFile,
  buildSaleTicketHtml,
  normalizeWhatsAppPhone,
} from '@/utils/saleTicket';
import { formatCurrency, formatDate } from '@/utils/format';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Props = {
  visible: boolean;
  sale: SaleTicketData | null;
  onClose: () => void;
  title?: string;
};

export function SaleTicketModal({ visible, sale, onClose, title = 'Venta registrada' }: Props) {
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);

  if (!sale) return null;

  const hasPhone = !!normalizeWhatsAppPhone(sale.customer?.phone);

  const handleShare = async () => {
    try {
      await shareSaleTicket(sale);
    } catch {
      showAlert('Error', 'No se pudo compartir el ticket');
    }
  };

  const handleWhatsApp = async () => {
    try {
      if (!hasPhone) {
        showAlert(
          'Sin teléfono',
          'Esta venta no tiene teléfono de cliente. Se abrirá WhatsApp sin destinatario.'
        );
      }
      await shareSaleTicketWhatsApp(sale);
    } catch {
      showAlert('Error', 'No se pudo abrir WhatsApp');
    }
  };

  const handleExport = async () => {
    try {
      await exportSaleTicketFile(sale);
    } catch {
      showAlert('Error', 'No se pudo exportar el ticket');
    }
  };

  const handlePdf = () => {
    setPdfPreview({
      html: buildSaleTicketHtml(sale),
      title: 'Presupuesto',
    });
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.brand}>Advance Coat</Text>
            <Text style={styles.meta}>{formatDate(sale.date)}</Text>
            {sale.customer?.name ? (
              <Text style={styles.meta}>Cliente: {sale.customer.name}</Text>
            ) : null}
            {sale.customer?.phone ? (
              <Text style={styles.meta}>Tel: {sale.customer.phone}</Text>
            ) : null}

            <View style={styles.divider} />

            {sale.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(sale.subtotal)}</Text>
            </View>
            {(sale.discountAmount ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento</Text>
                <Text style={[styles.summaryValue, styles.discount]}>
                  -{formatCurrency(sale.discountAmount ?? 0)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(sale.total)}</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button title="WhatsApp" onPress={handleWhatsApp} size="sm" style={styles.actionBtn} />
            <Button
              title="PDF"
              onPress={handlePdf}
              variant="secondary"
              size="sm"
              style={styles.actionBtn}
            />
          </View>
          <View style={styles.actions}>
            <Button
              title="Compartir"
              onPress={handleShare}
              variant="outline"
              size="sm"
              style={styles.actionBtn}
            />
            <Button
              title="Archivo"
              onPress={handleExport}
              variant="outline"
              size="sm"
              style={styles.actionBtn}
            />
          </View>
          <Button title="Listo" onPress={onClose} style={styles.doneBtn} />
        </Pressable>
      </Pressable>
    </Modal>

    <PdfPreviewModal
      visible={!!pdfPreview}
      html={pdfPreview?.html ?? null}
      title={pdfPreview?.title}
      onClose={() => setPdfPreview(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '90%',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  content: {
    maxHeight: 360,
  },
  brand: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    textAlign: 'center',
  },
  meta: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemInfo: { flex: 1 },
  itemName: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  itemMeta: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  itemTotal: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  discount: { color: colors.success },
  totalLabel: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  totalValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionBtn: { flex: 1 },
  doneBtn: { marginTop: spacing.sm },
});
