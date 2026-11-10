import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

export function Logo({
  size = 'lg',
  tagline = 'Ventas & stock para tu negocio',
  light = false,
}: {
  size?: 'sm' | 'lg';
  tagline?: string | null;
  light?: boolean;
}) {
  const isLarge = size === 'lg';

  return (
    <View style={[styles.container, isLarge && styles.containerLg]}>
      <Text style={[styles.brand, isLarge && styles.brandLg, light && styles.brandLight]}>
        Control<Text style={styles.plus}>+</Text>
      </Text>
      {isLarge && tagline ? (
        <Text style={[styles.tagline, light && styles.taglineLight]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  containerLg: {
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.h3,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandLg: {
    ...typography.h1,
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
  },
  brandLight: {
    color: colors.white,
  },
  plus: {
    color: colors.accent,
  },
  tagline: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  taglineLight: {
    color: 'rgba(232,236,247,0.75)',
  },
});
