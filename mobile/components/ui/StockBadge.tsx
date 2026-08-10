import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getStockColor, getStockLevel } from '@/utils/stock';

interface StockBadgeProps {
  stock: number;
  showLabel?: boolean;
}

export function StockBadge({ stock, showLabel = false }: StockBadgeProps) {
  const level = getStockLevel(stock);
  const color = getStockColor(level);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      {showLabel && (
        <Text style={[styles.label, { color }]}>
          {stock} u.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
  },
});
