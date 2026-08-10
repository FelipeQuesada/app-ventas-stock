import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { StockBadge } from './StockBadge';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface ProductListItemProps {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
  showAddButton?: boolean;
}

export function ProductListItem({
  product,
  onPress,
  onAdd,
  showAddButton = false,
}: ProductListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <MaterialIcons name="inventory-2" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.category}>{product.category}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          <StockBadge stock={product.stock} showLabel />
        </View>
      </View>
      {showAddButton && onAdd && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <MaterialIcons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
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
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  category: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  price: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.accent,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
