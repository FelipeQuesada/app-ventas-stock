import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SaleItem } from '@/types';
import { isExtraItem } from '@/utils/sale';
import { formatCurrency } from '@/utils/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface SaleItemRowProps {
  item: SaleItem;
  onQuantityChange: (quantity: number) => void;
  onSubtotalChange: (subtotal: number) => void;
  onRemove: () => void;
}

export function SaleItemRow({
  item,
  onQuantityChange,
  onSubtotalChange,
  onRemove,
}: SaleItemRowProps) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceText, setPriceText] = useState(item.subtotal.toString());

  const commitPrice = () => {
    const value = parseFloat(priceText.replace(',', '.'));
    if (!isNaN(value) && value >= 0) {
      onSubtotalChange(value);
    } else {
      setPriceText(item.subtotal.toString());
    }
    setEditingPrice(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.productName}</Text>
          {isExtraItem(item) && (
            <View style={styles.extraBadge}>
              <Text style={styles.extraBadgeText}>Extra</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Cantidad</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => onQuantityChange(Math.max(1, item.quantity - 1))}
          >
            <MaterialIcons name="remove" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => onQuantityChange(item.quantity + 1)}
          >
            <MaterialIcons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Precio final</Text>
        {editingPrice ? (
          <TextInput
            style={styles.priceInput}
            value={priceText}
            onChangeText={setPriceText}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={commitPrice}
            onSubmitEditing={commitPrice}
          />
        ) : (
          <TouchableOpacity
            style={styles.priceTouchable}
            onPress={() => {
              setPriceText(item.subtotal.toString());
              setEditingPrice(true);
            }}
          >
            <Text style={styles.priceValue}>{formatCurrency(item.subtotal)}</Text>
            <MaterialIcons name="edit" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.unitHint}>
        {formatCurrency(item.unitPrice)} c/u · {item.quantity} un.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  extraBadge: {
    backgroundColor: colors.accent + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  extraBadgeText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    minWidth: 28,
    textAlign: 'center',
  },
  priceTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  priceInput: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 120,
    textAlign: 'right',
  },
  unitHint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
});
