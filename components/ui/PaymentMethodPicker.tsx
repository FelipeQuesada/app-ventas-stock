import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PAYMENT_METHODS } from '@/constants/payments';
import { PaymentMethod } from '@/types';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface PaymentMethodPickerProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Forma de pago</Text>
      <View style={styles.grid}>
        {PAYMENT_METHODS.map((pm) => {
          const selected = value === pm.value;
          return (
            <TouchableOpacity
              key={pm.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(pm.value)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={pm.icon as keyof typeof MaterialIcons.glyphMap}
                size={22}
                color={selected ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.white,
  },
});
