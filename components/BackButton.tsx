import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/constants/theme';

interface BackButtonProps {
  label?: string;
}

export function BackButton({ label = 'Volver' }: BackButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.back()}
      activeOpacity={0.7}
      accessibilityLabel={label}
    >
      <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
});
