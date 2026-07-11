import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

export function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const isLarge = size === 'lg';
  return (
    <View style={[styles.container, isLarge && styles.containerLg]}>
      <Text style={[styles.logoText, isLarge && styles.logoTextLg]}>AC</Text>
      <View>
        <Text style={[styles.brand, isLarge && styles.brandLg]}>Advance Coat</Text>
        {isLarge && <Text style={styles.tagline}>Showroom Sales</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  containerLg: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  logoText: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 40,
    overflow: 'hidden',
  },
  logoTextLg: {
    width: 56,
    height: 56,
    fontSize: 22,
    lineHeight: 56,
    borderRadius: 14,
  },
  brand: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },
  brandLg: {
    ...typography.h1,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
});
