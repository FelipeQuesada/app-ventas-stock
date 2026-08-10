import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CategoryFilter } from '@/components/ui/CategoryFilter';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface ProductFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  showOutOfStock: boolean;
  showLowStock: boolean;
  onToggleOutOfStock?: () => void;
  onToggleLowStock?: () => void;
  showOutOfStockFilter?: boolean;
  showLowStockFilter?: boolean;
}

function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ProductFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  showOutOfStock,
  showLowStock,
  onToggleOutOfStock,
  onToggleLowStock,
  showOutOfStockFilter = true,
  showLowStockFilter = true,
}: ProductFiltersProps) {
  const hasStockFilters =
    (showOutOfStockFilter && onToggleOutOfStock) || (showLowStockFilter && onToggleLowStock);

  return (
    <View style={styles.container}>
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={onSelectCategory}
        />
      )}

      {hasStockFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stockFilters}
        >
          {showOutOfStockFilter && onToggleOutOfStock && (
            <ToggleChip
              label="Sin stock"
              active={showOutOfStock}
              onPress={onToggleOutOfStock}
            />
          )}
          {showLowStockFilter && onToggleLowStock && (
            <ToggleChip
              label="Poco stock"
              active={showLowStock}
              onPress={onToggleLowStock}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  stockFilters: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
});
