import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useBrand } from '@/context/BrandContext';
import { colors, spacing, typography } from '@/constants/theme';

type HeaderTitleProps = {
  children?: React.ReactNode;
};

export function HeaderTitle({ children }: HeaderTitleProps) {
  const { brand } = useBrand();
  const logoUrl = brand?.logoUrl?.trim();

  return (
    <View style={styles.container}>
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={brand?.name ? `Logo ${brand.name}` : 'Logo de la marca'}
        />
      ) : (
        <View style={styles.mark} accessibilityLabel="Control+">
          <Text style={styles.markPlus}>+</Text>
        </View>
      )}
      {children ? (
        <Text style={styles.title} numberOfLines={1}>
          {children}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPlus: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    lineHeight: 22,
    marginTop: -1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    ...typography.h3,
    color: colors.primary,
    flexShrink: 1,
  },
});
