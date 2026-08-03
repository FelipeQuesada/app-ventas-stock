import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

type HeaderTitleProps = {
  children?: React.ReactNode;
};

export function HeaderTitle({ children }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo-advance.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Advance Coat"
      />
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
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    ...typography.h3,
    color: colors.primary,
    flexShrink: 1,
  },
});
