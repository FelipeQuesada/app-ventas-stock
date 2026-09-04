import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Sale } from '@/types';
import { formatCurrency, formatShortDateTime, getSaleDisplayDate } from '@/utils/format';
import { getSalePaymentLabel } from '@/constants/payments';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface SaleListItemProps {
  sale: Sale;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SaleListItem({ sale, onPress, onEdit, onDelete }: SaleListItemProps) {
  const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const customerLabel =
    sale.customer?.name || sale.customer?.email || sale.customer?.phone || 'Sin cliente';
  const displayDate = getSaleDisplayDate(sale);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatShortDateTime(displayDate)}</Text>
          <Text style={styles.total}>{formatCurrency(sale.total)}</Text>
        </View>
        <Text style={styles.customer} numberOfLines={1}>
          {customerLabel}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
          </Text>
          <Text style={styles.meta}>
            {getSalePaymentLabel(sale)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onEdit();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onDelete();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  total: {
    ...typography.label,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  customer: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  meta: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
