import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

export function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const isLarge = size === 'lg';
  const logoSize = isLarge ? 56 : 40;

  return (
    <View style={[styles.container, isLarge && styles.containerLg]}>
      <Image
        source={require('../assets/images/logo-advance.png')}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
        accessibilityLabel="Advance Coat"
      />
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
