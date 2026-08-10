import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/constants/theme';

export function HeaderCajaButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.push('/caja')}
      activeOpacity={0.7}
      accessibilityLabel="Ir a Caja"
    >
      <MaterialIcons name="point-of-sale" size={20} color={colors.primary} />
      <Text style={styles.label}>Caja</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
  },
  label: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
});
