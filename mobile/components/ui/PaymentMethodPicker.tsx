import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PAYMENT_METHODS } from '@/constants/payments';
import { PaymentMethod } from '@/types';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

export type PaymentMode = 'single' | 'dual';

interface PaymentMethodPickerProps {
  mode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  selected: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
  splitAmounts?: Partial<Record<PaymentMethod, string>>;
  onSplitAmountChange?: (method: PaymentMethod, amount: string) => void;
  total?: number;
  amountPaid?: string;
  onAmountPaidChange?: (value: string) => void;
  cashChange?: number;
  cashDue?: number;
}

export function PaymentMethodPicker({
  mode,
  onModeChange,
  selected,
  onChange,
  splitAmounts,
  onSplitAmountChange,
  total = 0,
  amountPaid = '',
  onAmountPaidChange,
  cashChange = 0,
  cashDue = 0,
}: PaymentMethodPickerProps) {
  const splitTotal =
    mode === 'dual'
      ? selected.reduce((sum, method) => {
          const raw = splitAmounts?.[method]?.replace(',', '.') ?? '';
          return sum + (parseFloat(raw) || 0);
        }, 0)
      : 0;
  const splitRemaining = total - splitTotal;

  function toggleMethod(method: PaymentMethod) {
    if (mode === 'single') {
      onChange([method]);
      return;
    }

    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
      return;
    }

    if (selected.length >= 2) return;
    onChange([...selected, method]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Forma de pago</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeChip, mode === 'single' && styles.modeChipActive]}
          onPress={() => onModeChange('single')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeChipText, mode === 'single' && styles.modeChipTextActive]}>
            Un método
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeChip, mode === 'dual' && styles.modeChipActive]}
          onPress={() => onModeChange('dual')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeChipText, mode === 'dual' && styles.modeChipTextActive]}>
            Dos métodos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {PAYMENT_METHODS.map((pm) => {
          const isSelected = selected.includes(pm.value);
          const disabled =
            mode === 'dual' && !isSelected && selected.length >= 2;
          return (
            <TouchableOpacity
              key={pm.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => toggleMethod(pm.value)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <MaterialIcons
                name={pm.icon as keyof typeof MaterialIcons.glyphMap}
                size={22}
                color={isSelected ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'dual' ? (
        <Text style={styles.hint}>
          Elegí dos métodos distintos e ingresá cuánto se cobró con cada uno.
        </Text>
      ) : null}

      {mode === 'dual' && selected.length === 2
        ? selected.map((method) => {
            const label = PAYMENT_METHODS.find((pm) => pm.value === method)?.label ?? method;
            if (method === 'efectivo') {
              return (
                <View key={method} style={styles.efectivoSplit}>
                  <Input
                    label="Monto en efectivo"
                    value={splitAmounts?.[method] ?? ''}
                    onChangeText={(value) => onSplitAmountChange?.(method, value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                  <View style={styles.cashRow}>
                    <View style={styles.cashInput}>
                      <Input
                        label="Paga con"
                        value={amountPaid}
                        onChangeText={onAmountPaidChange}
                        keyboardType="decimal-pad"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>Vuelto</Text>
                      <Text
                        style={[
                          styles.changeValue,
                          cashChange > 0 && styles.changeValuePositive,
                        ]}
                      >
                        {cashDue > 0 ? formatCurrency(cashChange) : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }
            return (
              <Input
                key={method}
                label={`Monto con ${label}`}
                value={splitAmounts?.[method] ?? ''}
                onChangeText={(value) => onSplitAmountChange?.(method, value)}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            );
          })
        : null}

      {mode === 'dual' && selected.length === 2 ? (
        <Text
          style={[
            styles.splitSummary,
            Math.abs(splitRemaining) > 0.01 ? styles.splitSummaryWarn : styles.splitSummaryOk,
          ]}
        >
          {Math.abs(splitRemaining) <= 0.01
            ? `Total cubierto: ${formatCurrency(total)}`
            : `Falta ${formatCurrency(Math.max(0, splitRemaining))} · Sobra ${formatCurrency(Math.max(0, -splitRemaining))}`}
        </Text>
      ) : null}
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  modeChipText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  modeChipTextActive: {
    color: colors.primary,
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
  optionDisabled: {
    opacity: 0.45,
  },
  optionText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.white,
  },
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  splitSummary: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    marginTop: spacing.xs,
  },
  splitSummaryOk: {
    color: colors.success,
  },
  splitSummaryWarn: {
    color: colors.danger,
  },
  efectivoSplit: {
    marginBottom: spacing.xs,
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  cashInput: {
    flex: 1,
  },
  changeBox: {
    minWidth: 108,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  changeLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.white,
    opacity: 0.85,
  },
  changeValue: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
  changeValuePositive: {
    color: '#bbf7d0',
  },
});
